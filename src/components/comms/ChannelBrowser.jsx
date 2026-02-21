import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Hash, Volume2, Lock, Globe, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ChannelBrowser({
  channels = [],
  categories = [],
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onEditChannel,
  onDeleteChannel,
  onMoveChannel,
}) {
  const [expandedCategories, setExpandedCategories] = useState(new Set(['default']));
  const [draggedChannel, setDraggedChannel] = useState(null);

  const channelsByCategory = useMemo(() => {
    const grouped = {};
    categories.forEach(cat => {
      grouped[cat.id] = [];
    });
    grouped['uncategorized'] = [];

    channels.forEach(channel => {
      const categoryId = channel.category_id || 'uncategorized';
      if (grouped[categoryId]) {
        grouped[categoryId].push(channel);
      } else {
        grouped['uncategorized'].push(channel);
      }
    });

    return grouped;
  }, [channels, categories]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleDragStart = (channel) => {
    setDraggedChannel(channel);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (categoryId) => {
    if (draggedChannel && draggedChannel.category_id !== categoryId) {
      onMoveChannel?.(draggedChannel.id, categoryId);
    }
    setDraggedChannel(null);
  };

  const getChannelIcon = (channel) => {
    if (channel.type === 'voice') return <Volume2 className="w-3.5 h-3.5" />;
    return <Hash className="w-3.5 h-3.5" />;
  };

  const getChannelStatusIcon = (channel) => {
    if (channel.is_private) return <Lock className="w-3 h-3 text-zinc-500" />;
    if (channel.is_public) return <Globe className="w-3 h-3 text-zinc-500" />;
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-zinc-950/95 border border-zinc-800/60">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Channels</h3>
          <button
            onClick={onCreateChannel}
            className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide rounded bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 transition-colors"
          >
            + New
          </button>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto">
        {[...categories, { id: 'uncategorized', name: 'Other Channels', order: 999 }]
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map(category => {
            const categoryChannels = channelsByCategory[category.id] || [];
            if (categoryChannels.length === 0 && category.id !== 'uncategorized') return null;

            const isExpanded = expandedCategories.has(category.id);

            return (
              <div key={category.id} className="border-b border-zinc-800/40">
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(category.id)}
                  className="w-full px-3 py-2 flex items-center gap-2 hover:bg-zinc-900/50 transition-colors group"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 group-hover:text-zinc-300">
                    {category.name}
                  </span>
                  <span className="ml-auto text-[10px] text-zinc-600">{categoryChannels.length}</span>
                </button>

                {/* Channels in Category */}
                {isExpanded && (
                  <div className="bg-zinc-950/40">
                    {categoryChannels.map(channel => (
                      <div
                        key={channel.id}
                        draggable
                        onDragStart={() => handleDragStart(channel)}
                        onClick={() => onSelectChannel?.(channel)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onEditChannel?.(channel);
                        }}
                        className={cn(
                          'px-4 py-2 flex items-center gap-2.5 cursor-pointer transition-all group',
                          activeChannelId === channel.id
                            ? 'bg-zinc-800/80 border-l-2 border-orange-500/80'
                            : 'hover:bg-zinc-900/60 border-l-2 border-transparent'
                        )}
                      >
                        <div className={cn(
                          'transition-colors',
                          activeChannelId === channel.id ? 'text-orange-400' : 'text-zinc-500 group-hover:text-zinc-400'
                        )}>
                          {getChannelIcon(channel)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              'text-xs truncate',
                              activeChannelId === channel.id ? 'text-zinc-200 font-medium' : 'text-zinc-400 group-hover:text-zinc-300'
                            )}>
                              {channel.name}
                            </span>
                            {getChannelStatusIcon(channel)}
                          </div>
                          {channel.description && (
                            <p className="text-[10px] text-zinc-600 truncate">{channel.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {channel.type === 'voice' && channel.active_count > 0 && (
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                              <span className="text-[10px] font-medium text-emerald-400">
                                {channel.active_count}
                              </span>
                            </div>
                          )}
                          {channel.unread_count > 0 && (
                            <div className="px-1.5 py-0.5 rounded-full bg-orange-500/90 text-[9px] font-bold text-white">
                              {channel.unread_count > 99 ? '99+' : channel.unread_count}
                            </div>
                          )}
                          {channel.member_count > 0 && (
                            <div className="flex items-center gap-1 text-zinc-600">
                              <Users className="w-3 h-3" />
                              <span className="text-[10px]">{channel.member_count}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}