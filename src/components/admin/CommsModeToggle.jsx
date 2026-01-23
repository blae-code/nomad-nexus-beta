import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Radio, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { hasRank } from '@/components/admin/cockpitSectionConfig';

export default function CommsModeToggle({ user }) {
  const queryClient = useQueryClient();

  // Fetch current comms mode (always LIVE)
  const { data: commsMode = { mode: 'LIVE' } } = useQuery({
    queryKey: ['comms-mode'],
    queryFn: async () => {
      const modes = await base44.entities.CommsMode.list();
      return modes[0] || { mode: 'LIVE' };
    },
    staleTime: 5000
  });

  const canManage = hasRank(user, 'founder');

  // Ensure LIVE mode on mount
  React.useEffect(() => {
    const ensureLiveMode = async () => {
      try {
        const modes = await base44.entities.CommsMode.list();
        const mode = modes[0];
        
        if (mode?.mode !== 'LIVE') {
          const user = await base44.auth.me();
          if (mode?.id) {
            await base44.entities.CommsMode.update(mode.id, {
              mode: 'LIVE',
              last_changed_by: user.id,
              last_changed_at: new Date().toISOString()
            });
          } else {
            await base44.entities.CommsMode.create({
              mode: 'LIVE',
              last_changed_by: user.id,
              last_changed_at: new Date().toISOString()
            });
          }
          queryClient.invalidateQueries({ queryKey: ['comms-mode'] });
        }
      } catch (err) {
        console.error('Failed to ensure LIVE mode:', err);
      }
    };
    
    ensureLiveMode();
  }, [queryClient]);

  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-4 rounded space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#ea580c]" />
          <span className="text-sm font-bold uppercase tracking-wider">COMMS MODE</span>
        </div>
        <Badge className="font-mono text-xs bg-green-950 text-green-400 border-green-800 border">
          LIVE
        </Badge>
      </div>

      <p className="text-xs text-zinc-400">
        Live mode: Real LiveKit connections. Two browsers can join the same room and communicate.
      </p>
    </div>
  );
}