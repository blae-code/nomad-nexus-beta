import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BadgeDollarSign, Boxes, HandCoins, TrendingDown, TrendingUp } from 'lucide-react';

const TRADE_TYPES = [
  ['purchase_order', 'Purchase Order'],
  ['crafting_order', 'Crafting Order'],
  ['consignment', 'Consignment'],
  ['hauling', 'Hauling'],
  ['gear_loan', 'Gear Loan'],
  ['bounty', 'Bounty'],
  ['mission_support', 'Mission Support'],
];

const TRADE_TYPE_SET = new Set(TRADE_TYPES.map(([value]) => value));

const DEFAULT_FORM = {
  title: '',
  type: 'purchase_order',
  reward: '',
  location: '',
  description: '',
  tags: '',
};

const TABS = [
  ['market', 'Marketplace'],
  ['loans', 'Gear Loans'],
  ['supply', 'Supply Chain'],
  ['finance', 'Finance'],
];

function asTags(input) {
  return String(input || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isTradeContract(post) {
  const type = String(post?.type || '').toLowerCase();
  if (TRADE_TYPE_SET.has(type)) return true;
  const tags = Array.isArray(post?.tags) ? post.tags.map((tag) => String(tag).toLowerCase()) : [];
  return tags.includes('commerce') || tags.some((tag) => tag.startsWith('trade:'));
}

function hasPaid(post) {
  if (String(post?.reward_status || '').toUpperCase() === 'PAID') return true;
  return Array.isArray(post?.tags) && post.tags.some((tag) => String(tag).toLowerCase() === 'reward:paid');
}

function tokenGet(text, pattern) {
  const match = String(text || '').match(pattern);
  return match?.[1] || '';
}

function tokenRemove(text, pattern) {
  return String(text || '').replace(pattern, '').trim();
}

function tokenUpsert(text, pattern, replacement) {
  const value = String(text || '');
  if (pattern.test(value)) return value.replace(pattern, replacement).trim();
  return value ? `${value}\n${replacement}` : replacement;
}

function loanMeta(notes) {
  const loanTo = tokenGet(notes, /\[loan_to:([^\]]+)\]/i);
  const loanDue = tokenGet(notes, /\[loan_due:([^\]]+)\]/i);
  return { loanTo, loanDue, hasLoan: Boolean(loanTo) };
}

function isEmergencyCache(notes) {
  return /\[cache:emergency\]/i.test(String(notes || ''));
}

