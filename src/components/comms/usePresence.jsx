import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export function usePresence(userId, netId, eventId = null) {
  const presenceIdRef = useRef(null);

  useEffect(() => {
    if (!userId || !netId) return;

    const updatePresence = async () => {
      try {
        const existing = await base44.entities.UserPresence.filter({
          user_id: userId,
          net_id: netId
        });

        if (existing.length > 0) {
          await base44.entities.UserPresence.update(existing[0].id, {
            last_activity: new Date().toISOString(),
            status: 'online'
          });
          presenceIdRef.current = existing[0].id;
        } else {
          const created = await base44.entities.UserPresence.create({
            user_id: userId,
            net_id: netId,
            event_id: eventId,
            status: 'online',
            last_activity: new Date().toISOString()
          });
          presenceIdRef.current = created.id;
        }
      } catch (error) {
        console.error('[PRESENCE] Failed to update:', error);
      }
    };

    updatePresence();
    const interval = setInterval(updatePresence, 5000);

    return () => {
      clearInterval(interval);
      if (presenceIdRef.current) {
        base44.entities.UserPresence.update(presenceIdRef.current, {
          status: 'offline',
          last_activity: new Date().toISOString()
        }).catch(() => {});
      }
    };
  }, [userId, netId, eventId]);

  return {
    setTransmitting: async (isTransmitting) => {
      if (presenceIdRef.current) {
        try {
          await base44.entities.UserPresence.update(presenceIdRef.current, {
            is_transmitting: isTransmitting,
            last_activity: new Date().toISOString()
          });
        } catch (error) {
          console.error('[PRESENCE] Failed to update transmitting:', error);
        }
      }
    }
  };
}