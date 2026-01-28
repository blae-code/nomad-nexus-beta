import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Radio, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-[#ea580c]" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">COMMS MODE</span>
        </div>
        <Badge className={cn(
          'font-mono text-[8px] border',
          !canManage && 'opacity-75'
        )}>
          <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full mr-1" />
          LIVE
        </Badge>
      </div>

      <p className="text-[8px] text-zinc-500">
        Real LiveKit connections enabled. Ready for voice operations.
      </p>

      {!canManage && (
        <div className="text-[7px] flex items-center gap-1 text-zinc-600">
          <Lock className="w-2.5 h-2.5" />
          <span>Founder+ required to change</span>
        </div>
      )}
    </div>
  );
}