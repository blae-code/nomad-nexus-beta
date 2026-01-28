import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function IncidentChannelCreator({ incident }) {
  const [channelName, setChannelName] = useState(`incident-${incident?.id?.slice(0, 8) || 'new'}`);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createChannelMutation = useMutation({
    mutationFn: async () => {
      const channel = await base44.entities.Channel.create({
        name: channelName,
        description: `Emergency channel for incident: ${incident?.title || 'Untitled'}`,
        is_private: false
      });

      // Link channel to incident
      await base44.entities.Incident.update(incident.id, {
        assigned_channel_id: channel.id
      });

      return channel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['incidents']);
      queryClient.invalidateQueries(['channels']);
      toast.success('Incident channel created');
      setOpen(false);
    },
    onError: () => toast.error('Failed to create channel')
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Plus className="w-3 h-3" />
          Create Incident Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Create Incident Channel
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Channel Name</label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="incident-name"
              className="bg-zinc-900 border-zinc-800"
            />
          </div>
          <div className="text-xs text-zinc-500">
            This will create a temporary coordination channel for incident response.
          </div>
          <Button
            onClick={() => createChannelMutation.mutate()}
            disabled={!channelName || createChannelMutation.isPending}
            className="w-full"
          >
            Create Channel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}