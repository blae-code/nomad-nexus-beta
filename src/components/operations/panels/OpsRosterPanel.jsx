import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OpsRosterPanel({
  session,
  user,
  isCommandRole,
  isRescueLead
}) {
  const assignments = session?.brief_artifact?.squads_assignments || [];

  const statuses = {
    READY: 'bg-emerald-950/30 text-emerald-300 border-emerald-700/50',
    ENGAGED: 'bg-yellow-950/30 text-yellow-300 border-yellow-700/50',
    DOWN: 'bg-red-950/30 text-red-300 border-red-700/50',
    OFFLINE: 'bg-zinc-800/30 text-zinc-500 border-zinc-700/50'
  };

  return (
    <div className="p-3 space-y-2 text-[8px]">
      <p className="font-bold text-zinc-400 uppercase">
        Squad Roster ({assignments.length})
      </p>

      {assignments.length === 0 ? (
        <p className="text-zinc-600 italic py-4 text-center">No squads assigned</p>
      ) : (
        <div className="space-y-1">
          {assignments.map((assign, idx) => (
            <div
              key={idx}
              className="px-2 py-1.5 bg-zinc-900/30 border border-zinc-800 rounded-none space-y-0.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-300">
                  {assign.squad_id}
                </span>
                <span className="text-[7px] text-zinc-600">{assign.role}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[7px] text-zinc-600">READY</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isRescueLead && (
        <div className="pt-2 border-t border-zinc-800 space-y-1">
          <p className="font-bold text-zinc-400 uppercase">Rescue Actions</p>
          <button className="w-full px-2 py-1 bg-red-950/20 hover:bg-red-950/30 border border-red-700/50 text-red-300 text-[8px] font-bold uppercase transition-colors rounded-none">
            DISTRESS ALERT
          </button>
        </div>
      )}
    </div>
  );
}