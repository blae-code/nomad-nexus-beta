import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Wifi, WifiOff, Coins, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

export default function StatusAlertsWidget() {
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // 1. Rescue Alert Check (Any player in DISTRESS)
  const { data: distressSignals = [] } = useQuery({
    queryKey: ['dashboard-distress'],
    queryFn: () => base44.entities.PlayerStatus.filter({ status: 'DISTRESS' }, '-last_updated', 1),
    refetchInterval: 5000
  });
  const hasRescueRequest = distressSignals.length > 0;

  // 2. Comms Status Check (User's status)
  const { data: myStatus } = useQuery({
    queryKey: ['my-comms-status', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const statuses = await base44.entities.PlayerStatus.filter({ user_id: user.id }, '-last_updated', 1);
      return statuses[0] || null;
    },
    enabled: !!user,
    refetchInterval: 10000
  });
  
  const isOnline = myStatus && myStatus.status !== 'OFFLINE';
  const commsText = isOnline 
    ? `Connected: ${myStatus.assigned_squad_id ? 'Squad Net' : 'General Net'}`
    : "Comms Offline";

  // 3. AUEC Low Warning (General Coffer)
  const { data: cofferWarning } = useQuery({
    queryKey: ['dashboard-coffer-check'],
    queryFn: async () => {
      // Fetch General coffer transactions to calculate balance (since Coffer entity doesn't have balance field in schema provided)
      // Wait, the schema for Coffer doesn't have a 'balance'. I need to sum transactions.
      // Let's fetch Coffers first.
      const coffers = await base44.entities.Coffer.filter({ type: 'GENERAL' }, null, 1);
      if (coffers.length === 0) return null;
      
      const cofferId = coffers[0].id;
      const transactions = await base44.entities.CofferTransaction.filter({ coffer_id: cofferId });
      
      const balance = transactions.reduce((acc, tx) => acc + (tx.amount || 0), 0);
      return balance < 500000 ? balance : null;
    }
  });

  return (
    <div className="flex flex-col gap-2 h-full">
      
      {/* Rescue Alert - High Priority */}
      {hasRescueRequest && (
        <a href={createPageUrl('CommsConsole?view=rescue')} className="block">
          <Card className="bg-red-950/30 border-2 border-red-500 animate-pulse cursor-pointer hover:bg-red-950/50 transition-colors">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 text-white p-1.5 rounded-sm animate-bounce">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-red-500 font-black uppercase tracking-widest text-xs">CRITICAL ALERT</div>
                  <div className="text-white font-bold text-sm tracking-wide">!! ACTIVE RESCUE REQUEST !!</div>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-red-400" />
            </CardContent>
          </Card>
        </a>
      )}

      {/* Status Grid */}
      <Card className="bg-zinc-900/50 border-zinc-800 flex-1 flex flex-col justify-center">
         <CardContent className="p-4 space-y-4">
            
            {/* Comms Status */}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-full bg-zinc-950 border", isOnline ? "border-emerald-500/50 text-emerald-500" : "border-red-900/50 text-red-900")}>
                     {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                  </div>
                  <div>
                     <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Comms Link</div>
                     <div className={cn("text-xs font-mono font-bold", isOnline ? "text-emerald-400" : "text-red-700")}>
                        {commsText}
                     </div>
                  </div>
               </div>
               <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-900")} />
            </div>

            {/* AUEC Warning */}
            {cofferWarning !== null && cofferWarning !== undefined && (
               <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center gap-3">
                     <div className="p-2 rounded-full bg-amber-950/30 border border-amber-500/50 text-amber-500">
                        <Coins className="w-4 h-4" />
                     </div>
                     <div>
                        <div className="text-[10px] text-amber-600 uppercase tracking-wider font-bold">Finance Alert</div>
                        <div className="text-xs font-mono font-bold text-amber-500">
                           ORG FUNDS CRITICAL
                        </div>
                     </div>
                  </div>
                  <div className="text-[10px] text-amber-700 font-mono">
                     {cofferWarning.toLocaleString()} aUEC
                  </div>
               </div>
            )}

         </CardContent>
      </Card>
    </div>
  );
}