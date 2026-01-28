import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Wallet, Coins, Shield } from "lucide-react";
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
    <div className="h-screen bg-[#09090b] text-zinc-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b border-zinc-800 px-4 py-2">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#ea580c]" />
            <div>
              <h1 className="text-xl font-black uppercase tracking-tighter text-white">TREASURY</h1>
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider">Squad Funds & Armory Management</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-2 p-2">

           {/* Coffer List */}
           <div className="lg:col-span-4 space-y-2 overflow-y-auto">
              <div className="text-[8px] font-bold uppercase text-zinc-500 px-1 tracking-wider mb-2">ACTIVE FUNDS</div>
              {coffersWithBalance.length === 0 && (
                 <div className="p-3 text-center border border-zinc-800 bg-zinc-950 text-zinc-600 text-[8px] font-mono">
                    NO COFFERS INITIALIZED
                 </div>
              )}
              {coffersWithBalance.map(coffer => (
                 <button
                   key={coffer.id} 
                   onClick={() => setSelectedCoffer(coffer)}
                   className={cn(
                      "w-full text-left p-2 border transition-all",
                      selectedCoffer?.id === coffer.id 
                         ? "bg-zinc-900/60 border-[#ea580c]/50" 
                         : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                   )}
                 >
                    <div className="flex justify-between items-start mb-1.5">
                       <div className="flex items-center gap-1.5">
                          <Coins className={cn("w-3 h-3", selectedCoffer?.id === coffer.id ? "text-[#ea580c]" : "text-zinc-600")} />
                          <h4 className={cn("text-[9px] font-bold uppercase", selectedCoffer?.id === coffer.id ? "text-white" : "text-zinc-300")}>{coffer.name}</h4>
                       </div>
                       <span className="text-[7px] font-mono uppercase text-zinc-600 bg-zinc-900/50 px-1 py-0.5 border border-zinc-800">{coffer.type}</span>
                    </div>
                    <div className="text-base font-mono font-bold text-zinc-200">
                       {(coffer.balance || 0).toLocaleString()} <span className="text-[#ea580c] text-xs">¤</span>
                    </div>
                    {coffer.description && <div className="text-[7px] text-zinc-600 mt-1 line-clamp-1">{coffer.description}</div>}
                 </button>
              ))}
           </div>

           {/* Transaction View */}
           <div className="lg:col-span-8 overflow-hidden flex flex-col">
              {selectedCoffer ? (
                 <div className="border border-zinc-800 bg-zinc-950 h-full flex flex-col">
                    <div className="border-b border-zinc-800 p-2 flex flex-row items-center justify-between shrink-0">
                       <div>
                          <div className="text-[9px] font-bold text-white uppercase tracking-wider">
                             {selectedCoffer.name} LEDGER
                          </div>
                          <p className="text-[7px] text-zinc-600 mt-0.5 font-mono uppercase">Transaction History</p>
                       </div>
                       {canEditResources(currentUser) && <TransactionForm cofferId={selectedCoffer.id} />}
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto p-2">
                       <TransactionHistory cofferId={selectedCoffer.id} />
                    </div>
                 </div>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-zinc-600 border border-zinc-800 bg-zinc-950">
                    <Wallet className="w-10 h-10 mb-3 opacity-20" />
                    <p className="text-[8px] font-mono tracking-widest uppercase">Select a Coffer</p>
                 </div>
              )}
           </div>

          </div>
        </div>
      </div>
    </div>
  );
}