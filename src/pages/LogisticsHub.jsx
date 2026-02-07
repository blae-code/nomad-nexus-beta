import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRightLeft, Boxes, MapPin, Package } from 'lucide-react';

const DEFAULT_FORM = {
  name: '',
  category: 'materials',
  quantity: '',
  location: '',
  status: 'available',
  minimumQuantity: '10',
  notes: '',
};

const MINIMUM_TOKEN = /\[min:(\d+)\]/i;

function extractMinimumQuantity(notes) {
  const text = String(notes || '');
  const match = text.match(MINIMUM_TOKEN);
  if (!match) return 10;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return 10;
  return Math.round(value);
}

function stripMinimumToken(notes) {
  return String(notes || '').replace(/\[min:\d+\]/gi, '').trim();
}

function withMinimumToken(notes, minimumQuantity) {
  const base = stripMinimumToken(notes);
  const min = Number(minimumQuantity);
  if (!Number.isFinite(min) || min <= 0) return base;
  const token = `[min:${Math.round(min)}]`;
  return base ? `${base}\n${token}` : token;
}

function getSupplyState(item) {
  const quantity = Number(item?.quantity || 0);
  const minimum = extractMinimumQuantity(item?.notes);
  const criticalThreshold = Math.max(1, Math.floor(minimum / 2));

  if (quantity <= 0) {
    return {
      label: 'Out',
      tone: 'text-red-300 border-red-500/30 bg-red-500/10',
      minimum,
    };
  }
  if (quantity <= criticalThreshold) {
    return {
      label: 'Critical',
      tone: 'text-red-300 border-red-500/30 bg-red-500/10',
      minimum,
    };
  }
  if (quantity <= minimum) {
    return {
      label: 'Low',
      tone: 'text-orange-300 border-orange-500/30 bg-orange-500/10',
      minimum,
    };
  }
  return {
    label: 'Healthy',
    tone: 'text-green-300 border-green-500/30 bg-green-500/10',
    minimum,
  };
}

