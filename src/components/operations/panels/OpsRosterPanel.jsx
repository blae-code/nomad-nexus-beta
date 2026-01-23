import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function OpsRosterPanel({ session, user, isCommandRole, isRescueLead }) {
  const squads = session?.brief_artifact?.squads_assignments || [];

  return (
    <div className="space-y-2 p-2 text-[8px]">
      {squads.length === 0 ? (
        <p className="text-zinc-600 italic py-2">No squads assigned</p>
      ) : (
        squads.map((squad, idx) => (
          <div key={idx} className="border border-zinc-800 bg-zinc-900/30 p-2">
            <p className="text-zinc-300 font-bold mb-1">{squad.squad_name}</p>
            <p className="text-zinc-500 text-[7px]">
              {squad.assigned_users?.length || 0} personnel assigned
            </p>

            {(isCommandRole || isRescueLead) && (
              <button className="w-full mt-1.5 px-1.5 py-1 bg-zinc-800/40 border border-zinc-700 text-zinc-400 text-[7px] hover:text-zinc-300">
                UPDATE STATUS
              </button>
            )}
          </div>
        ))
      )}

      {isRescueLead && (
        <div className="border border-red-800/50 bg-red-950/20 p-2 mt-3">
          <div className="flex gap-1 text-red-400 mb-1">
            <AlertTriangle className="w-3 h-3 shrink-0" />
            <span className="font-mono text-[7px]">DISTRESS</span>
          </div>
          <button className="w-full px-1.5 py-1 bg-red-950/40 border border-red-700/30 text-red-300 text-[7px] hover:bg-red-950/60">
            DISPATCH RESCUE
          </button>
        </div>
      )}
    </div>
  );
}