import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useEffect, useState } from 'react';

export function useCommsMode() {
  const queryClient = useQueryClient();
  const [localMode, setLocalMode] = useState(null);

  // Fetch current comms mode
  const { data: commsModeRecord, isLoading } = useQuery({
    queryKey: ['commsMode'],
    queryFn: async () => {
      try {
        const records = await base44.entities.CommsMode.list();
        return records[0] || null;
      } catch (err) {
        console.warn('[COMMS MODE] Failed to fetch:', err.message);
        return null;
      }
    },
    staleTime: 5000,
    refetchInterval: 10000
  });

  // Subscribe to real-time changes
  useEffect(() => {
    const unsubscribe = base44.entities.CommsMode.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['commsMode'] });
    });
    return () => unsubscribe?.();
  }, [queryClient]);

  // Mutation to toggle mode
  const toggleModeMutation = useMutation({
    mutationFn: async (newMode) => {
      const user = await base44.auth.me();
      if (!commsModeRecord) {
        // Create if doesn't exist
        return await base44.asServiceRole.entities.CommsMode.create({
          mode: newMode,
          last_changed_by: user.id,
          last_changed_at: new Date().toISOString()
        });
      } else {
        // Update existing
        return await base44.asServiceRole.entities.CommsMode.update(commsModeRecord.id, {
          mode: newMode,
          last_changed_by: user.id,
          last_changed_at: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commsMode'] });
    }
  });

  const mode = commsModeRecord?.mode || 'SIM';
  const isLive = mode === 'LIVE';
  const isSim = mode === 'SIM';

  return {
    mode,
    isLive,
    isSim,
    isLoading,
    toggleMode: (newMode) => toggleModeMutation.mutate(newMode),
    isPending: toggleModeMutation.isPending,
    simConfig: commsModeRecord?.sim_config || { participant_count_range: [2, 8], activity_variance: 0.3 }
  };
}