import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const RANK_OPTIONS = ['Vagrant', 'Scout', 'Recruit', 'Member', 'Specialist', 'Veteran', 'Lead', 'Officer', 'Pioneer', 'Founder'];
const NET_TYPES = ['command', 'squad', 'support', 'general'];
const DISCIPLINES = ['casual', 'focused'];

export default function VoiceNetForm({ net = null, squads = [], onSubmit, onCancel, isLoading = false }) {
  const [formData, setFormData] = useState(net ? {
    code: net.code || '',
    label: net.label || '',
    type: net.type || 'squad',
    discipline: net.discipline || 'casual',
    linked_squad_id: net.linked_squad_id || '',
    min_rank_to_tx: net.min_rank_to_tx || 'Vagrant',
    min_rank_to_rx: net.min_rank_to_rx || 'Vagrant',
    stage_mode: net.stage_mode || false,
    priority: net.priority || 2,
    allowed_role_tags: net.allowed_role_tags?.join(', ') || '',
    is_default_for_squad: net.is_default_for_squad || false
  } : {
    code: '',
    label: '',
    type: 'squad',
    discipline: 'casual',
    linked_squad_id: '',
    min_rank_to_tx: 'Vagrant',
    min_rank_to_rx: 'Vagrant',
    stage_mode: false,
    priority: 2,
    allowed_role_tags: '',
    is_default_for_squad: false
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = 'Code is required';
    if (!formData.label.trim()) newErrors.label = 'Label is required';
    if (formData.code && formData.code.length > 20) newErrors.code = 'Code must be 20 characters or less';
    if (formData.label && formData.label.length > 100) newErrors.label = 'Label must be 100 characters or less';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = {
        ...formData,
        allowed_role_tags: formData.allowed_role_tags
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0),
        priority: parseInt(formData.priority)
      };
      await onSubmit(submitData);
    } catch (error) {
      toast.error(error.message || 'Failed to save net');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle>{net ? 'Edit Voice Net' : 'Create New Voice Net'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-sm font-semibold mb-2 block">
                Net Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                placeholder="e.g., COMMAND, ALPHA"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="bg-zinc-800 border-zinc-700"
                maxLength={20}
              />
              {errors.code && <p className="text-xs text-red-400 mt-1">{errors.code}</p>}
            </div>
            <div>
              <Label htmlFor="label" className="text-sm font-semibold mb-2 block">
                Label <span className="text-red-500">*</span>
              </Label>
              <Input
                id="label"
                placeholder="e.g., Ground Team Alpha"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="bg-zinc-800 border-zinc-700"
                maxLength={100}
              />
              {errors.label && <p className="text-xs text-red-400 mt-1">{errors.label}</p>}
            </div>
          </div>

          {/* Type & Discipline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type" className="text-sm font-semibold mb-2 block">
                Net Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {NET_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="discipline" className="text-sm font-semibold mb-2 block">
                Discipline
              </Label>
              <Select value={formData.discipline} onValueChange={(value) => setFormData({ ...formData, discipline: value })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {DISCIPLINES.map(disc => (
                    <SelectItem key={disc} value={disc}>
                      {disc.charAt(0).toUpperCase() + disc.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Squad Assignment */}
          <div>
            <Label htmlFor="squad" className="text-sm font-semibold mb-2 block">
              Assign to Squad (Optional)
            </Label>
            <Select value={formData.linked_squad_id} onValueChange={(value) => setFormData({ ...formData, linked_squad_id: value })}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700">
                <SelectValue placeholder="No squad assigned" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value={null}>None</SelectItem>
                {squads.map(squad => (
                  <SelectItem key={squad.id} value={squad.id}>
                    {squad.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rank Requirements */}
          <div className="space-y-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded">
            <div className="text-sm font-semibold text-zinc-300">Rank Requirements</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minRankRx" className="text-xs font-semibold mb-2 block">
                  Minimum Rank to Receive (RX)
                </Label>
                <Select value={formData.min_rank_to_rx} onValueChange={(value) => setFormData({ ...formData, min_rank_to_rx: value })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {RANK_OPTIONS.map(rank => (
                      <SelectItem key={rank} value={rank}>
                        {rank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="minRankTx" className="text-xs font-semibold mb-2 block">
                  Minimum Rank to Transmit (TX)
                </Label>
                <Select value={formData.min_rank_to_tx} onValueChange={(value) => setFormData({ ...formData, min_rank_to_tx: value })}>
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    {RANK_OPTIONS.map(rank => (
                      <SelectItem key={rank} value={rank}>
                        {rank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded">
            <div className="text-sm font-semibold text-zinc-300">Advanced Options</div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Stage Mode</Label>
                <p className="text-[10px] text-zinc-400 mt-1">Only commanders can grant TX permission</p>
              </div>
              <Switch
                checked={formData.stage_mode}
                onCheckedChange={(checked) => setFormData({ ...formData, stage_mode: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-semibold">Default for Squad</Label>
                <p className="text-[10px] text-zinc-400 mt-1">Auto-join squad members to this net</p>
              </div>
              <Switch
                checked={formData.is_default_for_squad}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default_for_squad: checked })}
              />
            </div>

            <div>
              <Label htmlFor="priority" className="text-xs font-semibold mb-2 block">
                Priority (1=Highest, 3=Lowest)
              </Label>
              <Select value={String(formData.priority)} onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="1">1 - Command (Highest)</SelectItem>
                  <SelectItem value="2">2 - Standard</SelectItem>
                  <SelectItem value="3">3 - Chatter (Lowest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="roles" className="text-xs font-semibold mb-2 block">
                Allowed Role Tags (comma-separated, optional)
              </Label>
              <Input
                id="roles"
                placeholder="e.g., MEDIC, LEAD, SPECIALIST"
                value={formData.allowed_role_tags}
                onChange={(e) => setFormData({ ...formData, allowed_role_tags: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-xs"
              />
              <p className="text-[10px] text-zinc-400 mt-1">Leave empty for all roles</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-emerald-900 hover:bg-emerald-800"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (net ? 'Update Net' : 'Create Net')}
        </Button>
      </div>
    </form>
  );
}