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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
           <div>
             <h1 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
               <Shield className="w-8 h-8 text-amber-600" /> 
               Treasury & Armory
             </h1>
             <p className="text-zinc-500 mt-1">Manage squad funds, loot distribution, and logistical assets.</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           
           {/* Coffer List */}
           <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Active Funds</h3>
              {coffersWithBalance.length === 0 && (
                 <div className="p-4 text-center border border-dashed border-zinc-800 rounded bg-zinc-900/20 text-zinc-600 text-sm">
                    No coffers initialized. 
                    <br/>
                    <span className="text-xs italic">(Ask admin to initialize via backend)</span>
                 </div>
              )}
              {coffersWithBalance.map(coffer => (
                 <Card 
                   key={coffer.id} 
                   onClick={() => setSelectedCoffer(coffer)}
                   className={cn(
                      "cursor-pointer transition-all hover:border-amber-900/50 group relative overflow-hidden",
                      selectedCoffer?.id === coffer.id ? "bg-zinc-900 border-amber-700 shadow-[0_0_15px_rgba(180,83,9,0.1)]" : "bg-zinc-900 border-zinc-800"
                   )}
                 >
                    <CardContent className="p-4">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                             <Coins className={cn("w-4 h-4", selectedCoffer?.id === coffer.id ? "text-amber-500" : "text-zinc-600")} />
                             <h4 className={cn("font-bold", selectedCoffer?.id === coffer.id ? "text-white" : "text-zinc-300")}>{coffer.name}</h4>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-zinc-800 text-zinc-500 bg-zinc-950">{coffer.type}</Badge>
                       </div>
                       <div className="text-2xl font-mono font-bold text-zinc-200">
                          {coffer.balance.toLocaleString()} <span className="text-amber-600 text-lg">¤</span>
                       </div>
                       <div className="text-xs text-zinc-500 mt-1 line-clamp-1">{coffer.description}</div>
                    </CardContent>
                 </Card>
              ))}
           </div>

           {/* Transaction View */}
           <div className="lg:col-span-8">
              {selectedCoffer ? (
                 <Card className="bg-zinc-900/50 border-zinc-800 h-full min-h-[500px]">
                    <CardHeader className="border-b border-zinc-800 pb-4 flex flex-row items-center justify-between">
                       <div>
                          <CardTitle className="text-xl text-white flex items-center gap-2">
                             {selectedCoffer.name} Ledger
                          </CardTitle>
                          <p className="text-xs text-zinc-500 mt-1">Recent transactions and movements</p>
                       </div>
                       {canEditResources(currentUser) && <TransactionForm cofferId={selectedCoffer.id} />}
                       </CardHeader>
                    <CardContent className="pt-6">
                       <TransactionHistory cofferId={selectedCoffer.id} />
                    </CardContent>
                 </Card>
              ) : (
                 <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-lg bg-zinc-900/20">
                    <Wallet className="w-12 h-12 mb-4 opacity-20" />
                    <p>Select a coffer to view details</p>
                 </div>
              )}
           </div>

        </div>
      </div>
    </div>
  );
}