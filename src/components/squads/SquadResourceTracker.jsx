import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RESOURCE_TYPES = [
  { value: 'ship', label: 'Ship', color: '#3b82f6' },
  { value: 'vehicle', label: 'Vehicle', color: '#22c55e' },
  { value: 'equipment', label: 'Equipment', color: '#f59e0b' },
  { value: 'supply', label: 'Supply', color: '#a855f7' },
  { value: 'personnel', label: 'Personnel', color: '#ec4899' },
  { value: 'other', label: 'Other', color: '#71717a' }
];

const STATUS_COLORS = {
  available: '#22c55e',
  in_use: '#3b82f6',
  maintenance: '#f59e0b',
  damaged: '#ef4444'
};

export default function SquadResourceTracker({ squadId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ship',
    quantity: 1,
    status: 'available',
    location: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  const { data: resources = [] } = useQuery({
    queryKey: ['squad-resources', squadId],
    queryFn: () => base44.entities.SquadResource.filter({ squad_id: squadId })
  });

  const createResourceMutation = useMutation({
    mutationFn: (data) => base44.entities.SquadResource.create({ ...data, squad_id: squadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-resources', squadId] });
      resetForm();
    }
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SquadResource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-resources', squadId] });
      resetForm();
    }
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id) => base44.entities.SquadResource.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['squad-resources', squadId] })
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingResource(null);
    setFormData({
      name: '',
      type: 'ship',
      quantity: 1,
      status: 'available',
      location: '',
      notes: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingResource) {
      updateResourceMutation.mutate({ id: editingResource.id, data: formData });
    } else {
      createResourceMutation.mutate(formData);
    }
  };

  const handleEdit = (resource) => {
    setEditingResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      quantity: resource.quantity,
      status: resource.status,
      location: resource.location || '',
      notes: resource.notes || ''
    });
    setShowForm(true);
  };

  const getTypeColor = (type) => {
    return RESOURCE_TYPES.find(t => t.value === type)?.color || '#71717a';
  };

  const availableCount = resources.filter(r => r.status === 'available').length;
  const totalResources = resources.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-200">RESOURCE INVENTORY</h3>
          <p className="text-[7px] text-zinc-500">{availableCount}/{totalResources} available</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1 text-[7px]"
        >
          <Plus className="w-3 h-3" />
          Add Resource
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800 bg-zinc-900/50 p-3 space-y-3"
        >
          <Input
            placeholder="Resource name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="text-xs"
          />

          <div className="grid grid-cols-2 gap-2">
            <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            placeholder="Quantity"
            className="text-xs"
          />

          <Input
            placeholder="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="text-xs"
          />

          <Input
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="text-xs"
          />

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} className="text-[7px]">
              {editingResource ? 'Update' : 'Add Resource'}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm} className="text-[7px]">
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-2">
        {resources.map((resource, idx) => (
          <motion.div
            key={resource.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="border border-zinc-800 bg-zinc-900/30 p-2 flex items-start justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: getTypeColor(resource.type) }}
                />
                <span className="text-[8px] font-bold text-zinc-200">{resource.name}</span>
                <Badge
                  className="text-[6px]"
                  style={{
                    backgroundColor: `${STATUS_COLORS[resource.status]}20`,
                    color: STATUS_COLORS[resource.status],
                    borderColor: `${STATUS_COLORS[resource.status]}50`
                  }}
                >
                  {resource.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[7px] text-zinc-400 mb-1">
                <span>Qty: <span className="font-bold text-zinc-200">{resource.quantity}</span></span>
                {resource.location && <span>• Loc: {resource.location}</span>}
              </div>
              {resource.notes && (
                <p className="text-[7px] text-zinc-500 line-clamp-1">{resource.notes}</p>
              )}
            </div>

            <div className="flex gap-1 ml-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleEdit(resource)}
                className="w-6 h-6"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteResourceMutation.mutate(resource.id)}
                className="w-6 h-6 text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}