/**
 * Voice Notifications — Rate-limited join/leave/error notifications
 */

import { useEffect, useRef } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';

const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_EVENTS_PER_WINDOW = 3;

/**
 * useVoiceNotifications — Handle voice net events with rate limiting
 */
export function useVoiceNotifications(voiceNet) {
  const { addNotification } = useNotification();
  const eventQueueRef = useRef([]);
  const lastParticipantsRef = useRef([]);

  useEffect(() => {
    const now = Date.now();
    const currentParticipants = voiceNet.participants;
    const lastParticipants = lastParticipantsRef.current;

    // Detect joins
    const joined = currentParticipants.filter(
      (p) => !lastParticipants.some((lp) => lp.userId === p.userId)
    );

    // Detect leaves
    const left = lastParticipants.filter(
      (lp) => !currentParticipants.some((p) => p.userId === lp.userId)
    );

    // Rate limiting: prune old events
    eventQueueRef.current = eventQueueRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );

    // Show notifications if under limit
    if (eventQueueRef.current.length < MAX_EVENTS_PER_WINDOW) {
      joined.forEach((p) => {
        addNotification({
          type: 'info',
          message: `${p.callsign} joined the net`,
          duration: 3000,
        });
        eventQueueRef.current.push(now);
      });

      left.forEach((p) => {
        addNotification({
          type: 'info',
          message: `${p.callsign} left the net`,
          duration: 3000,
        });
        eventQueueRef.current.push(now);
      });
    }

    lastParticipantsRef.current = currentParticipants;
  }, [voiceNet.participants, addNotification]);

  // Reconnecting notification
  useEffect(() => {
    if (voiceNet.connectionState === 'RECONNECTING') {
      addNotification({
        type: 'warning',
        message: 'Voice connection lost. Reconnecting...',
        duration: 0, // Persistent until resolved
      });
    } else if (voiceNet.connectionState === 'CONNECTED') {
      addNotification({
        type: 'success',
        message: 'Voice connection restored',
        duration: 3000,
      });
    }
  }, [voiceNet.connectionState, addNotification]);

  // Error notification
  useEffect(() => {
    if (voiceNet.error) {
      addNotification({
        type: 'error',
        message: `Voice error: ${voiceNet.error}`,
        duration: 5000,
      });
    }
  }, [voiceNet.error, addNotification]);
}