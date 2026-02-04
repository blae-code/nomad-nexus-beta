import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Boxes, MapPin, Package } from 'lucide-react';

const DEFAULT_FORM = {
  name: '',
  category: 'materials',
  quantity: '',
  location: '',
  status: 'available',
  notes: '',
};

export default function LogisticsHub() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.InventoryItem.list('-created_date', 200);
      setItems(list || []);
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
      await base44.entities.InventoryItem.create({
        name: form.name.trim(),
        category: form.category,
        quantity: Number(form.quantity) || 0,
        location: form.location,
        status: form.status,
        notes: form.notes,
      });
      setForm(DEFAULT_FORM);
      loadItems();
    } catch (error) {
      console.error('Failed to create inventory item:', error);
    }
  };

  const updateQuantity = async (itemId, delta) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const next = Math.max(0, (Number(item.quantity) || 0) + delta);
    try {
      await base44.entities.InventoryItem.update(itemId, { quantity: next });
      loadItems();
    } catch (error) {
      console.error('Failed to update quantity:', error);
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
        <p className="text-zinc-400 text-sm">Track materials, components, vehicles, and supplies</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <Boxes className="w-3 h-3" />
              Add Inventory
            </div>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Item name"
            />
            <select
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
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="Quantity"
            />
            <Input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Location"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="available">Available</option>
              <option value="reserved">Reserved</option>
              <option value="in-transit">In Transit</option>
            </select>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Notes"
              className="min-h-[80px]"
            />
            <Button onClick={createItem} disabled={!form.name.trim()}>
              Add Item
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500">Loading inventory...</div>
          ) : items.length === 0 ? (
            <div className="text-zinc-500">No inventory items recorded.</div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-400" />
                      {item.name}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase">{item.category} • {item.status}</div>
                  </div>
                  <div className="text-xs text-green-400">{item.quantity}</div>
                </div>
                {item.location && (
                  <div className="text-xs text-zinc-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                  </div>
                )}
                {item.notes && <div className="text-xs text-zinc-300">{item.notes}</div>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>+1</Button>
                  <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, -1)}>-1</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
