import React from 'react';

export default function OpsCommsPanel({ session, user, isCommandRole }) {
  const comms = session?.brief_artifact?.comms_plan || {};

  return (
    <div className="space-y-2 p-2 text-[8px]">
      <div className="border border-zinc-800 bg-zinc-900/30 p-2">
        <p className="text-zinc-500 uppercase font-mono mb-1">Primary</p>
        <p className="text-zinc-300 font-bold">{comms.primary_net || 'Not assigned'}</p>
      </div>

      {comms.secondary_nets?.length > 0 && (
        <div className="border border-zinc-800 bg-zinc-900/30 p-2">
          <p className="text-zinc-500 uppercase font-mono mb-1">Secondary ({comms.secondary_nets.length})</p>
          <div className="space-y-1">
            {comms.secondary_nets.map((net, idx) => (
              <p key={idx} className="text-zinc-400">{net}</p>
            ))}
          </div>
        </div>
      )}

      {isCommandRole && (
        <div className="border border-zinc-800/50 bg-zinc-900/20 p-2 mt-3 pt-3">
          <p className="text-zinc-600 uppercase font-mono text-[7px] mb-2">Command Actions</p>
          <button className="w-full px-2 py-1.5 bg-red-950/40 border border-red-700/30 text-red-300 text-[7px] font-mono hover:bg-red-950/60">
            BROADCAST COMMAND
          </button>
        </div>
      )}
    </div>
  );
}