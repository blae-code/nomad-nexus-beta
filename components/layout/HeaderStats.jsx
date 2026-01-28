import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Coins, Wallet, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HeaderStats() {
  // 1. User Balance
  const { data: user } = useQuery({
    queryKey: ['header-user-stats'],
    queryFn: () => base44.auth.me().catch(() => null),
    refetchInterval: 10000
  });

  // 2. Coffer Total
  const { data: cofferTotal } = useQuery({
    queryKey: ['header-coffer-total'],
    queryFn: async () => {
      const coffers = await base44.entities.Coffer.list();
      return coffers.reduce((sum, c) => sum + (c.balance || 0), 0);
    },
    refetchInterval: 30000
  });

  // 3. Active Personnel (Online/Ready)
  const { data: activeCount } = useQuery({
    queryKey: ['header-active-count'],
    queryFn: async () => {
      // Count users with status != 'OFFLINE'
      const activeStatuses = await base44.entities.PlayerStatus.list({
        filter: { status: { $ne: 'OFFLINE' } } // Assuming backend supports basic filter, else client filter
      });
      // Fallback client filtering if needed
      const online = activeStatuses.filter(s => s.status !== 'OFFLINE');
      return online.length;
    },
    refetchInterval: 15000,
    initialData: 0
  });

  const formatK = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
  };

  return (
    <div className="flex items-center h-full mr-6 gap-1">
       {/* Personal Wallet */}
       <div className="flex flex-col items-end px-3 py-1 border-r border-zinc-800/50">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1">
             <Wallet className="w-3 h-3" />
             Wallet
          </div>
          <div className="text-xs font-bold text-emerald-400 font-mono tracking-wide">
             {formatK(user?.auec_balance)} <span className="text-[9px] text-zinc-600">aUEC</span>
          </div>
       </div>

       {/* Org Treasury */}
       <div className="flex flex-col items-end px-3 py-1 border-r border-zinc-800/50">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1">
             <Coins className="w-3 h-3" />
             Treasury
          </div>
          <div className="text-xs font-bold text-amber-500 font-mono tracking-wide">
             {formatK(cofferTotal)} <span className="text-[9px] text-zinc-600">aUEC</span>
          </div>
       </div>

       {/* Active Personnel */}
       <div className="flex flex-col items-end px-3 py-1">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono flex items-center gap-1">
             <Users className="w-3 h-3" />
             Active
          </div>
          <div className="flex items-center gap-1.5">
             <div className={cn("w-1.5 h-1.5 rounded-full", activeCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-zinc-700")} />
             <div className="text-xs font-bold text-zinc-300 font-mono">
                {activeCount} <span className="text-[9px] text-zinc-600">OPs</span>
             </div>
          </div>
       </div>
    </div>
  );
}