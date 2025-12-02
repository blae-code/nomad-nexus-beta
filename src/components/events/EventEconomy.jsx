import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Coins, TrendingUp, TrendingDown } from "lucide-react";
import TransactionHistory from "@/components/economy/TransactionHistory";

export default function EventEconomy({ eventId }) {
  // Calculate event totals
  const { data: transactions } = useQuery({
    queryKey: ['transactions', null, eventId],
    queryFn: () => base44.entities.CofferTransaction.list({ filter: { event_id: eventId } }),
    initialData: []
  });

  const totals = React.useMemo(() => {
    const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
            <Coins className="w-4 h-4 text-amber-600" />
            Mission Ledger
          </CardTitle>
        </CardHeader>
        <CardContent>
           <p className="text-xs text-zinc-600 italic">No financial records linked to this operation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 mt-6">
      <CardHeader className="pb-2 border-b border-zinc-800">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
            <Coins className="w-4 h-4 text-amber-500" />
            Mission Ledger
          </CardTitle>
          <div className="text-xs font-mono font-bold text-zinc-400">
            NET: <span className={totals.net >= 0 ? "text-emerald-500" : "text-red-500"}>{totals.net > 0 ? '+' : ''}{totals.net.toLocaleString()} ¤</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
           <div className="p-2 bg-zinc-950/50 rounded border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                 <TrendingUp className="w-3 h-3 text-emerald-600" /> Income
              </div>
              <div className="text-sm font-mono font-bold text-emerald-500">+{totals.income.toLocaleString()}</div>
           </div>
           <div className="p-2 bg-zinc-950/50 rounded border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                 <TrendingDown className="w-3 h-3 text-red-600" /> Expenses
              </div>
              <div className="text-sm font-mono font-bold text-red-500">-{totals.expenses.toLocaleString()}</div>
           </div>
        </div>

        <div className="space-y-2">
           <h4 className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Transaction Log</h4>
           <TransactionHistory eventId={eventId} limit={5} />
        </div>
      </CardContent>
    </Card>
  );
}