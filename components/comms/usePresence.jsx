import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function usePresence(userId, netId, eventId = null) {
  const lastUpdateRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const updatePresence = async () => {
      try {
        const response = await base44.functions.invoke('updateUserPresence', {
          status: netId ? 'in-call' : 'online',
          netId: netId || null,
          eventId: eventId || null,
          isTransmitting: false
        });
        
        if (response.data?.presence) {
          lastUpdateRef.current = response.data.presence;
        }
      } catch (error) {
        console.error('[PRESENCE] Failed to update:', error);
      }
    };

    // Initial update on mount or net change
    updatePresence();
    
    // Heartbeat every 10 seconds while on net
    const interval = netId ? setInterval(updatePresence, 10000) : null;

    return () => {
      if (interval) clearInterval(interval);
      
      // Set offline when leaving net
      if (netId) {
        base44.functions.invoke('updateUserPresence', {
          status: 'online',
          netId: null,
          eventId: null,
          isTransmitting: false
        }).catch(() => {});
      }
    };
  }, [userId, netId, eventId]);

  return {
    setTransmitting: useCallback(async (isTransmitting) => {
      if (!userId) return;
      
      try {
        const response = await base44.functions.invoke('updateUserPresence', {
          status: isTransmitting ? 'transmitting' : 'in-call',
          netId: netId || null,
          eventId: eventId || null,
          isTransmitting
        });
        
        if (response.data?.presence) {
          lastUpdateRef.current = response.data.presence;
        }
      } catch (error) {
        console.error('[PRESENCE] Failed to update transmitting:', error);
      }
    }, [userId, netId, eventId])
  };
}