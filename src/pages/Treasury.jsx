import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import AuthGuard from '@/components/common/AuthGuard';
import PageHeader from '@/components/common/PageHeader';
import LoadingScreen from '@/components/common/LoadingScreen';

export default function Treasury() {
  const [loading, setLoading] = useState(true);
  const [coffers, setCoffers] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const init = async () => {
      const coffersList = await base44.entities.Coffer.list('name', 50);
      const txList = await base44.entities.CofferTransaction.list('-transaction_date', 100);
      setCoffers(coffersList);
      setTransactions(txList);
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <LoadingScreen />;

  const calculateBalance = (cofferId) => {
    return transactions
      .filter(tx => tx.coffer_id === cofferId)
      .reduce((sum, tx) => sum + tx.amount, 0);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
          <PageHeader 
            title="Treasury" 
            description="Financial tracking"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {coffers.map((coffer) => {
              const balance = calculateBalance(coffer.id);
              return (
                <div
                  key={coffer.id}
                  className="bg-zinc-900/50 border-2 border-zinc-800 hover:border-orange-500/50 p-6 transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <DollarSign className="w-8 h-8 text-orange-500" />
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase">{coffer.name}</h3>
                      <p className="text-xs text-zinc-500 uppercase">{coffer.type}</p>
                    </div>
                  </div>
                  
                  <div className="text-3xl font-black text-white mb-2">
                    {balance.toLocaleString()} aUEC
                  </div>
                  
                  {coffer.description && (
                    <p className="text-sm text-zinc-400">{coffer.description}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
            <h2 className="text-xl font-bold text-white uppercase mb-4">Recent Transactions</h2>
            
            <div className="space-y-2">
              {transactions.slice(0, 20).map((tx) => {
                const coffer = coffers.find(c => c.id === tx.coffer_id);
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <TrendingUp className="w-5 h-5 text-green-500" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <div className="text-white font-medium">{tx.description}</div>
                        <div className="text-xs text-zinc-500">
                          {coffer?.name} • {new Date(tx.transaction_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} aUEC
                    </div>
                  </div>
                );
              })}
              </div>
              </div>
              </div>
              </AuthGuard>
              );
              }