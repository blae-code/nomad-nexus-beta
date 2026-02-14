import React from 'react';
import { Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';

export default function MemberRosterWidget({ widgetId, config, onRemove, isDragging }) {
  const { online, idle, away } = usePresenceRoster();

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Roster</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <div>
            <div className="text-xs text-zinc-500 mb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Online ({online.length})
            </div>
            <div className="space-y-1">
              {online.slice(0, 8).map((member) => (
                <div key={member.member_profile_id} className="text-xs text-zinc-300">
                  {member.callsign || 'Unknown'}
                </div>
              ))}
            </div>
          </div>

          {idle.length > 0 && (
            <div>
              <div className="text-xs text-zinc-500 mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                Idle ({idle.length})
              </div>
              <div className="space-y-1">
                {idle.slice(0, 4).map((member) => (
                  <div key={member.member_profile_id} className="text-xs text-zinc-400">
                    {member.callsign || 'Unknown'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}