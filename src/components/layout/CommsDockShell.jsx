/**
 * CommsDockShell — Bottom tabbed comms dock
 * Provides: Comms (real), Polls (stub), Riggsy (stub), Inbox (stub)
 */

import React, { useEffect } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import CommsTab from '@/components/comms/CommsTab';
import { seedDemoMessages } from '@/components/services/commsService';
import { X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TAB_ITEMS = [
  { id: 'comms', label: 'Comms', icon: '💬' },
  { id: 'polls', label: 'Polls', icon: '📊' },
  { id: 'riggsy', label: 'Riggsy', icon: '🤖' },
  { id: 'inbox', label: 'Inbox', icon: '📬' },
];

export default function CommsDockShell({ isOpen, onClose }) {
  const { user } = useCurrentUser();
  const [activeTab, setActiveTab] = React.useState('comms');
  const { channels, unreadByTab, unreadByChannel, markChannelRead, refreshUnreadCounts, loading } =
    useUnreadCounts(user?.id);

  // Seed demo messages on first load
  useEffect(() => {
    seedDemoMessages();
    refreshUnreadCounts();
  }, [refreshUnreadCounts]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 bg-zinc-900/95 border-t border-zinc-800 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
        {/* Tab strip */}
        <div className="flex gap-2">
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t transition-colors flex items-center gap-1 ${
                activeTab === tab.id
                  ? 'bg-zinc-800 text-orange-400'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {unreadByTab[tab.id] > 0 && (
                <span className="ml-1 h-5 w-5 bg-orange-600 text-white text-xs rounded-full flex items-center justify-center">
                  {unreadByTab[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {}}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-300"
            title="Minimize (stub)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-zinc-400 hover:text-red-400"
            title="Close dock"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'comms' && (
          <CommsTab
            user={user}
            channels={channels}
            unreadCounts={unreadByChannel}
            onMarkChannelRead={markChannelRead}
          />
        )}

        {activeTab === 'polls' && (
          <div className="p-4 text-xs text-zinc-500">Polls — Coming in Phase 2C</div>
        )}

        {activeTab === 'riggsy' && (
          <div className="p-4 text-xs text-zinc-500">Riggsy AI — Coming in Phase 2C</div>
        )}

        {activeTab === 'inbox' && (
          <div className="p-4 text-xs text-zinc-500">Inbox — Coming in Phase 2C</div>
        )}
      </div>
    </div>
  );
}