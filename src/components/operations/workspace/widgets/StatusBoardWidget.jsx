import { AlertCircle } from 'lucide-react';

export default function StatusBoardWidget({ operation }) {
  const readinessScore = operation?.brief_artifact?.readiness_score || 0;
  const safetyAcknowledged = operation?.brief_artifact?.safety_roe_acknowledged;

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-[9px] font-bold uppercase text-zinc-300">Status</h3>

      <div className="space-y-1">
        {/* Readiness */}
        <div className="space-y-0.5">
          <p className="text-[8px] font-mono text-zinc-400">Readiness</p>
          <div className="h-1 bg-zinc-800/50 border border-zinc-700/50">
            <div
              className="h-full bg-emerald-600/70"
              style={{ width: `${readinessScore}%` }}
            />
          </div>
          <p className="text-[7px] text-zinc-500">{readinessScore}%</p>
        </div>

        {/* Safety */}
        <div className="px-2 py-1 border border-zinc-700/40 bg-zinc-900/30 text-[8px]">
          <div className="flex items-center gap-1.5">
            {safetyAcknowledged ? (
              <>
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                <span className="text-emerald-300 font-mono">Safety ACK</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-2.5 h-2.5 text-yellow-400" />
                <span className="text-yellow-300 font-mono">Pending</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}