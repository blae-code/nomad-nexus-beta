import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function ChannelCreateDialog({ trigger, onChannelCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      return await base44.entities.Channel.create({
        name: name.toLowerCase().trim(),
        description,
        is_private: isPrivate
      });
    },
    onSuccess: (channel) => {
      queryClient.invalidateQueries(['channels']);
      toast.success(`Channel #${name} created`);
      setOpen(false);
      setName('');
      setDescription('');
      setIsPrivate(false);
      onChannelCreated?.(channel);
    },
    onError: () => toast.error('Failed to create channel')
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Channel name required');
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="w-3 h-3" />
            New Channel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-200 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create Channel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">
              Channel Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="operations"
              className="bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">
              Description (optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Channel purpose..."
              className="bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>

          <div className="flex items-center gap-3 p-3 border border-zinc-800 bg-zinc-900/30 rounded">
            <label className="flex items-center gap-2 cursor-pointer flex-1">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-xs text-zinc-300 flex items-center gap-1">
                {isPrivate && <Lock className="w-3 h-3 text-yellow-500" />}
                Private Channel
              </span>
            </label>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
              className="flex-1 text-xs h-8 bg-[#ea580c] hover:bg-[#c2410c]"
            >
              Create
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1 text-xs h-8"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}