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
import { useCurrentUser } from '@/components/useCurrentUser';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { base44 } from '@/api/base44Client';
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
  const messagesEndRef = useRef(null);

  const { user } = useCurrentUser();
  const { unreadByTab, refreshUnreadCounts, markChannelRead } = useUnreadCounts(user?.id);
  const activeOp = useActiveOp();
  const { typingUsers, signalTyping, clearTyping } = useTypingIndicator(selectedChannelId, user?.id);
  const messageUserIds = [...new Set(messages.map(m => m.user_id))];
  const { lastSeenMap } = useLastSeen(messageUserIds);

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
                }
              }}
              disabled={tab !== 'comms' && tab !== 'dms' && tab !== 'mentions'}
              className={`whitespace-nowrap text-[11px] font-semibold uppercase px-3 py-2 transition-all border-b-2 ${
                tab !== 'comms' && tab !== 'dms' && tab !== 'mentions'
                  ? 'text-zinc-600 border-transparent cursor-not-allowed opacity-50'
                  : activeTab === tab || (tab === 'comms' && viewMode === 'channels' && activeTab === 'comms') || (tab === 'dms' && viewMode === 'dms' && activeTab === 'comms')
                  ? 'text-orange-400 border-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent hover:border-orange-500/30'
              }`}
              title={tab !== 'comms' && tab !== 'dms' && tab !== 'mentions' ? 'Coming soon' : ''}
            >
              {tab === 'comms' && <>Channels {viewMode === 'channels' && unreadByTab?.comms > 0 && <span className="ml-1 text-orange-400">({unreadByTab.comms})</span>}</>}
              {tab === 'dms' && <>DMs</>}
              {tab === 'mentions' && <>@Mentions</>}
              {tab !== 'comms' && tab !== 'dms' && tab !== 'mentions' && <>{tab} <span className="text-[9px] text-zinc-700 ml-1">(coming soon)</span></>}
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
                               {unreadByTab?.[ch.id] > 0 && (
                                 <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByTab[ch.id]}</span>
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
                                 {unreadByTab?.[ch.id] > 0 && (
                                   <span className="ml-auto text-orange-400 font-semibold text-[10px] flex-shrink-0">{unreadByTab[ch.id]}</span>
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
                               {unreadByTab?.[ch.id] > 0 && (
                                 <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByTab[ch.id]}</span>
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

                     {user?.role === 'admin' && (
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
                            isAdmin={user?.role === 'admin'}
                            lastSeen={lastSeen}
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
                        await base44.entities.Message.create(messageData);
                        clearTyping();
                        refreshUnreadCounts();
                      } catch (error) {
                        console.error('Failed to send message:', error);
                      }
                    }}
                  />
                )}
                </div>

                {/* Thread Panel */}
                {threadPanelMessage && (
                <ThreadPanel
                  parentMessage={threadPanelMessage}
                  onClose={() => setThreadPanelMessage(null)}
                  currentUserId={user?.id}
                  isAdmin={user?.role === 'admin'}
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