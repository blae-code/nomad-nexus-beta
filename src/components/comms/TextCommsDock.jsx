import React, { useState } from 'react';
import { X, Minimize2, MessageSquare, Users, Hash, Bell, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useCurrentUser } from '@/components/useCurrentUser';
import { base44 } from '@/api/base44Client';

export default function TextCommsDock({ isOpen, onClose, isMinimized, onMinimize }) {
  const [activeTab, setActiveTab] = useState('comms');
  const { user } = useCurrentUser();
  const { unreadByTab } = useUnreadCounts(user?.id);

  if (!isOpen) return null;

  return (
    <div className="bg-zinc-950 border-t border-orange-500/30 flex flex-col h-96 flex-shrink-0">
      {/* Header */}
      <div className="border-b border-orange-500/20 px-6 py-3 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-orange-500" />
          <h3 className="text-xs font-bold uppercase text-orange-400 tracking-widest">Text Comms</h3>
        </div>
        <div className="flex gap-2">
          <Button
           size="icon"
           variant="ghost"
           onClick={() => onMinimize?.(!isMinimized)}
           className="h-8 w-8 text-zinc-500 hover:text-orange-400"
          >
           <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {!isMinimized && (
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 flex-shrink-0">
          {['comms', 'events', 'riggsy', 'inbox'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 text-xs font-semibold uppercase px-3 py-2 transition-all ${
                activeTab === tab
                  ? 'text-orange-400 border-b-2 border-orange-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab === 'comms' && (
                <>Comms {unreadByTab?.comms > 0 && <span className="ml-1 text-orange-400">({unreadByTab.comms})</span>}</>
              )}
              {tab === 'events' && (
                <>Events {unreadByTab?.events > 0 && <span className="ml-1 text-orange-400">({unreadByTab.events})</span>}</>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'comms' && (
            <>
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Recent Channels</h4>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg max-h-40 overflow-y-auto">
                <button className="w-full text-left flex items-center gap-2 px-3 py-2 border-b border-zinc-800 hover:bg-zinc-800 transition-colors">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  <span className="text-xs text-zinc-300">general</span>
                  <span className="ml-auto text-[10px] text-orange-400">2</span>
                </button>
                <button className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 transition-colors">
                  <Hash className="w-3 h-3 text-zinc-500" />
                  <span className="text-xs text-zinc-300">announcements</span>
                </button>
              </div>
              <Input
                placeholder="Search channels..."
                className="h-8 text-xs bg-zinc-900/50 border-zinc-800"
              />
            </>
          )}
          {activeTab === 'events' && (
            <div className="text-center py-4 text-zinc-500">
              <p className="text-xs">Event notifications appear here</p>
            </div>
          )}
          {activeTab === 'riggsy' && (
            <div className="text-center py-4 text-zinc-500">
              <p className="text-xs">AI assistant messages appear here</p>
            </div>
          )}
          {activeTab === 'inbox' && (
            <div className="text-center py-4 text-zinc-500">
              <p className="text-xs">Private messages appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}