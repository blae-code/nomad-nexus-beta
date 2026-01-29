import React, { useState } from 'react';
import { X, Minimize2, MessageSquare, Users, Hash, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useCurrentUser } from '@/components/useCurrentUser';

export default function TextCommsDock({ isOpen, onClose }) {
  const [isMinimized, setIsMinimized] = useState(false);
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
            onClick={() => setIsMinimized(!isMinimized)}
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

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stats */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Unread</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Comms</div>
                <div className="text-lg font-bold text-orange-400">{unreadByTab?.comms || 0}</div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Events</div>
                <div className="text-lg font-bold text-orange-400">{unreadByTab?.events || 0}</div>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center">
                <div className="text-xs text-zinc-500 mb-1">Riggsy</div>
                <div className="text-lg font-bold text-orange-400">{unreadByTab?.riggsy || 0}</div>
              </div>
            </div>
          </div>

          {/* Channels Placeholder */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Recent Channels</h4>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg max-h-32 overflow-y-auto">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 text-sm text-zinc-500">
                <Hash className="w-3 h-3" />
                <span className="text-xs">general</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
                <Hash className="w-3 h-3" />
                <span className="text-xs">announcements</span>
              </div>
            </div>
          </div>

          {/* Notifications Placeholder */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Mentions</h4>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 text-center text-zinc-500">
              <Bell className="w-5 h-5 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No recent mentions</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}