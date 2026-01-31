/**
 * DMChannelList — Display direct message and group chat channels
 */

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Hash, Users, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DMChannelList({ 
  currentUserId, 
  selectedChannelId, 
  onSelectChannel,
  onCreateDM,
  onCreateGroup,
  unreadCounts = {}
}) {
  const [dmChannels, setDmChannels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const loadDMs = async () => {
      try {
        const allChannels = await base44.entities.Channel.filter({ is_dm: true });
        
        // Filter to channels where current user is a participant
        const userDMs = allChannels.filter(ch => 
          ch.dm_participants?.includes(currentUserId)
        );

        // Sort by last message time
        userDMs.sort((a, b) => {
          const aTime = a.last_message_at ? new Date(a.last_message_at) : new Date(a.created_date);
          const bTime = b.last_message_at ? new Date(b.last_message_at) : new Date(b.created_date);
          return bTime - aTime;
        });

        setDmChannels(userDMs);
      } catch (error) {
        console.error('Failed to load DM channels:', error);
      }
    };

    loadDMs();

    // Subscribe to channel updates
    const unsubscribe = base44.entities.Channel.subscribe((event) => {
      if (event.type === 'create' && event.data?.is_dm && event.data?.dm_participants?.includes(currentUserId)) {
        loadDMs();
      }
      if (event.type === 'update' && event.data?.is_dm) {
        loadDMs();
      }
    });

    return () => unsubscribe();
  }, [currentUserId]);

  // Load online status for DM participants
  useEffect(() => {
    const loadOnlineStatus = async () => {
      try {
        const allPresence = await base44.entities.UserPresence.list();
        const online = new Set(
          allPresence
            .filter(p => {
              const lastActivity = new Date(p.last_activity);
              const now = new Date();
              return (now - lastActivity) < 5 * 60 * 1000; // 5 minutes
            })
            .map(p => p.user_id)
        );
        setOnlineUsers(online);
      } catch (error) {
        console.error('Failed to load online status:', error);
      }
    };

    loadOnlineStatus();
    const interval = setInterval(loadOnlineStatus, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const getDMDisplayName = (channel) => {
    if (channel.is_group_chat) {
      return channel.group_name || 'Group Chat';
    }
    
    // For 1-on-1 DM, show the other participant
    const otherUserId = channel.dm_participants?.find(id => id !== currentUserId);
    return otherUserId || 'Unknown';
  };

  const filteredChannels = dmChannels.filter(ch => 
    getDMDisplayName(ch).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header with action buttons */}
      <div className="p-2 border-b border-orange-500/10 space-y-2">
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateDM}
            className="flex-1 h-8 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            New DM
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateGroup}
            className="flex-1 h-8 text-xs"
          >
            <Users className="w-3 h-3 mr-1" />
            New Group
          </Button>
        </div>
        
        <Input
          placeholder="Search DMs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-xs bg-zinc-900/50 border-orange-500/10"
        />
      </div>

      {/* DM List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredChannels.length === 0 ? (
          <div className="text-center text-[10px] text-zinc-600 py-4">
            {searchQuery ? 'No matches' : 'No direct messages yet'}
          </div>
        ) : (
          filteredChannels.map(channel => {
            const isOnline = !channel.is_group_chat && 
              onlineUsers.has(channel.dm_participants?.find(id => id !== currentUserId));
            const unreadCount = unreadCounts[channel.id] || 0;

            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel.id)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  selectedChannelId === channel.id
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                    : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-300'
                }`}
              >
                <div className="relative flex-shrink-0">
                  {channel.is_group_chat ? (
                    <Users className="w-3 h-3 opacity-70" />
                  ) : (
                    <Hash className="w-3 h-3 opacity-70" />
                  )}
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-zinc-950" />
                  )}
                </div>
                
                <span className="truncate flex-1">{getDMDisplayName(channel)}</span>
                
                {channel.is_group_chat && (
                  <span className="text-[10px] text-zinc-600">
                    {channel.dm_participants?.length || 0}
                  </span>
                )}
                
                {unreadCount > 0 && (
                  <span className="ml-auto text-orange-400 font-semibold text-[10px] bg-orange-500/20 px-1.5 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}