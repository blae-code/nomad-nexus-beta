/**
 * CommsTabEnhanced — Rich comms experience with channels, threads, mentions, groups
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Users, AtSign, Zap, ChevronDown, MessageCircle, Pin, Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ChannelList from './ChannelList';
import ThreadView from './ThreadView';
import MentionsView from './MentionsView';
import GroupsView from './GroupsView';

const COMMS_VIEWS = [
  { id: 'channels', label: 'Channels', icon: MessageSquare },
  { id: 'threads', label: 'Threads', icon: MessageCircle },
  { id: 'mentions', label: 'Mentions', icon: AtSign },
  { id: 'groups', label: 'Groups', icon: Users },
];

export default function CommsTabEnhanced({ user, channels = [], unreadCounts = {}, onMarkChannelRead = () => {} }) {
  const [activeView, setActiveView] = useState('channels');
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedChannels, setExpandedChannels] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus.comms.expanded');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleChannelExpanded = (channelId) => {
    setExpandedChannels((prev) => {
      const updated = { ...prev, [channelId]: !prev[channelId] };
      localStorage.setItem('nexus.comms.expanded', JSON.stringify(updated));
      return updated;
    });
  };

  const Icon = COMMS_VIEWS.find(v => v.id === activeView)?.icon || MessageSquare;
  const totalUnread = Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Comms Header */}
      <div className="px-3 py-2 border-b border-zinc-700/50 bg-gradient-to-r from-zinc-900/50 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-black uppercase text-orange-300 tracking-wide">{activeView}</span>
            {totalUnread > 0 && (
              <span className="ml-auto h-5 w-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {totalUnread}
              </span>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1.5 w-3 h-3 text-zinc-500" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs bg-zinc-800/50 border-zinc-700/50"
          />
        </div>

        {/* View Buttons */}
        <div className="flex gap-1 flex-wrap">
          {COMMS_VIEWS.map((view) => {
            const ViewIcon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => {
                  setActiveView(view.id);
                  setSelectedChannel(null);
                }}
                className={`flex-1 min-w-max px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded transition-colors ${
                  activeView === view.id
                    ? 'bg-orange-600/80 text-white'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <ViewIcon className="w-3 h-3 inline mr-1" />
                {view.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeView === 'channels' && (
          <ChannelListCompact
            channels={channels}
            unreadCounts={unreadCounts}
            selectedChannel={selectedChannel}
            onSelectChannel={setSelectedChannel}
            onMarkRead={onMarkChannelRead}
            expandedChannels={expandedChannels}
            onToggleExpanded={toggleChannelExpanded}
            searchQuery={searchQuery}
          />
        )}

        {activeView === 'threads' && <ThreadView user={user} searchQuery={searchQuery} />}
        {activeView === 'mentions' && <MentionsView user={user} searchQuery={searchQuery} />}
        {activeView === 'groups' && <GroupsView user={user} searchQuery={searchQuery} />}
      </div>
    </div>
  );
}

function ChannelListCompact({ channels, unreadCounts, selectedChannel, onSelectChannel, onMarkRead, expandedChannels, onToggleExpanded, searchQuery }) {
  const filtered = channels.filter(ch => ch.name?.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!filtered.length) {
    return <div className="p-3 text-xs text-zinc-500 text-center">No channels found</div>;
  }

  return (
    <div className="space-y-1 p-2">
      {filtered.map((channel) => (
        <div key={channel.id} className="space-y-0.5">
          <button
            onClick={() => onSelectChannel(channel.id === selectedChannel ? null : channel.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all flex items-center gap-2 ${
              selectedChannel === channel.id
                ? 'bg-orange-500/20 border-l-2 border-orange-500 text-orange-200'
                : 'bg-zinc-800/40 hover:bg-zinc-800/60 text-zinc-300'
            }`}
          >
            <MessageSquare className="w-3 h-3 flex-shrink-0" />
            <span className="font-semibold flex-1 truncate">#{channel.name}</span>
            {unreadCounts?.[channel.id] > 0 && (
              <span className="h-4 w-4 bg-red-600 text-white text-[10px] rounded-full flex items-center justify-center flex-shrink-0">
                {unreadCounts[channel.id]}
              </span>
            )}
          </button>

          {/* Expanded channel details */}
          {selectedChannel === channel.id && expandedChannels[channel.id] && (
            <div className="ml-4 space-y-1 text-[10px] text-zinc-500">
              <div className="px-2 py-1 bg-zinc-800/30 rounded">
                <div className="font-mono text-zinc-400">{channel.description || 'No description'}</div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}