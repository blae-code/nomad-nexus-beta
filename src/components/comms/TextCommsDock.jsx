import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Minimize2, MessageSquare, Lock, Hash, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { base44 } from '@/api/base44Client';
import { canAccessFocusedComms } from '@/components/utils/commsAccessPolicy';

export default function TextCommsDock({ isOpen, onClose, isMinimized, onMinimize }) {
  const [activeTab, setActiveTab] = useState('comms');
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const messagesEndRef = useRef(null);

  const { user } = useCurrentUser();
  const { unreadByTab, refreshUnreadCounts, markChannelRead } = useUnreadCounts(user?.id);
  const activeOp = useActiveOp();

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

  // Load messages for selected channel
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

      setMessages((prev) => [...prev, newMsg]);
      setMessageInput('');
      refreshUnreadCounts();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [messageInput, selectedChannelId, user?.id, refreshUnreadCounts]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
    <div className="bg-zinc-950 border-t border-orange-500/30 flex flex-col h-96 flex-shrink-0 shadow-2xl">
      {/* Header */}
      <div className="border-b border-orange-500/20 px-4 py-2.5 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-orange-500" />
          <h3 className="text-xs font-bold uppercase text-orange-400 tracking-widest">Text Comms</h3>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMinimize?.(!isMinimized)}
            className="h-7 w-7 text-zinc-500 hover:text-orange-400"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-7 w-7 text-zinc-500 hover:text-red-400"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {!isMinimized && (
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 flex-shrink-0 overflow-x-auto">
          {['comms', 'polls', 'riggsy', 'inbox'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap text-xs font-semibold uppercase px-3 py-2 transition-all border-b-2 ${
                activeTab === tab
                  ? 'text-orange-400 border-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300 border-transparent'
              }`}
            >
              {tab === 'comms' && (
                <>Comms {unreadByTab?.comms > 0 && <span className="ml-1 text-orange-400">({unreadByTab.comms})</span>}</>
              )}
              {tab === 'polls' && (
                <>Polls {unreadByTab?.polls > 0 && <span className="ml-1 text-orange-400">({unreadByTab.polls})</span>}</>
              )}
              {tab === 'riggsy' && (
                <>Riggsy {unreadByTab?.riggsy > 0 && <span className="ml-1 text-orange-400">({unreadByTab.riggsy})</span>}</>
              )}
              {tab === 'inbox' && <>Inbox</>}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'comms' && (
            <div className="flex-1 overflow-hidden flex">
              {/* Channel List */}
              <div className="w-80 border-r border-zinc-800 flex flex-col overflow-hidden">
               <Input
                 placeholder="Find channel..."
                 value={searchInput}
                 onChange={(e) => setSearchInput(e.target.value)}
                 className="h-7 text-xs m-2 bg-zinc-900/50 border-zinc-800 placeholder:text-zinc-600"
               />

               <div className="flex-1 overflow-y-auto space-y-1 px-2">
                 {groupedChannels.casual.length === 0 && groupedChannels.focused.length === 0 ? (
                   <div className="text-center text-[10px] text-zinc-600 py-4">
                     <div className="opacity-50">No channels available</div>
                   </div>
                 ) : (
                   <>
                     {/* Casual Group */}
                     {groupedChannels.casual.length > 0 && (
                       <div>
                         <div className="text-[10px] font-semibold text-zinc-500 px-1 py-1 uppercase tracking-wider">Open</div>
                      {groupedChannels.casual.map((ch) => (
                        <button
                          key={ch.id}
                          onClick={() => setSelectedChannelId(ch.id)}
                          className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                            selectedChannelId === ch.id
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                              : 'text-zinc-400 hover:bg-zinc-800/50'
                          }`}
                        >
                          <Hash className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{ch.name}</span>
                          {unreadByTab?.[ch.id] > 0 && (
                            <span className="ml-auto text-orange-400 font-semibold text-[10px]">{unreadByTab[ch.id]}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Focused Group */}
                  {groupedChannels.focused.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-orange-600 px-1 py-1 uppercase tracking-wider">Disciplined</div>
                      {groupedChannels.focused.map((ch) => {
                        const canAccess = canAccessChannel(ch);
                        return (
                          <button
                            key={ch.id}
                            onClick={() => canAccess && setSelectedChannelId(ch.id)}
                            disabled={!canAccess}
                            className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                              !canAccess
                                ? 'text-zinc-600 opacity-50 cursor-not-allowed'
                                : selectedChannelId === ch.id
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'text-zinc-400 hover:bg-zinc-800/50'
                            }`}
                          >
                            {!canAccess ? <Lock className="w-3 h-3 flex-shrink-0" /> : <Hash className="w-3 h-3 flex-shrink-0" />}
                            <span className="truncate">{ch.name}</span>
                          </button>
                          );
                          })}
                          </div>
                          )}
                          </>
                          )}
                          </div>
                          </div>

              {/* Message Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Channel Header */}
                {selectedChannel && (
                  <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2 bg-zinc-900/40 flex-shrink-0">
                    {!canAccessChannel(selectedChannel) && <Lock className="w-3 h-3 text-zinc-600" />}
                    <span className="text-xs font-semibold text-zinc-300">#{selectedChannel.name}</span>
                  </div>
                )}

                {/* Messages */}
                 <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs flex flex-col">
                    {loadingMessages && (
                      <div className="flex items-center justify-center h-full text-zinc-500">
                        <div className="text-xs text-center">
                          <div className="animate-pulse mb-2">⟳</div>
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
                        {messages.map((msg) => (
                          <div key={msg.id} className="group">
                            <div className="text-[10px] text-zinc-600">
                              <span className="font-semibold text-zinc-400">{msg.user_id || 'Unknown'}</span>
                              <span className="mx-1">•</span>
                              <span>{new Date(msg.created_date).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-zinc-300 leading-snug">{msg.content}</p>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                 </div>

                {/* Composer */}
                <div className="border-t border-zinc-800 p-2 bg-zinc-900/40 flex-shrink-0">
                  <div className="flex gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Message..."
                      disabled={!selectedChannel || !canAccessChannel(selectedChannel)}
                      className="h-7 text-xs flex-1 bg-zinc-900 border-zinc-700"
                    />
                    <Button
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || !selectedChannel || !canAccessChannel(selectedChannel)}
                      className="h-7 w-7"
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'polls' && (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <div className="text-center">
                <div className="text-[10px] opacity-50 mb-1">📊</div>
                <div className="text-xs">Polls module (coming soon)</div>
              </div>
            </div>
          )}

          {activeTab === 'riggsy' && (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <div className="text-center">
                <div className="text-[10px] opacity-50 mb-1">🤖</div>
                <div className="text-xs">Riggsy AI Assistant (in development)</div>
              </div>
            </div>
          )}

          {activeTab === 'inbox' && (
            <div className="flex items-center justify-center h-full text-zinc-600">
              <div className="text-center">
                <div className="text-[10px] opacity-50 mb-1">💬</div>
                <div className="text-xs">Direct messages (in development)</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}