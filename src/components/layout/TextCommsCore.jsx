import React, { useState, useEffect } from 'react';
import { MessageSquare, X, ChevronLeft, Send, Hash, Users, Lock, Globe, AtSign, Pin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { base44 } from '@/api/base44Client';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';

/**
 * TextCommsCore — Right sidebar for text-based communications
 * Counterpart to Voice Command Core (voice only)
 * Handles channels, DMs, threads, messages
 */
export default function TextCommsCore({ isOpen, onClose, isMinimized, onMinimize }) {
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const { unreadByTab } = useUnreadCounts(user?.id);

  const [channels, setChannels] = useState([]);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const activeChannel = channels.find(c => c.id === activeChannelId);

  useEffect(() => {
    if (!user?.id) return;
    loadChannels();
  }, [user?.id]);

  useEffect(() => {
    if (!activeChannelId) return;
    loadMessages();
    
    // Subscribe to real-time updates
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel_id === activeChannelId) {
        if (event.type === 'create') {
          setMessages(prev => [...prev, event.data]);
        } else if (event.type === 'update') {
          setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        } else if (event.type === 'delete') {
          setMessages(prev => prev.filter(m => m.id !== event.id));
        }
      }
    });

    return () => unsub?.();
  }, [activeChannelId]);

  const loadChannels = async () => {
    try {
      const allChannels = await base44.entities.Channel.list('-last_message_at', 50);
      setChannels(allChannels || []);
      if (!activeChannelId && allChannels.length > 0) {
        setActiveChannelId(allChannels[0].id);
      }
    } catch (err) {
      console.error('Channels load failed:', err);
    }
  };

  const loadMessages = async () => {
    try {
      const msgs = await base44.entities.Message.filter(
        { channel_id: activeChannelId },
        'created_date',
        100
      );
      setMessages(msgs || []);
    } catch (err) {
      console.error('Messages load failed:', err);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !activeChannelId || !user?.id) return;

    setSending(true);
    try {
      await base44.entities.Message.create({
        channel_id: activeChannelId,
        member_profile_id: user.id,
        content: messageInput.trim(),
      });
      setMessageInput('');
    } catch (err) {
      console.error('Send failed:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`${isMinimized ? 'w-12' : 'w-80'} bg-black/98 border-l-2 border-red-700/50 flex flex-col overflow-hidden z-[900] relative transition-all duration-200`}>
      {/* Header */}
      <div className="h-12 border-b-2 border-red-700/50 flex items-center justify-between px-3 flex-shrink-0 bg-gradient-to-r from-red-950/40 to-black/60 backdrop-blur-sm">
        {!isMinimized && (
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-red-500 rounded-sm" />
            <div>
              <h2 className="text-xs font-black uppercase text-white tracking-[0.2em]">Comms Core</h2>
              <p className="text-[9px] text-zinc-600 uppercase tracking-wider font-mono mt-0.5">Text Systems</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onMinimize(!isMinimized)}
            className="h-6 w-6 text-zinc-600 hover:text-red-400"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </Button>
          {!isMinimized && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-6 w-6 text-zinc-600 hover:text-red-400"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Channels List */}
          <div className="flex-shrink-0 border-b border-red-700/40 bg-black/40">
            <div className="px-3 py-2 border-b border-red-700/40">
              <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-bold">Channels</div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {channels.map(channel => {
                const isActive = channel.id === activeChannelId;
                const unread = unreadByTab?.comms?.[channel.id] || 0;
                const ChannelIcon = channel.is_dm ? AtSign : 
                                   channel.access_min_rank ? Lock :
                                   channel.category === 'public' ? Globe : Hash;
                
                return (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannelId(channel.id)}
                    className={`w-full px-3 py-2 flex items-center gap-2 text-left transition-all ${
                      isActive 
                        ? 'bg-red-950/40 border-l-2 border-red-500' 
                        : 'hover:bg-red-950/20 border-l-2 border-transparent'
                    }`}
                  >
                    <ChannelIcon className={`w-3 h-3 flex-shrink-0 ${isActive ? 'text-red-500' : 'text-zinc-600'}`} />
                    <span className={`text-[10px] font-bold truncate ${isActive ? 'text-zinc-200' : 'text-zinc-500'}`}>
                      {channel.name}
                    </span>
                    {unread > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-bold rounded-full">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Active Channel Header */}
            {activeChannel && (
              <div className="flex-shrink-0 px-3 py-2 border-b border-red-700/40 bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <Hash className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">{activeChannel.name}</span>
                </div>
                {activeChannel.rules && (
                  <p className="text-[8px] text-zinc-600 mt-1 line-clamp-1">{activeChannel.rules}</p>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {messages.map(msg => (
                <div key={msg.id} className="p-2 bg-zinc-900/40 border border-red-700/40 rounded">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[9px] font-bold text-red-400 font-mono">
                      {msg.member_profile_id?.substring(0, 8)}
                    </span>
                    <span className="text-[8px] text-zinc-700 font-mono">
                      {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.is_edited && (
                      <span className="text-[7px] text-zinc-700 uppercase">(edited)</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-300 leading-relaxed break-words">{msg.content}</p>
                  {msg.attachments?.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {msg.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[8px] text-cyan-400 hover:underline"
                        >
                          Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-8 text-[10px] text-zinc-700 uppercase tracking-wider font-mono">
                  No messages
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm">
              <div className="flex gap-1.5">
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 min-h-[60px] max-h-[120px] text-[10px] bg-zinc-900/60 border-red-700/40 resize-none focus:border-red-500/60"
                  disabled={!activeChannelId || !user}
                />
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending || !activeChannelId || !user}
                  className="h-[60px] w-10 bg-red-600 hover:bg-red-500 flex-shrink-0"
                >
                  <Send className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-[8px] text-zinc-700 mt-1 font-mono">
                Enter to send • Shift+Enter for newline
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}