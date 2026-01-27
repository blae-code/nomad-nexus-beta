import { DollarSign } from 'lucide-react';

export default function EconomyWidget({ operation }) {
  const brief = operation?.brief_artifact || {};

  return (
    <div className="space-y-2 h-full flex flex-col">
      <h3 className="text-[9px] font-bold uppercase text-zinc-300 flex items-center gap-1.5">
        <DollarSign className="w-3 h-3" />
        Economy
      </h3>

      <div className="space-y-1 flex-1">
        <div className="px-2 py-1.5 border border-yellow-700/40 bg-yellow-950/20 text-[8px]">
          <p className="text-yellow-300 font-bold">SPLIT RULES</p>
          <p className="text-[7px] text-yellow-300/75 mt-0.5">
            {brief.auec_split_rules || 'Host Decides'}
          </p>
        </div>

        <div className="px-2 py-1.5 border border-zinc-700/40 bg-zinc-900/30 text-[8px]">
          <p className="text-zinc-400 font-mono">Projected Earnings</p>
          <p className="text-[7px] text-zinc-500 mt-0.5">Pending settlement</p>
        </div>
      </div>
    </div>
  );
}