export default function TradeNexus() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [tab, setTab] = useState('market');
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [coffers, setCoffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [publishing, setPublishing] = useState(false);
  const [actionById, setActionById] = useState({});
  const [bidDrafts, setBidDrafts] = useState({});
  const [loanDrafts, setLoanDrafts] = useState({});
  const [banner, setBanner] = useState(null);
  const isCommand = ['COMMANDER', 'PIONEER', 'FOUNDER'].includes(String(member?.rank || '').toUpperCase());

  const tradeContracts = useMemo(() => contracts.filter(isTradeContract), [contracts]);
  const loanItems = useMemo(
    () =>
      inventory.filter((item) => ['equipment', 'components', 'vehicles'].includes(String(item?.category || '').toLowerCase())),
    [inventory]
  );

  const locationSummary = useMemo(() => {
    const map = {};
    for (const item of inventory) {
      const key = String(item?.location || 'Unassigned');
      if (!map[key]) map[key] = { location: key, itemCount: 0, quantity: 0, low: 0 };
      const qty = Number(item?.quantity || 0);
      const min = Number(tokenGet(item?.notes, /\[min:(\d+)\]/i) || 10);
      map[key].itemCount += 1;
      map[key].quantity += qty;
      if (qty <= min) map[key].low += 1;
    }
    return Object.values(map).sort((a, b) => b.quantity - a.quantity);
  }, [inventory]);

  const finance = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    let inflow = 0;
    let outflow = 0;
    for (const tx of transactions) {
      const d = tx?.transaction_date ? new Date(tx.transaction_date) : null;
      if (!d || d < since) continue;
      const amount = Number(tx?.amount || 0);
      if (amount >= 0) inflow += amount;
      else outflow += Math.abs(amount);
    }
    return { inflow, outflow, net: inflow - outflow };
  }, [transactions]);

  const load = async () => {
    setLoading(true);
    try {
      const [postList, inventoryList, cofferList, txList] = await Promise.all([
        base44.entities.MissionBoardPost.list('-created_date', 300).catch(() => []),
        base44.entities.InventoryItem.list('-created_date', 300).catch(() => []),
        base44.entities.Coffer.list('name', 100).catch(() => []),
        base44.entities.CofferTransaction.list('-transaction_date', 300).catch(() => []),
      ]);
      setContracts(postList || []);
      setInventory(inventoryList || []);
      setCoffers(cofferList || []);
      setTransactions(txList || []);
    } catch (error) {
      console.error('Failed to load Trade Nexus data:', error);
      setBanner({ type: 'error', message: 'Failed to load trade data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const postContract = async () => {
    if (!form.title.trim()) return;
    try {
      setPublishing(true);
      const type = String(form.type || '').toLowerCase();
      const tags = Array.from(new Set([...asTags(form.tags), 'commerce', `trade:${type}`]));
      await base44.entities.MissionBoardPost.create({
        title: form.title.trim(),
        type,
        reward: form.reward,
        location: form.location,
        description: form.description,
        status: 'open',
        tags,
        posted_by_member_profile_id: member?.id || null,
      });
      setForm(DEFAULT_FORM);
      setBanner({ type: 'success', message: 'Trade contract posted.' });
      await load();
    } catch (error) {
      console.error('Failed to post contract:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to post trade contract.' });
    } finally {
      setPublishing(false);
    }
  };

  const contractAction = async (post, action) => {
    try {
      setActionById((prev) => ({ ...prev, [post.id]: action }));
      const response = await invokeMemberFunction('updateMissionBoardPostStatus', { postId: post.id, action });
      const payload = response?.data || response;
      setBanner({
        type: payload?.success ? 'success' : 'error',
        message: payload?.success ? `Contract updated: ${action.replace('_', ' ')}.` : payload?.error || 'Contract update failed.',
      });
      await load();
    } catch (error) {
      console.error('Contract action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Contract update failed.' });
    } finally {
      setActionById((prev) => ({ ...prev, [post.id]: null }));
    }
  };

  const submitBid = async (post) => {
    const draft = bidDrafts[post.id] || {};
    const amount = Number(draft.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      setActionById((prev) => ({ ...prev, [post.id]: 'bid' }));
      const response = await invokeMemberFunction('submitTradeContractBid', {
        postId: post.id,
        amount,
        note: String(draft.note || ''),
      });
      const payload = response?.data || response;
      setBanner({
        type: payload?.success ? 'success' : 'error',
        message: payload?.success ? `Bid submitted (${Math.round(amount)} aUEC).` : payload?.error || 'Bid failed.',
      });
      if (payload?.success) setBidDrafts((prev) => ({ ...prev, [post.id]: {} }));
      await load();
    } catch (error) {
      console.error('Bid failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Bid failed.' });
    } finally {
      setActionById((prev) => ({ ...prev, [post.id]: null }));
    }
  };

  const startLoan = async (item) => {
    const draft = loanDrafts[item.id] || {};
    const loanTo = String(draft.loanTo || '').trim();
    if (!loanTo) return;
    const loanDue = String(draft.loanDue || '').trim();
    try {
      setActionById((prev) => ({ ...prev, [item.id]: 'loan_start' }));
      let notes = tokenUpsert(item?.notes, /\[loan_to:[^\]]+\]/i, `[loan_to:${loanTo}]`);
      if (loanDue) notes = tokenUpsert(notes, /\[loan_due:[^\]]+\]/i, `[loan_due:${loanDue}]`);
      await base44.entities.InventoryItem.update(item.id, { status: 'reserved', notes });
      setBanner({ type: 'success', message: `Loan started for ${item.name}.` });
      await load();
    } catch (error) {
      console.error('Failed to start loan:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to start loan.' });
    } finally {
      setActionById((prev) => ({ ...prev, [item.id]: null }));
    }
  };

  const endLoan = async (item) => {
    try {
      setActionById((prev) => ({ ...prev, [item.id]: 'loan_end' }));
      let notes = tokenRemove(item?.notes, /\[loan_to:[^\]]+\]/gi);
      notes = tokenRemove(notes, /\[loan_due:[^\]]+\]/gi);
      await base44.entities.InventoryItem.update(item.id, { status: 'available', notes });
      setBanner({ type: 'success', message: `Loan returned for ${item.name}.` });
      await load();
    } catch (error) {
      console.error('Failed to end loan:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to return loan.' });
    } finally {
      setActionById((prev) => ({ ...prev, [item.id]: null }));
    }
  };

  const toggleCache = async (item) => {
    try {
      setActionById((prev) => ({ ...prev, [item.id]: 'cache' }));
      const notes = isEmergencyCache(item?.notes)
        ? tokenRemove(item?.notes, /\[cache:emergency\]/gi)
        : (item?.notes ? `${item.notes}\n` : '') + '[cache:emergency]';
      await base44.entities.InventoryItem.update(item.id, { notes });
      await load();
    } catch (error) {
      console.error('Failed to toggle cache:', error);
      setBanner({ type: 'error', message: error?.message || 'Failed to update cache flag.' });
    } finally {
      setActionById((prev) => ({ ...prev, [item.id]: null }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Trade Nexus</h1>
        <p className="text-zinc-400 text-sm">Contract commerce, auctions, gear loans, supply chain, and finance reports</p>
        {banner && (
          <div
            role={banner.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-xs ${
              banner.type === 'error'
                ? 'border-red-500/40 text-red-300 bg-red-500/10'
                : 'border-green-500/40 text-green-300 bg-green-500/10'
            }`}
          >
            {banner.message}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-b border-zinc-800 pb-3">
        {TABS.map(([id, label]) => (
          <Button key={id} size="sm" variant={tab === id ? 'default' : 'outline'} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>

      {loading && <div className="text-zinc-500 text-sm">Loading Trade Nexus...</div>}
      {!loading && tab === 'market' && (
        <MarketTab
          form={form}
          setForm={setForm}
          publishing={publishing}
          postContract={postContract}
          contracts={tradeContracts}
          actionById={actionById}
          memberId={member?.id}
          isCommand={isCommand}
          contractAction={contractAction}
          bidDrafts={bidDrafts}
          setBidDrafts={setBidDrafts}
          submitBid={submitBid}
        />
      )}
      {!loading && tab === 'loans' && (
        <LoansTab
          items={loanItems}
          drafts={loanDrafts}
          setDrafts={setLoanDrafts}
          actionById={actionById}
          startLoan={startLoan}
          endLoan={endLoan}
        />
      )}
      {!loading && tab === 'supply' && (
        <SupplyTab items={inventory} summary={locationSummary} actionById={actionById} toggleCache={toggleCache} />
      )}
      {!loading && tab === 'finance' && <FinanceTab coffers={coffers} transactions={transactions} finance={finance} />}
    </div>
  );
}

function MarketTab({
  form,
  setForm,
  publishing,
  postContract,
  contracts,
  actionById,
  memberId,
  isCommand,
  contractAction,
  bidDrafts,
  setBidDrafts,
  submitBid,
}) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-1 space-y-3 bg-zinc-900/60 border border-zinc-800 rounded p-4">
        <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <HandCoins className="w-3 h-3" />
          Post Trade Contract
        </div>
        <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Contract title" />
        <select
          value={form.type}
          onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
          className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
        >
          {TRADE_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Input value={form.reward} onChange={(e) => setForm((p) => ({ ...p, reward: e.target.value }))} placeholder="Budget / reward" />
        <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Location" />
        <Textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          placeholder="Contract details"
          className="min-h-[90px]"
        />
        <Input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma-separated)" />
        <Button onClick={postContract} disabled={!form.title.trim() || publishing}>
          {publishing ? 'Posting...' : 'Post Contract'}
        </Button>
      </div>
      <div className="col-span-2 space-y-3">
        {contracts.length === 0 && <div className="text-zinc-500 text-sm">No trade contracts posted.</div>}
        {contracts.map((post) => {
          const status = String(post.status || 'open').toLowerCase();
          const loading = actionById[post.id];
          const canComplete = status === 'claimed' && (post.claimed_by_member_profile_id === memberId || isCommand);
          const canPaid = status === 'completed' && !hasPaid(post) && (post.posted_by_member_profile_id === memberId || isCommand);
          return (
            <div key={post.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{post.title}</div>
                  <div className="text-[10px] text-zinc-500 uppercase">{post.type} • {post.status}</div>
                </div>
                {post.reward && (
                  <div className="text-xs text-green-400 flex items-center gap-1">
                    <BadgeDollarSign className="w-3 h-3" />
                    {post.reward}
                  </div>
                )}
              </div>
              {post.description && <div className="text-xs text-zinc-300">{post.description}</div>}
              <div className="flex gap-2">
                {status === 'open' && (
                  <Button size="sm" variant="outline" onClick={() => contractAction(post, 'claim')} disabled={Boolean(loading)}>
                    {loading === 'claim' ? 'Updating...' : 'Accept'}
                  </Button>
                )}
                {canComplete && (
                  <Button size="sm" variant="outline" onClick={() => contractAction(post, 'complete')} disabled={Boolean(loading)}>
                    {loading === 'complete' ? 'Updating...' : post.type === 'consignment' ? 'Confirm Delivery' : 'Mark Fulfilled'}
                  </Button>
                )}
                {canPaid && (
                  <Button size="sm" variant="outline" onClick={() => contractAction(post, 'mark_paid')} disabled={Boolean(loading)}>
                    {loading === 'mark_paid' ? 'Settling...' : 'Settle Payment'}
                  </Button>
                )}
              </div>
              {status === 'open' && (
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 space-y-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Auction / Bid</div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={bidDrafts[post.id]?.amount || ''}
                      onChange={(e) => setBidDrafts((prev) => ({ ...prev, [post.id]: { ...prev[post.id], amount: e.target.value } }))}
                      placeholder="Bid amount"
                    />
                    <Input
                      value={bidDrafts[post.id]?.note || ''}
                      onChange={(e) => setBidDrafts((prev) => ({ ...prev, [post.id]: { ...prev[post.id], note: e.target.value } }))}
                      placeholder="Bid note"
                    />
                    <Button size="sm" variant="outline" onClick={() => submitBid(post)} disabled={Boolean(loading)}>
                      {loading === 'bid' ? 'Submitting...' : 'Submit Bid'}
                    </Button>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Highest bid: {Math.round(Number(post.highest_bid_amount || 0)).toLocaleString()} aUEC
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoansTab({ items, drafts, setDrafts, actionById, startLoan, endLoan }) {
  return (
    <div className="space-y-3">
      {items.length === 0 && <div className="text-zinc-500 text-sm">No gear inventory found for loans.</div>}
      {items.map((item) => {
        const meta = loanMeta(item.notes);
        const draft = drafts[item.id] || {};
        const loading = actionById[item.id];
        return (
          <div key={item.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
            <div className="text-sm text-white font-semibold">{item.name}</div>
            <div className="text-[10px] text-zinc-500 uppercase">{item.category} • qty {item.quantity}</div>
            {meta.hasLoan ? (
              <div className="flex items-center justify-between">
                <div className="text-xs text-orange-300">
                  Loaned to {meta.loanTo} {meta.loanDue ? `(due ${meta.loanDue})` : ''}
                </div>
                <Button size="sm" variant="outline" onClick={() => endLoan(item)} disabled={Boolean(loading)}>
                  {loading === 'loan_end' ? 'Updating...' : 'Return Gear'}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={draft.loanTo || ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loanTo: e.target.value } }))}
                  placeholder="Loan to member"
                />
                <Input
                  type="date"
                  value={draft.loanDue || ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], loanDue: e.target.value } }))}
                />
                <Button size="sm" variant="outline" onClick={() => startLoan(item)} disabled={Boolean(loading)}>
                  {loading === 'loan_start' ? 'Updating...' : 'Start Loan'}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SupplyTab({ items, summary, actionById, toggleCache }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Supply Chain Dashboard</div>
        {summary.length === 0 && <div className="text-xs text-zinc-500">No supply locations recorded.</div>}
        {summary.map((row) => (
          <div key={row.location} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
            <div className="text-sm text-white">{row.location}</div>
            <div className="text-[10px] text-zinc-500 uppercase">
              Items: {row.itemCount} • Quantity: {row.quantity} • Low stock: {row.low}
            </div>
          </div>
        ))}
      </div>
      <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Boxes className="w-3 h-3" />
          Emergency Cache System
        </div>
        {items.slice(0, 40).map((item) => (
          <div key={item.id} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
            <div className="text-xs text-white">{item.name}</div>
            <div className="text-[10px] text-zinc-500">{item.location || 'Unassigned'} • qty {item.quantity}</div>
            <Button size="sm" variant="outline" onClick={() => toggleCache(item)} disabled={actionById[item.id] === 'cache'}>
              {actionById[item.id] === 'cache' ? 'Updating...' : isEmergencyCache(item.notes) ? 'Remove Cache' : 'Mark Cache'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceTab({ coffers, transactions, finance }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Inflow (30d)</div>
          <div className="text-xl font-bold text-green-400">{finance.inflow.toLocaleString()} aUEC</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Outflow (30d)</div>
          <div className="text-xl font-bold text-red-400">{finance.outflow.toLocaleString()} aUEC</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Net (30d)</div>
          <div className={`text-xl font-bold ${finance.net >= 0 ? 'text-green-300' : 'text-red-300'}`}>{finance.net.toLocaleString()} aUEC</div>
        </div>
      </div>
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Coffer Balances</div>
        {coffers.map((coffer) => {
          const balance = transactions.filter((tx) => tx.coffer_id === coffer.id).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
          return (
            <div key={coffer.id} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
              <div className="text-sm text-white">{coffer.name}</div>
              <div className="text-[10px] text-zinc-500 uppercase">{coffer.type || 'coffer'}</div>
              <div className="text-sm text-orange-300">{balance.toLocaleString()} aUEC</div>
            </div>
          );
        })}
      </div>
      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
        <div className="text-xs uppercase tracking-widest text-zinc-500">Recent Transactions</div>
        {transactions.slice(0, 25).map((tx) => (
          <div key={tx.id} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Number(tx.amount || 0) >= 0 ? <TrendingUp className="w-3 h-3 text-green-400" /> : <TrendingDown className="w-3 h-3 text-red-400" />}
              <div>
                <div className="text-xs text-zinc-200">{tx.description || 'Transaction'}</div>
                <div className="text-[10px] text-zinc-500">
                  {tx.transaction_date ? new Date(tx.transaction_date).toLocaleString() : 'Unknown date'}
                </div>
              </div>
            </div>
            <div className={`text-xs font-semibold ${Number(tx.amount || 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
              {Number(tx.amount || 0) >= 0 ? '+' : ''}
              {Number(tx.amount || 0).toLocaleString()} aUEC
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
