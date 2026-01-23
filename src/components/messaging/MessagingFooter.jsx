import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  ChevronUp, Hash, Settings, Users, Shield, Bell, Lock, Trash2, UserX, Volume2, 
  MessageSquare, Pin, AlertCircle, Eye, EyeOff, Search, Plus, MoreVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function MessagingFooter({ user }) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [activePanel, setActivePanel] = useState(null); // 'settings', 'members', 'moderation'
  const [searchQuery, setSearchQuery] = useState('');
  const [showChannelMenu, setShowChannelMenu] = useState(null);
  const queryClient = useQueryClient();

  const { data: channels = [] } = useQuery({
    queryKey: ['text-channels', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const allChannels = await base44.entities.Channel.list();
      return allChannels || [];
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: false,
    gcTime: 60000
  });

  // Real-time subscription for channels
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = base44.entities.Channel.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['text-channels', user?.id] });
    });

    return () => unsubscribe?.();
  }, [user?.id, queryClient]);

  const { data: currentChannelData } = useQuery({
    queryKey: ['channel-details', selectedChannel],
    queryFn: async () => {
      if (!selectedChannel) return null;
      const channel = await base44.entities.Channel.get(selectedChannel);
      const members = await base44.entities.User.filter({ id: channel.member_ids || [] });
      const messages = await base44.entities.Message.filter({ channel_id: selectedChannel }, '-created_date', 20);
      return { channel, members, messages };
    },
    enabled: !!selectedChannel,
    staleTime: 15000,
    refetchInterval: false,
    gcTime: 30000
  });

  // Real-time subscription for channel details (members, messages)
  useEffect(() => {
    if (!selectedChannel) return;

    const messageUnsub = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel_id === selectedChannel) {
        queryClient.invalidateQueries({ queryKey: ['channel-details', selectedChannel] });
      }
    });

    return () => messageUnsub?.();
  }, [selectedChannel, queryClient]);

  const muteUserMutation = useMutation({
    mutationFn: async ({ userId, duration }) => {
      await base44.entities.ChannelMute.create({
        channel_id: selectedChannel,
        user_id: userId,
        muted_until: new Date(Date.now() + duration).toISOString(),
        muted_by: user.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['channel-details', selectedChannel]);
    }
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId) => {
      await base44.entities.Channel.update(selectedChannel, {
        banned_user_ids: [...(currentChannelData?.channel?.banned_user_ids || []), userId]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['channel-details', selectedChannel]);
    }
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId) => {
      await base44.entities.Message.update(messageId, {
        is_deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['channel-details', selectedChannel]);
    }
  });

  const deleteChannelMutation = useMutation({
    mutationFn: async (channelId) => {
      await base44.entities.Channel.delete(channelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['text-channels', user?.id]);
      setSelectedChannel(null);
    }
  });

  const createChannelMutation = useMutation({
    mutationFn: async (name) => {
      await base44.entities.Channel.create({
        name,
        created_by: user.id,
        member_ids: [user.id],
        is_private: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['text-channels', user?.id]);
    }
  });

  if (!user) return null;

  const filteredChannels = channels.filter(ch => 
    ch.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isMinimized) {
    return (
      <div className="bg-zinc-950 border-t border-zinc-800 flex items-center px-2.5 py-1.5 shrink-0 w-full h-auto">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-1.5 hover:text-[#ea580c] transition-colors group"
        >
          <ChevronUp className="w-3 h-3 text-zinc-500 group-hover:text-[#ea580c] transition-transform rotate-180" />
          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 tracking-wider">MESSAGING</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border-t border-zinc-800 flex flex-col shrink-0 overflow-hidden w-full h-64">
      {/* Header Bar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-950 border-b border-zinc-800/50 shrink-0">
        <button
          onClick={() => setIsMinimized(true)}
          className="flex items-center gap-1.5 hover:text-[#ea580c] transition-colors group"
        >
          <ChevronUp className="w-3 h-3 text-zinc-500 group-hover:text-[#ea580c] transition-transform" />
          <span className="text-[10px] font-mono text-zinc-400 group-hover:text-zinc-200 tracking-wider">MESSAGING</span>
        </button>

        {selectedChannel && (
          <div className="flex items-center gap-1 ml-auto">
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-5 h-5"
              onClick={() => setActivePanel(activePanel === 'members' ? null : 'members')}
              title="Members"
            >
              <Users className="w-3 h-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-5 h-5"
              onClick={() => setActivePanel(activePanel === 'moderation' ? null : 'moderation')}
              title="Moderation"
            >
              <Shield className="w-3 h-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="w-5 h-5"
              onClick={() => setActivePanel(activePanel === 'settings' ? null : 'settings')}
              title="Channel Settings"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {(
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden flex-1 flex"
          >
            {/* Left: Channels */}
            <div className="w-40 border-r border-zinc-800 flex flex-col bg-zinc-900/30">
              <div className="px-2 py-1.5 border-b border-zinc-800/30">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-800 text-[9px] px-2 py-1 rounded text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#ea580c]"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-0.5 p-2">
                {filteredChannels.length === 0 ? (
                  <p className="text-[9px] text-zinc-600 italic">No channels</p>
                ) : (
                  filteredChannels.map(channel => (
                    <button
                      key={channel.id}
                      onClick={() => setSelectedChannel(channel.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowChannelMenu(channel.id);
                      }}
                      className={cn(
                        'w-full flex items-center gap-1.5 px-2 py-1.5 text-[9px] font-mono rounded transition-all relative group',
                        selectedChannel === channel.id
                          ? 'bg-[#ea580c]/20 text-[#ea580c] border-l-2 border-[#ea580c]'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/30'
                      )}
                    >
                      {channel.is_private ? <Lock className="w-2.5 h-2.5 shrink-0" /> : <Hash className="w-2.5 h-2.5 shrink-0" />}
                      <span className="truncate flex-1">{channel.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowChannelMenu(showChannelMenu === channel.id ? null : channel.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-2.5 h-2.5" />
                      </button>

                      {/* Channel Context Menu */}
                      {showChannelMenu === channel.id && (
                        <div className="absolute left-full top-0 bg-zinc-900 border border-zinc-700 rounded ml-1 w-32 z-10 shadow-lg">
                          <button
                            onClick={() => {
                              deleteChannelMutation.mutate(channel.id);
                              setShowChannelMenu(null);
                            }}
                            className="w-full px-2 py-1 text-[9px] text-red-400 hover:bg-red-900/20 text-left flex items-center gap-1"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            Delete
                          </button>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="border-t border-zinc-800 p-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-6 text-[9px] gap-1"
                  onClick={() => {
                    const name = prompt('Channel name:');
                    if (name) createChannelMutation.mutate(name);
                  }}
                >
                  <Plus className="w-2.5 h-2.5" />
                  New
                </Button>
              </div>
            </div>

            {/* Right: Channel Details & Management */}
            {selectedChannel && currentChannelData ? (
              <div className="flex-1 flex flex-col bg-zinc-900/50 border-l border-zinc-800">
                {/* Channel Header */}
                <div className="px-3 py-2 border-b border-zinc-800/50 shrink-0">
                  <div className="flex items-center gap-2">
                    {currentChannelData.channel.is_private ? <Lock className="w-3 h-3" /> : <Hash className="w-3 h-3" />}
                    <span className="text-[10px] font-bold text-zinc-200">{currentChannelData.channel.name}</span>
                    {currentChannelData.channel.topic && (
                      <span className="text-[8px] text-zinc-500 ml-auto">{currentChannelData.channel.topic}</span>
                    )}
                  </div>
                </div>

                {/* Content Panels */}
                <div className="flex-1 overflow-y-auto text-[9px] text-zinc-400 p-2 space-y-3">
                  {/* Members Panel */}
                  {activePanel === 'members' && (
                    <div className="space-y-2">
                      <p className="font-bold text-zinc-300 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Members ({currentChannelData.members.length})
                      </p>
                      <div className="space-y-1">
                        {currentChannelData.members.map(member => (
                          <div key={member.id} className="flex items-center justify-between bg-zinc-800/30 px-2 py-1 rounded hover:bg-zinc-800/50">
                            <span className="truncate">{member.full_name}</span>
                            {user.id !== member.id && (
                              <button
                                onClick={() => banUserMutation.mutate(member.id)}
                                className="text-red-500/70 hover:text-red-400 transition-colors"
                                title="Ban"
                              >
                                <UserX className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Moderation Panel */}
                  {activePanel === 'moderation' && (
                    <div className="space-y-2">
                      <p className="font-bold text-zinc-300 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Moderation
                      </p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-zinc-500 mb-1">Recent Messages</p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {currentChannelData.messages.slice(0, 10).map(msg => (
                              <div key={msg.id} className="bg-zinc-800/30 px-2 py-1 rounded flex items-start justify-between gap-1 hover:bg-zinc-800/50">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[8px] text-zinc-500">{msg.user_id}</p>
                                  <p className="text-[8px] text-zinc-300 truncate">{msg.content}</p>
                                </div>
                                <button
                                  onClick={() => deleteMessageMutation.mutate(msg.id)}
                                  className="text-red-500/70 hover:text-red-400 transition-colors shrink-0"
                                  title="Delete"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-zinc-500 mb-1">Muted Members</p>
                          <p className="text-[8px] text-zinc-600 italic">None</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Settings Panel */}
                  {activePanel === 'settings' && (
                    <div className="space-y-2">
                      <p className="font-bold text-zinc-300 flex items-center gap-1">
                        <Settings className="w-3 h-3" />
                        Channel Settings
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-zinc-800/30 px-2 py-1.5 rounded">
                          <span>Private</span>
                          <input type="checkbox" defaultChecked={currentChannelData.channel.is_private} className="w-3 h-3" />
                        </div>
                        <div className="flex items-center justify-between bg-zinc-800/30 px-2 py-1.5 rounded">
                          <span>Notifications</span>
                          <input type="checkbox" defaultChecked className="w-3 h-3" />
                        </div>
                        <div className="flex items-center justify-between bg-zinc-800/30 px-2 py-1.5 rounded">
                          <span>Mute @everyone</span>
                          <input type="checkbox" className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Default: Message Preview */}
                  {!activePanel && (
                    <div>
                      <p className="font-bold text-zinc-300 mb-2">Recent Activity</p>
                      <div className="space-y-1">
                        {currentChannelData.messages.slice(0, 5).map(msg => (
                          <div key={msg.id} className="text-[8px]">
                            <p className="text-zinc-500">{msg.user_id}</p>
                            <p className="text-zinc-300 truncate">{msg.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-[10px]">
                Select a channel
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}