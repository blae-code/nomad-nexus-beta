import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Hash, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUserRankValue } from '@/components/utils/rankUtils';

export default function ChannelManager({ user }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const queryClient = useQueryClient();

  const canManageChannels = getUserRankValue(user?.rank) >= getUserRankValue('Scout');

  const [formData, setFormData] = useState({
    name: '',
    category: 'casual',
    access_min_rank: 'Vagrant',
    is_read_only: false,
    rules: ''
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['manageable-channels'],
    queryFn: async () => {
      try {
        return await base44.entities.Channel.filter({});
      } catch (error) {
        console.error('[CHANNEL] Fetch error:', error);
        return [];
      }
    },
    enabled: canManageChannels
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Channel.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manageable-channels'] });
      queryClient.invalidateQueries({ queryKey: ['ready-room-channels'] });
      toast.success('Channel created');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => toast.error(`Failed to create: ${error.message}`)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Channel.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manageable-channels'] });
      queryClient.invalidateQueries({ queryKey: ['ready-room-channels'] });
      toast.success('Channel updated');
      setEditingChannel(null);
      resetForm();
    },
    onError: (error) => toast.error(`Failed to update: ${error.message}`)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Channel.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manageable-channels'] });
      queryClient.invalidateQueries({ queryKey: ['ready-room-channels'] });
      toast.success('Channel deleted');
    },
    onError: (error) => toast.error(`Failed to delete: ${error.message}`)
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'casual',
      access_min_rank: 'Vagrant',
      is_read_only: false,
      rules: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      type: 'text'
    };

    if (editingChannel) {
      updateMutation.mutate({ id: editingChannel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const startEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      category: channel.category || 'casual',
      access_min_rank: channel.access_min_rank || 'Vagrant',
      is_read_only: channel.is_read_only || false,
      rules: channel.rules || ''
    });
    setIsCreateOpen(true);
  };

  if (!canManageChannels) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Channel Management</div>
          <div className="text-[10px] text-zinc-600 font-mono">SCOUT+ ACCESS</div>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingChannel(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#ea580c] hover:bg-[#c2410c] gap-2">
              <Plus className="w-3 h-3" />
              New Channel
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-[#ea580c] uppercase tracking-wide">
                {editingChannel ? 'Edit Channel' : 'Create Channel'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Channel Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-zinc-950 border-zinc-800"
                  placeholder="e.g., general-chat"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Category</Label>
                <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="focused">Focused</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Minimum Rank</Label>
                <Select value={formData.access_min_rank} onValueChange={(val) => setFormData({ ...formData, access_min_rank: val })}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    <SelectItem value="Vagrant">Vagrant</SelectItem>
                    <SelectItem value="Scout">Scout</SelectItem>
                    <SelectItem value="Voyager">Voyager</SelectItem>
                    <SelectItem value="Founder">Founder</SelectItem>
                    <SelectItem value="Pioneer">Pioneer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800">
                <Label className="text-xs text-zinc-400">Read-Only</Label>
                <Switch
                  checked={formData.is_read_only}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_read_only: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">Rules (Optional)</Label>
                <Textarea
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  className="bg-zinc-950 border-zinc-800 h-20"
                  placeholder="Channel guidelines..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1 bg-[#ea580c] hover:bg-[#c2410c]">
                  {editingChannel ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingChannel(null);
                  resetForm();
                }} className="border-zinc-700">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {channels.map(channel => (
          <div key={channel.id} className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800 group hover:border-zinc-700">
            <div className="flex items-center gap-2">
              <Hash className="w-3 h-3 text-zinc-600" />
              <div>
                <div className="text-xs font-bold text-zinc-300">{channel.name}</div>
                <div className="text-[9px] text-zinc-600 font-mono">{channel.category}</div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" onClick={() => startEdit(channel)} className="h-6 w-6">
                <Pencil className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => {
                if (confirm(`Delete channel "${channel.name}"?`)) {
                  deleteMutation.mutate(channel.id);
                }
              }} className="h-6 w-6 text-red-500 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}