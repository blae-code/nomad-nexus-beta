import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Constants for cache times
const SESSION_CACHE_TIME = 1000 * 60 * 60; // 1 hour (effectively session)
const VOLATILE_POLL_INTERVAL = 5000; // 5 seconds

/**
 * Hook for "Core Data Pool" - Rarely changing organizational data.
 * Fetches once per session (long staleTime).
 */
export function useCoreData() {
  const squads = useQuery({
    queryKey: ['core-squads'],
    queryFn: () => base44.entities.Squad.list(),
    staleTime: SESSION_CACHE_TIME,
    gcTime: SESSION_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const channels = useQuery({
    queryKey: ['core-channels'],
    queryFn: () => base44.entities.Channel.list(),
    staleTime: SESSION_CACHE_TIME,
    gcTime: SESSION_CACHE_TIME,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  return {
    squads: squads.data || [],
    channels: channels.data || [],
    isLoading: squads.isLoading || channels.isLoading,
    error: squads.error || channels.error
  };
}

/**
 * Hook for "Volatile Comms Data" - Focused Polling.
 * Polls getCommsRoomStatus backend function.
 */
export function useCommsStatus(roomId) {
  return useQuery({
    queryKey: ['comms-room-status', roomId],
    queryFn: async () => {
      if (!roomId) return null;
      const { data } = await base44.functions.invoke('getCommsRoomStatus', { roomName: roomId });
      return data;
    },
    enabled: !!roomId,
    refetchInterval: VOLATILE_POLL_INTERVAL,
    refetchOnWindowFocus: true
  });
}

/**
 * Hook for "Active Rescue Ops" - Focused Polling.
 * Polls RescueRequest entity.
 */
export function useActiveRescueOps() {
  return useQuery({
    queryKey: ['nav-rescue-check-volatile'],
    queryFn: async () => {
      const distress = await base44.entities.RescueRequest.list({
        filter: { status: 'ACTIVE' },
        limit: 5
      });
      return distress;
    },
    refetchInterval: VOLATILE_POLL_INTERVAL,
    refetchOnWindowFocus: true
  });
}