export default function LogisticsHub() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [transferDraftByItem, setTransferDraftByItem] = useState({});
  const [transferringItemId, setTransferringItemId] = useState(null);
  const [adjustingItemId, setAdjustingItemId] = useState(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.InventoryItem.list('-created_date', 200);
      setItems(list || []);
      setSchemaMissing(false);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      setSchemaMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const createItem = async () => {
    if (!form.name.trim()) return;
    try {
      setPublishing(true);
      const quantity = Math.max(0, Number(form.quantity) || 0);
      await base44.entities.InventoryItem.create({
        name: form.name.trim(),
        category: form.category,
        quantity,
        location: form.location,
        status: quantity === 0 ? 'reserved' : form.status,
        notes: withMinimumToken(form.notes, form.minimumQuantity),
      });
      setForm(DEFAULT_FORM);
      setStatusBanner({ type: 'success', message: 'Inventory item added.' });
      await loadItems();
    } catch (error) {
      console.error('Failed to create inventory item:', error);
      setStatusBanner({
        type: 'error',
        message: error?.message || 'Failed to add inventory item.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const updateQuantity = async (itemId, delta) => {
    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;
    const next = Math.max(0, (Number(item.quantity) || 0) + delta);
    try {
      setAdjustingItemId(itemId);
      await base44.entities.InventoryItem.update(itemId, {
        quantity: next,
        status: next === 0 ? 'reserved' : item.status || 'available',
      });
      await loadItems();
    } catch (error) {
      console.error('Failed to update quantity:', error);
      setStatusBanner({
        type: 'error',
        message: error?.message || 'Failed to update quantity.',
      });
    } finally {
      setAdjustingItemId(null);
    }
  };

  const runTransfer = async (item) => {
    const draft = transferDraftByItem[item.id] || {};
    const quantity = Number(draft.quantity);
    const destinationLocation = String(draft.destinationLocation || '').trim();
    if (!Number.isFinite(quantity) || quantity <= 0 || !destinationLocation) return;

    try {
      setTransferringItemId(item.id);
      const response = await invokeMemberFunction('transferInventoryStock', {
        sourceItemId: item.id,
        quantity,
        destinationLocation,
        reason: String(draft.reason || '').trim(),
      });
      const payload = response?.data || response;

      if (payload?.success) {
        setStatusBanner({
          type: 'success',
          message: `Transferred ${quantity} ${item.name} to ${destinationLocation}.`,
        });
        setTransferDraftByItem((prev) => ({ ...prev, [item.id]: {} }));
      } else {
        setStatusBanner({
          type: 'error',
          message: payload?.error || 'Transfer failed.',
        });
      }
      await loadItems();
    } catch (error) {
      console.error('Failed to transfer inventory:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Transfer failed.',
      });
    } finally {
      setTransferringItemId(null);
    }
  };

  if (schemaMissing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 text-zinc-400">
          InventoryItem entity missing. Add the schema in Base44 to enable logistics tracking.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Logistics & Inventory</h1>
        <p className="text-zinc-400 text-sm">Track supply health and transfer stock between locations</p>
        {statusBanner && (
          <div
            role={statusBanner.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-xs ${
              statusBanner.type === 'error'
                ? 'border-red-500/40 text-red-300 bg-red-500/10'
                : 'border-green-500/40 text-green-300 bg-green-500/10'
            }`}
          >
            {statusBanner.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <Boxes className="w-3 h-3" />
              Add Inventory
            </div>
            <Input
              aria-label="Item name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Item name"
            />
            <select
              aria-label="Item category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="materials">Materials</option>
              <option value="components">Components</option>
              <option value="vehicles">Vehicles</option>
              <option value="equipment">Equipment</option>
              <option value="supplies">Supplies</option>
            </select>
            <Input
              aria-label="Quantity"
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="Quantity"
            />
            <Input
              aria-label="Location"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Location"
            />
            <select
              aria-label="Supply status"
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="in-transit">In Transit</option>
            </select>
            <Input
              aria-label="Minimum stock threshold"
              value={form.minimumQuantity}
              onChange={(e) => setForm((prev) => ({ ...prev, minimumQuantity: e.target.value }))}
              placeholder="Minimum stock threshold"
            />
            <Textarea
              aria-label="Inventory notes"
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px]"
            />
            <Button onClick={createItem} disabled={!form.name.trim() || publishing}>
              {publishing ? 'Adding...' : 'Add Item'}
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500">Loading inventory...</div>
          ) : items.length === 0 ? (
            <div className="text-zinc-500">No inventory items recorded.</div>
          ) : (
            items.map((item) => {
              const supplyState = getSupplyState(item);
              const transferDraft = transferDraftByItem[item.id] || {};
              const transferQuantity = Number(transferDraft.quantity);
              const hasValidTransferDraft =
                Number.isFinite(transferQuantity) &&
                transferQuantity > 0 &&
                transferQuantity <= Number(item.quantity || 0) &&
                String(transferDraft.destinationLocation || '').trim().length > 0;

              return (
                <div key={item.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-400" />
                        {item.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase">{item.category} • {item.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-green-400">{item.quantity}</div>
                      <div className={`mt-1 text-[10px] rounded border px-2 py-1 ${supplyState.tone}`}>
                        {supplyState.label} (min {supplyState.minimum})
                      </div>
                    </div>
                  </div>

                  {item.location && (
                    <div className="text-xs text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {item.location}
                    </div>
                  )}
                  {item.notes && <div className="text-xs text-zinc-300">{stripMinimumToken(item.notes)}</div>}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      disabled={adjustingItemId === item.id}
                    >
                      +1
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      disabled={Number(item.quantity || 0) <= 0 || adjustingItemId === item.id}
                    >
                      -1
                    </Button>
                  </div>

                  <div className="border border-zinc-700/80 rounded p-3 space-y-2 bg-zinc-950/40">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 flex items-center gap-1">
                      <ArrowRightLeft className="w-3 h-3" />
                      Transfer Workflow
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        aria-label={`Transfer quantity for ${item.name}`}
                        value={transferDraft.quantity || ''}
                        onChange={(e) =>
                          setTransferDraftByItem((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              quantity: e.target.value,
                            },
                          }))
                        }
                        placeholder="Qty"
                      />
                      <Input
                        aria-label={`Transfer destination for ${item.name}`}
                        value={transferDraft.destinationLocation || ''}
                        onChange={(e) =>
                          setTransferDraftByItem((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              destinationLocation: e.target.value,
                            },
                          }))
                        }
                        placeholder="Destination"
                      />
                      <Input
                        aria-label={`Transfer reason for ${item.name}`}
                        value={transferDraft.reason || ''}
                        onChange={(e) =>
                          setTransferDraftByItem((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              reason: e.target.value,
                            },
                          }))
                        }
                        placeholder="Reason (optional)"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runTransfer(item)}
                      disabled={!hasValidTransferDraft || transferringItemId === item.id}
                    >
                      {transferringItemId === item.id ? 'Transferring...' : 'Transfer Stock'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
