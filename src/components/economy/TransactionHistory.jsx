import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react";

export default function TransactionHistory({ cofferId, eventId, limit = 20 }) {
  const filter = {};
  if (cofferId) filter.coffer_id = cofferId;
  if (eventId) filter.event_id = eventId;

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', cofferId, eventId],
    queryFn: () => base44.entities.CofferTransaction.list({ 
      filter, 
      sort: { transaction_date: -1 },
      limit 
    }),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  if (isLoading) return <div className="p-4 text-center text-zinc-500 text-xs">Loading ledger...</div>;
  if (transactions.length === 0) return <div className="p-4 text-center text-zinc-500 text-xs italic">No records found.</div>;

  return (
    <div className="space-y-2">
      {transactions.map(tx => {
        const user = users.find(u => u.id === tx.user_id);
        const isDeposit = tx.amount >= 0;
        
        return (
          <div key={tx.id} className="flex items-center justify-between p-3 rounded bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 transition-colors group">
             <div className="flex items-center gap-3">
               <div className={`p-2 rounded-full ${isDeposit ? 'bg-emerald-950/30 text-emerald-500' : 'bg-red-950/30 text-red-500'}`}>
                 {isDeposit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
               </div>
               <div>
                 <div className="text-sm font-medium text-zinc-200 group-hover:text-white">{tx.description}</div>
                 <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1">
                       <Calendar className="w-3 h-3" />
                       {new Date(tx.transaction_date).toLocaleDateString()}
                    </span>
                    {user && (
                       <span>• by {user.rsi_handle || user.email}</span>
                    )}
                 </div>
               </div>
             </div>
             <div className={`font-mono font-bold ${isDeposit ? 'text-emerald-400' : 'text-red-400'}`}>
                {isDeposit ? '+' : ''}{(tx.amount || 0).toLocaleString()} ¤
             </div>
          </div>
        );
      })}
    </div>
  );
}