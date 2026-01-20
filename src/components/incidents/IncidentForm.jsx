import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Radio } from 'lucide-react';
import { toast } from 'sonner';

export default function IncidentForm({ isOpen, onClose, eventId, user }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'MEDIUM',
    incident_type: 'other',
    affected_area: '',
    assigned_net_id: '',
    assigned_channel_id: ''
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voice-nets-for-incident', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId, status: 'active' }),
    enabled: !!eventId
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels-for-incident'],
    queryFn: () => base44.entities.Channel.list()
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Incident.create({
      ...data,
      event_id: eventId,
      reported_by: user?.id,
      status: 'active',
      priority: data.severity === 'CRITICAL' ? 1 : data.severity === 'HIGH' ? 2 : 3
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Incident logged');
      resetForm();
      onClose();
    },
    onError: (error) => toast.error(`Failed to log incident: ${error.message}`)
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      severity: 'MEDIUM',
      incident_type: 'other',
      affected_area: '',
      assigned_net_id: '',
      assigned_channel_id: ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#ea580c] uppercase tracking-wide">
            <AlertTriangle className="w-5 h-5" />
            Log Incident
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Incident Title</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-zinc-950 border-zinc-800"
              placeholder="Brief description..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Severity</Label>
              <Select value={formData.severity} onValueChange={(val) => setFormData({ ...formData, severity: val })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Type</Label>
              <Select value={formData.incident_type} onValueChange={(val) => setFormData({ ...formData, incident_type: val })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="rescue">Rescue</SelectItem>
                  <SelectItem value="combat">Combat</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="environmental">Environmental</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Affected Area</Label>
            <Input
              value={formData.affected_area}
              onChange={(e) => setFormData({ ...formData, affected_area: e.target.value })}
              className="bg-zinc-950 border-zinc-800"
              placeholder="Location or coordinates..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-950 border-zinc-800 h-20"
              placeholder="Detailed incident report..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Assign Voice Net</Label>
              <Select value={formData.assigned_net_id} onValueChange={(val) => setFormData({ ...formData, assigned_net_id: val })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {voiceNets.map(net => (
                    <SelectItem key={net.id} value={net.id}>
                      {net.code} - {net.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Assign Channel</Label>
              <Select value={formData.assigned_channel_id} onValueChange={(val) => setFormData({ ...formData, assigned_channel_id: val })}>
                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {channels.map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={createMutation.isPending} className="flex-1 bg-[#ea580c] hover:bg-[#c2410c]">
              {createMutation.isPending ? 'Logging...' : 'Log Incident'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="border-zinc-700">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}