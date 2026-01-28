import { Radio } from 'lucide-react';

export default function OpsCommsPanel({ session, user, isCommandRole }) {
  const primaryNet = session?.brief_artifact?.comms_plan?.primary_net;
  const secondaryNets = session?.brief_artifact?.comms_plan?.secondary_nets || [];

  return (
    <div className="p-3 space-y-2 text-[8px]">
      <div>
        <p className="font-bold text-zinc-400 uppercase mb-1">Primary Net</p>
        {primaryNet ? (
          <div className="px-2 py-1 bg-emerald-950/30 border border-emerald-700/50 text-emerald-300 rounded-none">
            <div className="flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              <span className="font-mono">{primaryNet}</span>
            </div>
          </div>
        ) : (
          <p className="text-zinc-600 italic">No primary net configured</p>
        )}
      </div>

      {secondaryNets.length > 0 && (
        <div>
          <p className="font-bold text-zinc-400 uppercase mb-1">Secondary Nets</p>
          <div className="space-y-1">
            {secondaryNets.map((netId, idx) => (
              <div
                key={idx}
                className="px-2 py-1 bg-zinc-900/30 border border-zinc-800 text-zinc-400 rounded-none text-[7px]"
              >
                {netId}
              </div>
            ))}
          </div>
        </div>
      )}

      {isCommandRole && (
        <div className="pt-2 border-t border-zinc-800 space-y-1">
          <p className="font-bold text-zinc-400 uppercase">Command Actions</p>
          <button className="w-full px-2 py-1 bg-[#ea580c]/20 hover:bg-[#ea580c]/30 border border-[#ea580c]/50 text-[#ea580c] text-[8px] font-bold uppercase transition-colors rounded-none">
            BROADCAST ORDER
          </button>
          <button className="w-full px-2 py-1 bg-yellow-950/20 hover:bg-yellow-950/30 border border-yellow-700/50 text-yellow-300 text-[8px] font-bold uppercase transition-colors rounded-none">
            DECLARE HOT ZONE
          </button>
        </div>
      )}
    </div>
  );
}