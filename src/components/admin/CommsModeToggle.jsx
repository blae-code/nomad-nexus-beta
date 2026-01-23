import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CommsModeToggle() {
  const queryClient = useQueryClient();

  // Fetch current comms mode
  const { data: commsMode = { mode: 'SIM' } } = useQuery({
    queryKey: ['comms-mode'],
    queryFn: async () => {
      const modes = await base44.entities.CommsMode.list();
      return modes[0] || { mode: 'SIM' };
    },
    staleTime: 5000
  });

  // Toggle mode mutation
  const toggleMutation = useMutation({
    mutationFn: async () => {
      const newMode = commsMode?.mode === 'SIM' ? 'LIVE' : 'SIM';
      
      if (commsMode?.id) {
        await base44.entities.CommsMode.update(commsMode.id, {
          mode: newMode,
          last_changed_by: (await base44.auth.me()).id,
          last_changed_at: new Date().toISOString()
        });
      } else {
        await base44.entities.CommsMode.create({
          mode: newMode,
          last_changed_by: (await base44.auth.me()).id,
          last_changed_at: new Date().toISOString()
        });
      }
      
      return newMode;
    },
    onSuccess: (newMode) => {
      queryClient.invalidateQueries({ queryKey: ['comms-mode'] });
      toast.success(`Comms mode: ${newMode}`);
    },
    onError: (err) => {
      toast.error(`Failed to toggle mode: ${err.message}`);
    }
  });

  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#ea580c]" />
          <span className="text-sm font-bold uppercase tracking-wider">COMMS MODE</span>
        </div>
        <Badge className={cn(
          'font-mono text-xs',
          commsMode?.mode === 'LIVE'
            ? 'bg-green-950 text-green-400 border-green-800'
            : 'bg-amber-950 text-amber-400 border-amber-800'
        )}>
          {commsMode?.mode || 'UNKNOWN'}
        </Badge>
      </div>

      <p className="text-xs text-zinc-400">
        {commsMode?.mode === 'SIM'
          ? 'Simulated mode: Participants and nets are realistic but not connected to LiveKit.'
          : 'Live mode: Real LiveKit connections. Two browsers can join the same room and communicate.'}
      </p>

      <Button
        onClick={() => toggleMutation.mutate()}
        disabled={toggleMutation.isPending}
        className={cn(
          'w-full text-xs h-8',
          commsMode?.mode === 'LIVE'
            ? 'bg-amber-950 hover:bg-amber-900 text-amber-400 border border-amber-800'
            : 'bg-green-950 hover:bg-green-900 text-green-400 border border-green-800'
        )}
      >
        {toggleMutation.isPending ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Switching...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Switch to {commsMode?.mode === 'SIM' ? 'LIVE' : 'SIM'}
          </>
        )}
      </Button>
    </div>
  );
}