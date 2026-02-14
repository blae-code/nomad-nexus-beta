import React, { useState, useEffect } from 'react';
import { DollarSign, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function CreditBalanceTracker({ widgetId, onRemove, isDragging }) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const coffers = await base44.entities.Coffer.list('-updated_date', 1);
      if (coffers[0]) {
        const txs = await base44.entities.CofferTransaction.filter({ coffer_id: coffers[0].id }, '-transaction_date', 10);
        const total = txs.reduce((sum, t) => sum + (t.amount || 0), 0);
        setBalance(total);
        setTransactions(txs || []);
      }
    } catch (err) {
      console.error('Balance load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,rgba(220,38,38,0.015)_0px,transparent_20px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Credits</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-shrink-0 p-4 bg-zinc-900/40 border-b border-zinc-800/60 text-center relative z-10">
        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-1">Total Balance</div>
        <div className="text-2xl font-black text-orange-400 font-mono">{balance.toLocaleString()}</div>
        <div className="text-[10px] text-zinc-700">aUEC</div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {transactions.map((tx, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs text-zinc-400 truncate">{tx.description}</div>
              <div className="text-[9px] text-zinc-700">
                {new Date(tx.transaction_date).toLocaleDateString()}
              </div>
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {tx.amount > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(tx.amount).toLocaleString()}
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No transactions
          </div>
        )}
      </div>
    </div>
  );
}