/**
 * CommsDockShell — Bottom tabbed comms dock
 * Provides: Comms (real), Polls (stub), Riggsy (stub), Inbox (stub)
 */

import React, { useEffect } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useShellUI } from '@/components/providers/ShellUIContext';
import CommsTabEnhanced from '@/components/comms/CommsTabEnhanced';
import { seedDemoMessages } from '@/components/services/commsService';
import { X, Minimize2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TAB_ITEMS = [
  { id: 'comms', label: 'Comms', icon: MessageSquare },
  { id: 'polls', label: 'Polls', icon: null },
  { id: 'riggsy', label: 'Riggsy', icon: null },
  { id: 'inbox', label: 'Inbox', icon: null },
];

export default function CommsDockShell({ isOpen, onClose }) {
  const { user } = useCurrentUser();
  const { isContextPanelOpen } = useShellUI();
  const [activeTab, setActiveTab] = React.useState('comms');
  const [isMinimized, setIsMinimized] = React.useState(true);
  const [dockHeight, setDockHeight] = React.useState(384); // h-96 default
  const [isDragging, setIsDragging] = React.useState(false);
  const { channels, unreadByTab, unreadByChannel, markChannelRead, refreshUnreadCounts, loading } =
    useUnreadCounts(user?.id);

  // Load saved height on mount
  useEffect(() => {
    const saved = localStorage.getItem('nexus.dock.height');
    if (saved) setDockHeight(parseInt(saved, 10));
  }, []);

  // Handle resize drag
  useEffect(() => {
    if (!isDragging) return;
    
    const handleMouseMove = (e) => {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight >= 200 && newHeight <= 600) {
        setDockHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('nexus.dock.height', dockHeight.toString());
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dockHeight]);

  // Seed demo messages on first load
  useEffect(() => {
    seedDemoMessages();
    refreshUnreadCounts();
  }, [refreshUnreadCounts]);

  if (!isOpen) return null;

  return (
    <div 
      className="bg-zinc-950 border-t-2 border-orange-500/30 backdrop-blur-sm flex flex-col group flex-shrink-0" 
      style={{ 
        height: `${dockHeight}px`
      }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={() => setIsDragging(true)}
        className="h-1 bg-gradient-to-r from-transparent via-orange-500/30 to-transparent cursor-ns-resize hover:via-orange-500/60 transition-colors group-hover:h-1.5"
      />
      {/* Header */}
      <div className="border-b border-orange-500/20 px-6 py-3 flex items-center justify-between bg-zinc-950/80">
        {/* Tab strip */}
        <div className="flex gap-1">
          {TAB_ITEMS.map((tab) => {
            const TabIcon = tab.icon;
            return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/40'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
              }`}
            >
              {TabIcon && <TabIcon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {unreadByTab[tab.id] > 0 && (
                <span className="ml-1 h-5 w-5 bg-orange-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadByTab[tab.id]}
                </span>
              )}
            </button>
          );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {}}
            className="h-8 w-8 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            title="Close dock"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'comms' && (
          <CommsTabEnhanced
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