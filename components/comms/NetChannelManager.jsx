import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export default function NetChannelManager({ netId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_read_only: false
  });
  const queryClient = useQueryClient();

  // Fetch channels for this net
  const { data: channels = [] } = useQuery({
    queryKey: ['net-channels', netId],
    queryFn: async () => {
      const allChannels = await base44.entities.Channel.filter({ squad_id: netId });
      return allChannels;
    },
    enabled: !!netId
  });

  // Create/Update channel mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      const channelData = {
        ...data,
        squad_id: netId,
        type: 'text',
        category: 'squad'
      };
      
      if (editingChannel) {
        return base44.entities.Channel.update(editingChannel.id, channelData);
      }
      return base44.entities.Channel.create(channelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-channels', netId] });
      resetForm();
      toast.success(editingChannel ? 'Channel updated' : 'Channel created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save channel');
    }
  });

  // Delete channel mutation
  const deleteMutation = useMutation({
    mutationFn: (channelId) => base44.entities.Channel.delete(channelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-channels', netId] });
      toast.success('Channel deleted');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete channel');
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', is_read_only: false });
    setEditingChannel(null);
    setShowForm(false);
  };

  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.rules || '',
      is_read_only: channel.is_read_only || false
    });
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Channel name is required');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm text-zinc-300">Text Channels</h3>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
            className="gap-1 text-xs h-7"
          >
            <Plus className="w-3 h-3" />
            Add Channel
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="bg-zinc-950/80 border-zinc-700">
          <CardContent className="pt-4 space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Channel Name</Label>
              <Input
                placeholder="e.g., general, planning, reports"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-xs"
                maxLength={50}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Description (optional)</Label>
              <Textarea
                placeholder="Channel purpose and guidelines"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-xs h-16"
                maxLength={200}
              />
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-800/50 rounded">
              <Label className="text-xs font-semibold">Read-Only Channel</Label>
              <Switch
                checked={formData.is_read_only}
                onCheckedChange={(checked) => setFormData({ ...formData, is_read_only: checked })}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
                className="text-xs h-7"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saveMutation.isPending}
                className="bg-emerald-900 hover:bg-emerald-800 text-xs h-7 flex-1"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Channel'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channels List */}
      <div className="space-y-2">
        {channels.length === 0 ? (
          <p className="text-xs text-zinc-500 italic text-center py-4">
            No channels yet. Create one to enable text communications.
          </p>
        ) : (
          channels.map(channel => (
            <div
              key={channel.id}
              className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded hover:bg-zinc-800 transition-colors group"
            >
              <MessageSquare className="w-3 h-3 text-zinc-500" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-300 truncate">
                    #{channel.name}
                  </span>
                  {channel.is_read_only && (
                    <Badge className="text-[8px] px-1 py-0 bg-amber-950 text-amber-400 border-amber-700">
                      RO
                    </Badge>
                  )}
                </div>
                {channel.rules && (
                  <p className="text-[10px] text-zinc-500 truncate">{channel.rules}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleEdit(channel)}
                className="text-zinc-500 hover:text-blue-400 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  if (confirm(`Delete #${channel.name}?`)) {
                    deleteMutation.mutate(channel.id);
                  }
                }}
                className="text-zinc-500 hover:text-red-400 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}