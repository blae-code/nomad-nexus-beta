import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Zap, Inbox, X, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import CommsDockCommsTab from './tabs/CommsDockCommsTab';
import CommsDockPollsTab from './tabs/CommsDockPollsTab';
import CommsDockRiggsyTab from './tabs/CommsDockRiggsyTab';
import CommsDockInboxTab from './tabs/CommsDockInboxTab';

const TABS = [
  { id: 'comms', label: 'COMMS', icon: MessageSquare },
  { id: 'polls', label: 'POLLS', icon: Send },
  { id: 'riggsy', label: 'RIGGSY', icon: Zap },
  { id: 'inbox', label: 'INBOX', icon: Inbox }
];

export default function CommsDockShell({ user, defaultTab = 'comms' }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [unreadCounts, setUnreadCounts] = useState({});
  const queryClient = useQueryClient();

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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && isExpanded) {
      setIsExpanded(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  return (
    <>
      {/* Dock Trigger Button (Fixed) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 hover:border-[#ea580c] text-[9px] font-bold uppercase text-zinc-400 hover:text-[#ea580c] transition-all rounded-none"
          title="Open Comms Dock (Cmd+K then 'dock')"
        >
          <MessageSquare className="w-3 h-3" />
          DOCK
          {totalUnread > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-950/60 border border-red-700/60 text-red-300 text-[7px] font-bold">
              {totalUnread}
            </span>
          )}
        </button>
      )}

      {/* Dock Panel (Expanded) */}
      {isExpanded && (
        <div className="fixed bottom-0 right-0 z-40 w-96 h-3/4 bg-zinc-950 border border-zinc-800 border-b-0 rounded-t-none flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
            <h2 className="text-[10px] font-bold uppercase text-zinc-300">COMMS DOCK</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-zinc-600 hover:text-zinc-400 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-2 py-1.5 border-b border-zinc-800 shrink-0 bg-zinc-950/60">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-2 py-1 text-[8px] font-bold uppercase border rounded-none transition-all flex items-center gap-1',
                    activeTab === tab.id
                      ? 'bg-zinc-800 border-[#ea580c] text-[#ea580c]'
                      : 'bg-zinc-900/50 border-zinc-700 text-zinc-500 hover:border-zinc-600'
                  )}
                >
                  <Icon className="w-2.5 h-2.5" />
                  {tab.label}
                  {tab.id === 'inbox' && unreadCounts[tab.id] > 0 && (
                    <span className="ml-0.5 text-[7px] px-1 py-0 bg-red-950/60 text-red-300">
                      {unreadCounts[tab.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'comms' && <CommsDockCommsTab user={user} />}
            {activeTab === 'polls' && <CommsDockPollsTab user={user} />}
            {activeTab === 'riggsy' && <CommsDockRiggsyTab user={user} />}
            {activeTab === 'inbox' && <CommsDockInboxTab user={user} />}
          </div>

          {/* Footer Hint */}
          <div className="px-2 py-1 border-t border-zinc-800 text-[8px] text-zinc-600 shrink-0">
            Press <span className="font-mono bg-zinc-800 px-1">Esc</span> to close
          </div>
        </div>
      )}
    </>
  );
}