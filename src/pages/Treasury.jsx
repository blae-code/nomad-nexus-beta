import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Coins, Shield, TrendingUp, Plus } from "lucide-react";
import TransactionForm from "@/components/economy/TransactionForm";
import TransactionHistory from "@/components/economy/TransactionHistory";
import { cn } from "@/lib/utils";
import { canEditResources } from "@/components/permissions";

export default function TreasuryPage() {
  const [selectedCoffer, setSelectedCoffer] = React.useState(null);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
     base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  
  const { data: coffers, isLoading } = useQuery({
    queryKey: ['coffers'],
    queryFn: () => base44.entities.Coffer.list(),
    initialData: []
  });

  // Calculate balance for each coffer on the fly
  const { data: allTransactions } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: () => base44.entities.CofferTransaction.list({ limit: 1000 }), // simplified for v0.1
    initialData: []
  });

  const coffersWithBalance = React.useMemo(() => {
    return coffers.map(c => {
      const balance = allTransactions
        .filter(t => t.coffer_id === c.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return { ...c, balance };
    });
  }, [coffers, allTransactions]);

  if (isLoading) return <div className="min-h-screen bg-zinc-950 p-10 text-zinc-500">Loading Treasury...</div>;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 pt-20 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
           <div>
             <h1 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
               <Shield className="w-8 h-8 text-[#ea580c]" /> 
               TREASURY
             </h1>
             <p className="text-xs font-mono text-zinc-600 mt-2 tracking-widest">SQUAD FUNDS & ARMORY MANAGEMENT</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

           {/* Coffer List */}
           <div className="lg:col-span-4 space-y-2">
              <div className="text-[10px] font-bold uppercase text-zinc-600 px-1 tracking-wider mb-3">ACTIVE FUNDS</div>
              {coffersWithBalance.length === 0 && (
                 <div className="p-4 text-center border border-zinc-800/50 bg-zinc-950 text-zinc-600 text-[10px] font-mono">
                    NO COFFERS INITIALIZED
                 </div>
              )}
              {coffersWithBalance.map(coffer => (
                 <button
                   key={coffer.id} 
                   onClick={() => setSelectedCoffer(coffer)}
                   className={cn(
                      "w-full text-left p-3 border transition-all duration-100",
                      selectedCoffer?.id === coffer.id 
                         ? "bg-zinc-900/60 border-[#ea580c]/50" 
                         : "bg-zinc-950 border-zinc-800/50 hover:border-zinc-700/50"
                   )}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                          <Coins className={cn("w-3.5 h-3.5", selectedCoffer?.id === coffer.id ? "text-[#ea580c]" : "text-zinc-600")} />
                          <h4 className={cn("text-xs font-bold", selectedCoffer?.id === coffer.id ? "text-white" : "text-zinc-300")}>{coffer.name}</h4>
                       </div>
                       <span className="text-[9px] font-mono uppercase text-zinc-600 bg-zinc-900/50 px-1.5 py-0.5 border border-zinc-800">{coffer.type}</span>
                    </div>
                    <div className="text-lg font-mono font-bold text-zinc-200">
                       {(coffer.balance || 0).toLocaleString()} <span className="text-[#ea580c] text-sm">¤</span>
                    </div>
                    {coffer.description && <div className="text-[9px] text-zinc-600 mt-1 line-clamp-1">{coffer.description}</div>}
                 </button>
              ))}
           </div>

           {/* Transaction View */}
           <div className="lg:col-span-8">
              {selectedCoffer ? (
                 <div className="border border-zinc-800/50 bg-zinc-950 h-full min-h-[500px] flex flex-col">
                    <div className="border-b border-zinc-800/50 p-4 flex flex-row items-center justify-between shrink-0">
                       <div>
                          <div className="text-sm font-bold text-white uppercase tracking-wider">
                             {selectedCoffer.name} LEDGER
                          </div>
                          <p className="text-[9px] text-zinc-600 mt-1 font-mono">TRANSACTION HISTORY</p>
                       </div>
                       {canEditResources(currentUser) && <TransactionForm cofferId={selectedCoffer.id} />}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                       <TransactionHistory cofferId={selectedCoffer.id} />
                    </div>
                 </div>
              ) : (
                 <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-600 border border-zinc-800/50 bg-zinc-950">
                    <Wallet className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-xs font-mono tracking-widest uppercase">SELECT A COFFER</p>
                 </div>
              )}
           </div>

        </div>
      </div>
    </div>
  );
}