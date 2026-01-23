import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Zap, Inbox, X, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommsDockCommsTab from './tabs/CommsDockCommsTab';
import CommsDockPollsTab from './tabs/CommsDockPollsTab';
import CommsDockRiggsyTab from './tabs/CommsDockRiggsyTab';
import CommsDockInboxTab from './tabs/CommsDockInboxTab';
import CommsDockDebugPanel from './CommsDockDebugPanel';
// DEPRECATED: useVoiceRoom disabled in dock (2026-01-23)
// Voice joining is now canonical via CommsConsole + ActiveNetPanel only
// import { useVoiceRoom } from './useVoiceRoom';

const TABS = [
  { id: 'comms', label: 'COMMS', icon: MessageSquare },
  { id: 'polls', label: 'POLLS', icon: Send },
  { id: 'riggsy', label: 'RIGGSY', icon: Zap },
  { id: 'inbox', label: 'INBOX', icon: Inbox }
];

export default function CommsDockShell({ user, defaultTab = 'comms' }) {
  const [isMinimized, setIsMinimized] = useState(true);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [unreadCounts, setUnreadCounts] = useState({});
  const queryClient = useQueryClient();
  const voiceRoom = useVoiceRoom('org-command', user?.id || 'guest');

  // Fetch unread counts
  const { data: readStates = [] } = useQuery({
    queryKey: ['comms-read-states', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.CommsReadState.filter(
        { user_id: user.id },
        '-last_read_at',
        50
      );
    },
    staleTime: 10000,
    enabled: !!user?.id
  });

  useEffect(() => {
    const counts = {};
    readStates.forEach(rs => {
      counts[rs.channel_id] = rs.unread_count || 0;
    });
    setUnreadCounts(counts);
  }, [readStates]);

  // Subscribe to new posts
  useEffect(() => {
    if (!user?.id) return;

    const unsubPosts = base44.entities.CommsPost.subscribe((event) => {
      if (event.type === 'create') {
        queryClient.invalidateQueries({ queryKey: ['comms-read-states'] });
        queryClient.invalidateQueries({ queryKey: ['comms-channels'] });
      }
    });

    return () => unsubPosts?.();
  }, [user?.id, queryClient]);

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-zinc-950 via-zinc-950 to-zinc-900/95 border-t border-zinc-800/80 shadow-2xl">
      {/* Minimized Footer Bar */}
      <div className="flex items-center justify-between px-4 py-2 h-12">
        {/* Left: Status & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
            Comms Array
          </h3>
        </div>

        {/* Center: Quick Tab Indicators */}
        <div className="flex gap-1 flex-1 justify-center">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const count = unreadCounts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => setIsMinimized(false) || setActiveTab(tab.id)}
                className={cn(
                  'relative px-2 py-1 text-[8px] font-semibold uppercase transition-all rounded-sm border',
                  activeTab === tab.id && !isMinimized
                    ? 'bg-[#ea580c]/20 border-[#ea580c] text-[#ea580c]'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                )}
              >
                <Icon className="w-2.5 h-2.5" />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 bg-red-600 text-white text-[7px] font-bold rounded-full">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Minimize/Maximize Button */}
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors ml-auto"
          title={isMinimized ? 'Maximize (↑)' : 'Minimize (↓)'}
        >
          <ChevronUp className={cn('w-4 h-4 transition-transform', !isMinimized && 'rotate-180')} />
        </button>
      </div>

      {/* Expanded Content Panel */}
      {!isMinimized && (
        <div className="border-t border-zinc-800/60 bg-zinc-950/50 backdrop-blur-sm">
          {/* Expanded Tabs */}
          <div className="flex gap-1 px-4 py-2 border-b border-zinc-800/40 shrink-0 bg-zinc-950/30">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-3 py-1.5 text-[9px] font-bold uppercase border rounded-sm transition-all flex items-center gap-1.5',
                    activeTab === tab.id
                      ? 'bg-[#ea580c]/30 border-[#ea580c] text-[#ea580c]'
                      : 'bg-zinc-800/40 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/60'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="h-64 overflow-hidden bg-zinc-950/40">
            {activeTab === 'comms' && <CommsDockCommsTab user={user} />}
            {activeTab === 'polls' && <CommsDockPollsTab user={user} />}
            {activeTab === 'riggsy' && <CommsDockRiggsyTab user={user} />}
            {activeTab === 'inbox' && <CommsDockInboxTab user={user} />}
          </div>

          {/* Debug Panel (Admin Only) */}
          {user?.role === 'admin' && <CommsDockDebugPanel debug={voiceRoom.debug} user={user} />}
        </div>
      )}
    </div>
  );
}