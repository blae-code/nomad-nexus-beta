import { Radio } from 'lucide-react';

export default function CommandCenterWidget({ operation, user, isCommandRole, onBroadcast }) {
  if (!isCommandRole) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[8px] text-zinc-600">Command Center (restricted)</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-[9px] font-bold uppercase text-zinc-300 flex items-center gap-1.5">
        <Radio className="w-3 h-3" />
        Command Center
      </h3>

      <div className="space-y-1 flex-1">
        {/* Status */}
        <div className="px-2 py-1.5 border border-zinc-700/50 bg-zinc-900/30 text-[8px] space-y-1">
          <p className="font-mono text-zinc-400">
            STATUS: <span className="text-emerald-400 font-bold">{operation?.status}</span>
          </p>
          <p className="text-[7px] text-zinc-600">
            {operation?.started_at ? 'Op Running' : 'Op Not Started'}
          </p>
        </div>

        {/* Quick Commands */}
        <div className="space-y-1">
          <button className="w-full px-2 py-1 bg-orange-950/30 border border-orange-700/50 hover:border-orange-600 text-[8px] font-bold uppercase text-orange-300 hover:text-orange-200 transition-colors">
            📢 Broadcast
          </button>
          <button className="w-full px-2 py-1 bg-red-950/30 border border-red-700/50 hover:border-red-600 text-[8px] font-bold uppercase text-red-300 hover:text-red-200 transition-colors">
            🔴 Declare Hot
          </button>
          <button className="w-full px-2 py-1 bg-cyan-950/30 border border-cyan-700/50 hover:border-cyan-600 text-[8px] font-bold uppercase text-cyan-300 hover:text-cyan-200 transition-colors">
            🎯 Retask Squad
          </button>
        </div>
      </div>
    </div>
  );
}