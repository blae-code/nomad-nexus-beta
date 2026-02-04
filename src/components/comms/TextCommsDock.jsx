/**
 * TextCommsDock — The sole implementation of text comms in the app.
 * Provides channel browsing, message display, and composition.
 * Legacy comms footer code has been fully replaced by this component.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Minimize2, Hash, Lock, Send, AlertCircle, Search, Bell, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminUser } from '@/utils';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';
import { useTypingIndicator } from '@/components/hooks/useTypingIndicator';
import TypingIndicator from '@/components/comms/TypingIndicator';
import { useLastSeen } from '@/components/hooks/useLastSeen';
import MessageItem from '@/components/comms/MessageItem';
import MessageComposer from '@/components/comms/MessageComposer';
import ThreadPanel from '@/components/comms/ThreadPanel';
import PinnedMessages from '@/components/comms/PinnedMessages';
import DMChannelList from '@/components/comms/DMChannelList';
import UserPickerModal from '@/components/comms/UserPickerModal';
import GlobalMessageSearch from '@/components/comms/GlobalMessageSearch';
import MentionsView from '@/components/comms/MentionsView';
import ChannelNotificationSettings from '@/components/comms/ChannelNotificationSettings';
import ModerationPanel from '@/components/comms/ModerationPanel';
import AIModerationIndicator from '@/components/comms/AIModerationIndicator';

export default function TextCommsDock({ isOpen, isMinimized, onMinimize }) {
  const [activeTab, setActiveTab] = useState('comms');
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [threadPanelMessage, setThreadPanelMessage] = useState(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [userPickerMode, setUserPickerMode] = useState('dm');
  const [viewMode, setViewMode] = useState('channels'); // 'channels' or 'dms'
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [riggsyPrompt, setRiggsyPrompt] = useState('');
  const [riggsyResponse, setRiggsyResponse] = useState('');
  const [riggsyLoading, setRiggsyLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const isAdmin = isAdminUser(authUser);
  const { unreadByChannel, unreadByTab, refreshUnreadCounts, markChannelRead } = useUnreadCounts(user?.id);
  const activeOp = useActiveOp();
  const { typingUsers, signalTyping, clearTyping } = useTypingIndicator(selectedChannelId, user?.id);
  const messageUserIds = [...new Set(messages.map(m => m.user_id))];
  const { lastSeenMap } = useLastSeen(messageUserIds);
  const fallbackMemberMap = React.useMemo(() => {
    if (!user?.id) return {};
    const label = user.callsign || user.full_name || user.email || 'System Admin';
    return { [user.id]: { label } };
  }, [user?.id, user?.callsign, user?.full_name, user?.email]);
  const { memberMap } = useMemberProfileMap(messageUserIds, { fallbackMap: fallbackMemberMap });

  // Load channels
  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channelList = await base44.entities.Channel.list();
        setChannels(channelList);

        // Auto-select bound channel if active op has one
        if (activeOp?.binding?.commsChannelId) {
          setSelectedChannelId(activeOp.binding.commsChannelId);
        } else if (!selectedChannelId && channelList.length > 0) {
          setSelectedChannelId(channelList[0].id);
        }
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    };

    loadChannels();
  }, [activeOp?.binding?.commsChannelId, selectedChannelId]);

  // Load messages for selected channel + real-time subscription
  useEffect(() => {
    if (!selectedChannelId) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await base44.entities.Message.filter({ channel_id: selectedChannelId });
        setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
        // Mark as read (debounced)
        setTimeout(() => markChannelRead(selectedChannelId), 500);
      } catch (error) {
        console.error('Failed to load messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();

    // Subscribe to real-time message updates
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.channel_id === selectedChannelId) {
        setMessages((prev) => [...prev, event.data]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [selectedChannelId, markChannelRead]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !selectedChannelId || !user?.id) return;

    try {
      const newMsg = await base44.entities.Message.create({
        channel_id: selectedChannelId,
        user_id: user.id,
        content: messageInput,
      });

      // Update channel's last_message_at
      await base44.entities.Channel.update(selectedChannelId, {
        last_message_at: new Date().toISOString(),
      });

      if (newMsg?.id && typeof messageInput === 'string' && messageInput.includes('@')) {
        invokeMemberFunction('processMessageMentions', {
          messageId: newMsg.id,
          channelId: selectedChannelId,
          content: messageInput,
        }).catch(() => {});
      }

      setMessages((prev) => [...prev, newMsg]);
      setMessageInput('');
      clearTyping();
      refreshUnreadCounts();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [messageInput, selectedChannelId, user?.id, refreshUnreadCounts, clearTyping]);

  const handleCreateDM = async ({ userIds }) => {
    try {
      // Check if DM already exists
      const existingDMs = await base44.entities.Channel.filter({ is_dm: true });
      const existing = existingDMs.find(ch => {
        const participants = ch.dm_participants || [];
        return participants.length === 2 &&
          participants.includes(user.id) &&
          participants.includes(userIds[0]);
      });

      if (existing) {
        setSelectedChannelId(existing.id);
        setViewMode('dms');
        return;
      }

      // Create new DM channel
      const dmChannel = await base44.entities.Channel.create({
        name: `DM-${user.id}-${userIds[0]}`,
        type: 'text',
        category: 'direct',
        is_dm: true,
        is_group_chat: false,
        dm_participants: [user.id, userIds[0]],
      });

      setSelectedChannelId(dmChannel.id);
      setViewMode('dms');
    } catch (error) {
      console.error('Failed to create DM:', error);
    }
  };

  const handleCreateGroup = async ({ userIds, groupName }) => {
    try {
      const groupChannel = await base44.entities.Channel.create({
        name: groupName,
        type: 'text',
        category: 'direct',
        is_dm: true,
        is_group_chat: true,
        dm_participants: [user.id, ...userIds],
        group_name: groupName,
        group_owner_id: user.id,
      });

      setSelectedChannelId(groupChannel.id);
      setViewMode('dms');
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const loadPolls = useCallback(async () => {
    if (!selectedChannelId) return;
    setLoadingPolls(true);
    try {
      const pollsList = await base44.entities.Poll.filter(
        { scope: 'CHANNEL', scope_id: selectedChannelId },
        '-created_date',
        20
      );
      const pollsWithVotes = await Promise.all(
        pollsList.map(async (poll) => {
          const votes = await base44.entities.PollVote.filter({ poll_id: poll.id });
          return { ...poll, votes };
        })
      );
      setPolls(pollsWithVotes);
    } catch (error) {
      console.error('Failed to load polls:', error);
    } finally {
      setLoadingPolls(false);
    }
  }, [selectedChannelId]);

  useEffect(() => {
    if (activeTab === 'polls') {
      loadPolls();
    }
  }, [activeTab, selectedChannelId, loadPolls]);

  const createPoll = async () => {
    if (!pollQuestion.trim() || !selectedChannelId || !user?.id) return;
    const validOptions = pollOptions.filter((opt) => opt.trim());
    if (validOptions.length < 2) return;

    try {
      const formattedOptions = validOptions.map((text, idx) => ({
        id: `opt_${idx}`,
        text: text.trim(),
      }));

      await base44.entities.Poll.create({
        scope: 'CHANNEL',
        scope_id: selectedChannelId,
        question: pollQuestion.trim(),
        options: formattedOptions,
        created_by: user.id,
        closes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollCreator(false);
      loadPolls();
    } catch (error) {
      console.error('Failed to create poll:', error);
    }
  };

  const votePoll = async (pollId, optionId) => {
    if (!user?.id) return;
    try {
      await base44.entities.PollVote.create({
        poll_id: pollId,
        user_id: user.id,
        selected_option_ids: [optionId],
      });
      loadPolls();
    } catch (error) {
      console.error('Failed to vote in poll:', error);
    }
  };

  const askRiggsy = async () => {
    if (!riggsyPrompt.trim()) return;
    setRiggsyLoading(true);
    setRiggsyResponse('');

    try {
      const channelContext = messages.slice(-10).map((m) => m.content).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are Riggsy, a tactical AI assistant for the Nomad Nexus communication system. 

Recent channel activity:
${channelContext}

User question: ${riggsyPrompt}

Provide a helpful, concise response with tactical awareness.`,
      });

      setRiggsyResponse(result);
    } catch (error) {
      setRiggsyResponse('Error: Unable to reach Riggsy at this time.');
    } finally {
      setRiggsyLoading(false);
    }
  };

  // Sync unread counts whenever channels change
  React.useEffect(() => {
    refreshUnreadCounts();
  }, [channels, refreshUnreadCounts]);

  // Group channels by category
   const groupedChannels = {
     casual: channels.filter((ch) => ch.category === 'casual'),
     focused: channels.filter((ch) => ch.category === 'focused'),
     temporary: channels.filter((ch) => ch.category === 'temporary'),
   };

  const canAccessChannel = (channel) => {
    if (channel.category === 'focused') {
      return canAccessFocusedComms(user);
    }
    return true;
  };

  const filteredChannels = Object.entries(groupedChannels)
    .flatMap(([, chans]) => chans)
    .filter((ch) => ch.name.toLowerCase().includes(searchInput.toLowerCase()));

  const selectedChannel = channels.find((ch) => ch.id === selectedChannelId);

  if (!isOpen) return null;

  return (
    <div className={`bg-zinc-950 border-t border-orange-500/20 flex flex-col flex-shrink-0 shadow-2xl z-[600] relative transition-all duration-200 ${isMinimized ? 'h-12' : 'h-96'}`}>
      {/* Header — Unified styling */}
      <div className="border-b border-orange-500/10 px-4 py-2.5 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-orange-500/70" />
          <h3 className="text-[11px] font-black uppercase text-zinc-300 tracking-widest">{isMinimized ? 'COMMS' : 'Communications Terminal'}</h3>
        </div>
        <div className="flex gap-1">
          {!isMinimized && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowGlobalSearch(true)}
              className="h-7 w-7 text-zinc-500 hover:text-orange-400 transition-colors"
              title="Search all messages"
            >
              <Search className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMinimize?.(!isMinimized)}
            className="h-7 w-7 text-zinc-500 hover:text-orange-400 transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs — Comms active, others disabled with "coming soon" */}
      {!isMinimized && (
        <div className="flex border-b border-orange-500/10 bg-zinc-950/40 flex-shrink-0 overflow-x-auto">
          {['comms', 'dms', 'mentions', 'polls', 'riggsy', 'inbox'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === 'comms') {
                  setActiveTab('comms');
                  setViewMode('channels');
                } else if (tab === 'dms') {
                  setActiveTab('comms');
                  setViewMode('dms');
                } else if (tab === 'mentions') {
                  setActiveTab('mentions');
                } else if (tab === 'polls') {
                  setActiveTab('polls');
                } else if (tab === 'riggsy') {
                  setActiveTab('riggsy');
                }
              }}
              disabled={tab === 'inbox'}
              className={`whitespace-nowrap text-[11px] font-semibold uppercase px-3 py-2 transition-all border-b-2 ${
                tab === 'inbox'
                  ? 'text-zinc-600 border-transparent cursor-not-allowed opacity-50'
                  : activeTab === tab || (tab === 'comms' && viewMode === 'channels' && activeTab === 'comms') || (tab === 'dms' && viewMode === 'dms' && activeTab === 'comms')
                  ? 'text-orange-400 border-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:border-orange-500/30'
              }`}
              title={tab === 'inbox' ? 'Coming soon' : ''}
            >
              {tab === 'comms' && <>Channels {viewMode === 'channels' && unreadByTab?.comms > 0 && <span className="ml-1 text-orange-400">({unreadByTab.comms})</span>}</>}
              {tab === 'dms' && <>DMs</>}
              {tab === 'mentions' && <>@Mentions</>}
              {tab === 'polls' && <>Polls</>}
              {tab === 'riggsy' && <>Riggsy</>}
              {tab === 'inbox' && <>Inbox <span className="text-[9px] text-zinc-700 ml-1">(coming soon)</span></>}
            </button>
          ))}
        </div>
      )}

      {/* Content — Comms tab only */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'comms' && (
            <div className="flex-1 overflow-hidden flex">
              {/* Channel/DM List */}
              <div className="w-48 lg:w-56 border-r border-orange-500/10 flex flex-col overflow-hidden min-w-0 flex-shrink-0">
              {viewMode === 'dms' ? (
                <DMChannelList
                  currentUserId={user?.id}
                  selectedChannelId={selectedChannelId}
                  onSelectChannel={setSelectedChannelId}
                  onCreateDM={() => {
                    setUserPickerMode('dm');
                    setShowUserPicker(true);
                  }}
                  onCreateGroup={() => {
                    setUserPickerMode('group');
                    setShowUserPicker(true);
                  }}
                  unreadCounts={unreadByChannel}
                />
              ) : (
                <>
              {/* Search Input */}
              <div className="px-2 py-2 flex-shrink-0">
                <Input
                  placeholder="Find channel..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-8 text-xs bg-zinc-900/50 border-orange-500/10 placeholder:text-zinc-600 focus:border-orange-500/30 transition-colors"
                />
              </div>

               {/* Channel Groups */}
               <div className="flex-1 overflow-y-auto space-y-3 px-2 py-2">
                 {groupedChannels.casual.length === 0 && groupedChannels.focused.length === 0 && groupedChannels.temporary.length === 0 ? (
                   <div className="text-center text-[10px] text-zinc-600 py-4">
                     <div className="opacity-50">—</div>
                     <div className="mt-1">No channels available</div>
                   </div>
                 ) : (
                   <>
                     {/* Casual Channels */}
                     {groupedChannels.casual.length > 0 && (
                       <div>
                         <div className="text-[10px] font-black uppercase text-zinc-500 px-2 py-1 tracking-widest">Casual</div>
                         <div className="space-y-1 mt-1">
                           {groupedChannels.casual.map((ch) => (
                             <button
                               key={ch.id}
                               onClick={() => setSelectedChannelId(ch.id)}
                               className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                                 selectedChannelId === ch.id
                                   ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                   : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                               }`}
                             >
                               <Hash className="w-3 h-3 flex-shrink-0 opacity-70" />
                               <span className="truncate">{ch.name}</span>
                               {unreadByChannel?.[ch.id] > 0 && (
                                 <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByChannel[ch.id]}</span>
                               )}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}

                     {/* Focused Channels */}
                     {groupedChannels.focused.length > 0 && (
                       <div className="pt-2 border-t border-orange-500/10">
                         <div className="text-[10px] font-black uppercase text-orange-600 px-2 py-1 tracking-widest">Focused</div>
                         <div className="space-y-1 mt-1">
                           {groupedChannels.focused.map((ch) => {
                             const canAccess = canAccessChannel(ch);
                             return (
                               <button
                                 key={ch.id}
                                 onClick={() => canAccess && setSelectedChannelId(ch.id)}
                                 disabled={!canAccess}
                                 className={`w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors min-w-0 ${
                                   !canAccess
                                     ? 'text-zinc-600 opacity-50 cursor-not-allowed'
                                     : selectedChannelId === ch.id
                                     ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                     : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                                 }`}
                                 title={!canAccess ? 'Insufficient permissions' : ''}
                               >
                                 {!canAccess ? <Lock className="w-3 h-3 flex-shrink-0 opacity-70" /> : <Hash className="w-3 h-3 flex-shrink-0 opacity-70" />}
                                 <span className="truncate flex-1 min-w-0">{ch.name}</span>
                                 {unreadByChannel?.[ch.id] > 0 && (
                                   <span className="ml-auto text-orange-400 font-semibold text-[10px] flex-shrink-0">{unreadByChannel[ch.id]}</span>
                                 )}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     )}

                     {/* Temporary Channels */}
                     {groupedChannels.temporary.length > 0 && (
                       <div className="pt-2 border-t border-orange-500/10">
                         <div className="text-[10px] font-black uppercase text-zinc-500 px-2 py-1 tracking-widest">Temporary</div>
                         <div className="space-y-1 mt-1">
                           {groupedChannels.temporary.map((ch) => (
                             <button
                               key={ch.id}
                               onClick={() => setSelectedChannelId(ch.id)}
                               className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                                 selectedChannelId === ch.id
                                   ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                   : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                               }`}
                             >
                               <Hash className="w-3 h-3 flex-shrink-0 opacity-70" />
                               <span className="truncate">{ch.name}</span>
                               {unreadByChannel?.[ch.id] > 0 && (
                                 <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByChannel[ch.id]}</span>
                               )}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </>
                   )}
                   </div>
                   </>
                   )}
                   </div>

                   {/* Message Area */}
                   <div className="flex-1 flex overflow-hidden">
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Channel Header */}
                  {selectedChannel && (
                   <div className="border-b border-orange-500/10 px-4 py-2.5 flex items-center gap-2 bg-zinc-900/40 flex-shrink-0">
                     {!canAccessChannel(selectedChannel) && <Lock className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />}
                     <span className="text-[11px] font-black uppercase text-zinc-300 tracking-widest truncate flex-1">#{selectedChannel.name}</span>

                     <Button
                       size="icon"
                       variant="ghost"
                       onClick={() => setShowNotificationSettings(true)}
                       className="h-6 w-6"
                       title="Notification settings"
                     >
                       <Bell className="w-3 h-3" />
                     </Button>

                     {isAdmin && (
                       <>
                         <Button
                           size="icon"
                           variant="ghost"
                           onClick={() => setShowModerationPanel(true)}
                           className="h-6 w-6"
                           title="Moderation tools"
                         >
                           <Shield className="w-3 h-3" />
                         </Button>
                         <AIModerationIndicator channelId={selectedChannel.id} isAdmin={true} />
                       </>
                     )}
                   </div>
                  )}

                  {/* Pinned Messages */}
                  <PinnedMessages channelId={selectedChannelId} />

                {/* Messages — Enhanced with MessageItem component */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 text-xs flex flex-col min-h-0">
                  {loadingMessages && (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                      <div className="text-xs text-center">
                        <div className="animate-pulse mb-2 text-orange-500">⟳</div>
                        <div>Loading messages...</div>
                      </div>
                    </div>
                  )}
                  {messages.length === 0 && !loadingMessages && (
                    <div className="flex items-center justify-center h-full text-zinc-600">
                      <div className="text-center">
                        <div className="text-[10px] opacity-50 mb-1">—</div>
                        <div className="text-[10px]">No messages in this channel yet</div>
                      </div>
                    </div>
                  )}
                  {messages.length > 0 && (
                    <>
                      {messages.map((msg) => {
                        const lastSeen = lastSeenMap[msg.user_id];
                        return (
                          <MessageItem
                            key={msg.id}
                            message={msg}
                            currentUserId={user?.id}
                            isAdmin={isAdmin}
                            lastSeen={lastSeen}
                            authorLabel={memberMap[msg.user_id]?.label}
                            onEdit={() => {
                              // Refresh messages after edit
                              const loadMessages = async () => {
                                const msgs = await base44.entities.Message.filter({ channel_id: selectedChannelId });
                                setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
                              };
                              loadMessages();
                            }}
                            onDelete={async (msgToDelete) => {
                              if (confirm('Delete this message?')) {
                                try {
                                  await base44.entities.Message.update(msgToDelete.id, {
                                    is_deleted: true,
                                    deleted_by: user.id,
                                    deleted_at: new Date().toISOString(),
                                  });
                                } catch (error) {
                                  console.error('Failed to delete message:', error);
                                }
                              }
                            }}
                            onReply={(msg) => setThreadPanelMessage(msg)}
                            onPin={async (msg) => {
                              try {
                                // Check if already pinned
                                const existing = await base44.entities.PinnedMessage.filter({
                                  channel_id: selectedChannelId,
                                  message_id: msg.id,
                                });

                                if (existing.length > 0) {
                                  alert('Message already pinned');
                                  return;
                                }

                                // Get current pin count for order
                                const allPinned = await base44.entities.PinnedMessage.filter({
                                  channel_id: selectedChannelId,
                                });

                                await base44.entities.PinnedMessage.create({
                                  channel_id: selectedChannelId,
                                  message_id: msg.id,
                                  pinned_by: user.id,
                                  pin_order: allPinned.length,
                                });
                              } catch (error) {
                                console.error('Failed to pin message:', error);
                              }
                            }}
                            />
                            );
                            })}
                            <div ref={messagesEndRef} />
                            </>
                            )}
                            {/* Typing Indicator */}
                            {typingUsers.length > 0 && <TypingIndicator userIds={typingUsers} />}
                            </div>

                {/* Composer — Enhanced with MessageComposer */}
                {!selectedChannel || !canAccessChannel(selectedChannel) ? (
                  <div className="border-t border-orange-500/10 p-3 bg-zinc-900/40 flex-shrink-0">
                    <div className="flex items-center gap-2 text-[10px] text-zinc-600 px-3 py-2 bg-zinc-800/30 rounded border border-zinc-700/50">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Cannot post to this channel</span>
                    </div>
                  </div>
                ) : (
                  <MessageComposer
                    channelId={selectedChannelId}
                    userId={user?.id}
                    onSendMessage={async (messageData) => {
                      try {
                        const newMsg = await base44.entities.Message.create(messageData);
                        if (newMsg?.id && messageData?.content && messageData.content.includes('@')) {
                          invokeMemberFunction('processMessageMentions', {
                            messageId: newMsg.id,
                            channelId: selectedChannelId,
                            content: messageData.content,
                          }).catch(() => {});
                        }
                        clearTyping();
                        refreshUnreadCounts();
                      } catch (error) {
                        console.error('Failed to send message:', error);
                      }
                    }}
                    onTyping={signalTyping}
                  />
                )}
                </div>

                {/* Thread Panel */}
                {threadPanelMessage && (
                <ThreadPanel
                  parentMessage={threadPanelMessage}
                  onClose={() => setThreadPanelMessage(null)}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                />
                )}
                </div>
                </div>
                )}

                {activeTab === 'mentions' && (
                <MentionsView 
                user={user} 
                onJumpToMessage={(msg) => {
                  setSelectedChannelId(msg.channel_id);
                  setActiveTab('comms');
                  setViewMode('channels');
                }}
                />
                )}

                {activeTab === 'polls' && (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {!selectedChannelId ? (
                      <div className="text-xs text-zinc-600 text-center py-4">Select a channel to view polls.</div>
                    ) : (
                      <>
                        {!showPollCreator && (
                          <Button onClick={() => setShowPollCreator(true)} variant="outline" className="w-full text-xs">
                            Create Poll
                          </Button>
                        )}

                        {showPollCreator && (
                          <div className="p-3 bg-zinc-900/50 rounded border border-zinc-800 space-y-2">
                            <Input
                              value={pollQuestion}
                              onChange={(e) => setPollQuestion(e.target.value)}
                              placeholder="Poll question..."
                              className="h-8 text-xs"
                            />
                            {pollOptions.map((opt, idx) => (
                              <Input
                                key={idx}
                                value={opt}
                                onChange={(e) => {
                                  const updated = [...pollOptions];
                                  updated[idx] = e.target.value;
                                  setPollOptions(updated);
                                }}
                                placeholder={`Option ${idx + 1}`}
                                className="h-8 text-xs"
                              />
                            ))}
                            <div className="flex gap-2">
                              <Button onClick={() => setPollOptions([...pollOptions, ''])} variant="outline" size="sm">
                                Add Option
                              </Button>
                              <Button onClick={createPoll} size="sm">Create</Button>
                              <Button onClick={() => setShowPollCreator(false)} variant="outline" size="sm">Cancel</Button>
                            </div>
                          </div>
                        )}

                        {loadingPolls ? (
                          <div className="text-xs text-zinc-600 text-center py-4">Loading polls...</div>
                        ) : polls.length === 0 ? (
                          <div className="text-xs text-zinc-600 text-center py-4">No polls yet.</div>
                        ) : (
                          polls.map((poll) => {
                            const userVote = poll.votes?.find((v) => v.user_id === user?.id);
                            const voteCounts = {};
                            poll.options?.forEach((opt) => (voteCounts[opt.id] = 0));
                            poll.votes?.forEach((vote) => {
                              vote.selected_option_ids?.forEach((optId) => {
                                voteCounts[optId] = (voteCounts[optId] || 0) + 1;
                              });
                            });
                            const totalVotes = poll.votes?.length || 0;

                            return (
                              <div key={poll.id} className="p-3 bg-zinc-900/40 rounded border border-zinc-800 space-y-2">
                                <div className="text-xs font-semibold text-white">{poll.question}</div>
                                <div className="space-y-1.5">
                                  {poll.options?.map((option) => {
                                    const count = voteCounts[option.id] || 0;
                                    const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                                    const hasVoted = userVote?.selected_option_ids?.includes(option.id);

                                    return (
                                      <button
                                        key={option.id}
                                        onClick={() => !userVote && votePoll(poll.id, option.id)}
                                        disabled={!!userVote}
                                        className={`w-full p-2 rounded border text-left text-xs transition-colors ${
                                          hasVoted
                                            ? 'bg-orange-500/20 border-orange-500'
                                            : userVote
                                            ? 'bg-zinc-900/30 border-zinc-700 cursor-not-allowed'
                                            : 'bg-zinc-900/30 border-zinc-700 hover:border-orange-500/50'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-zinc-200">{option.text}</span>
                                          <span className="text-[10px] text-zinc-500">{count} ({percentage}%)</span>
                                        </div>
                                        {userVote && (
                                          <div className="mt-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500" style={{ width: `${percentage}%` }} />
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                                <div className="text-[10px] text-zinc-600">
                                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • Ends {poll.closes_at ? new Date(poll.closes_at).toLocaleDateString() : '—'}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'riggsy' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                        <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-1">Riggsy Tactical AI</div>
                        <div className="text-[11px] text-zinc-400">
                          Ask for comms summaries, tactical insights, or channel guidance.
                        </div>
                      </div>

                      {riggsyResponse && (
                        <div className="p-3 bg-zinc-900/40 border border-zinc-800 rounded">
                          <div className="text-[10px] text-blue-400 font-semibold mb-2">RIGGSY RESPONSE</div>
                          <div className="text-xs text-zinc-300 whitespace-pre-wrap">{riggsyResponse}</div>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-orange-500/10 p-3 bg-zinc-900/40">
                      <div className="flex gap-2">
                        <Input
                          value={riggsyPrompt}
                          onChange={(e) => setRiggsyPrompt(e.target.value)}
                          placeholder="Ask Riggsy anything..."
                          className="h-9 text-xs"
                        />
                        <Button onClick={askRiggsy} disabled={!riggsyPrompt.trim() || riggsyLoading} className="h-9">
                          {riggsyLoading ? '...' : 'Ask'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                </div>
                )}

                {/* User Picker Modal */}
      <UserPickerModal
        isOpen={showUserPicker}
        onClose={() => setShowUserPicker(false)}
        onConfirm={userPickerMode === 'dm' ? handleCreateDM : handleCreateGroup}
        mode={userPickerMode}
        currentUserId={user?.id}
      />

      {/* Global Message Search */}
      <GlobalMessageSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onSelectMessage={(msg) => {
          setSelectedChannelId(msg.channel_id);
          setViewMode('channels');
        }}
        currentUserId={user?.id}
      />

      {/* Channel Notification Settings */}
      <ChannelNotificationSettings
        channel={selectedChannel}
        isOpen={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
        userId={user?.id}
      />

      {/* Moderation Panel */}
      <ModerationPanel
        channel={selectedChannel}
        isOpen={showModerationPanel}
        onClose={() => setShowModerationPanel(false)}
        currentUser={user}
      />
    </div>
  );
}
