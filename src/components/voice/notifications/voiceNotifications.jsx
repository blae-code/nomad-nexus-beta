/**
 * Voice Notifications Module
 * Rate-limited notifications for voice events
 */

import { useEffect, useRef } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
const MAX_EVENTS_PER_WINDOW = 3;

/**
 * Hook to manage voice event notifications
 */
export function useVoiceNotifications(voiceNet) {
  const { addNotification } = useNotification();
  const lastParticipantsRef = useRef([]);
  const eventQueueRef = useRef([]);
  const lastStateRef = useRef(VOICE_CONNECTION_STATE.IDLE);
  const reconnectNotificationIdRef = useRef(null);

  // Track participant changes (join/leave)
  useEffect(() => {
    const currentParticipants = voiceNet.participants;
    const lastParticipants = lastParticipantsRef.current;

    if (!voiceNet.activeNetId) {
      lastParticipantsRef.current = [];
      return;
    }

    // Detect joins
    const joined = currentParticipants.filter(
      (p) => !lastParticipants.find((lp) => lp.userId === p.userId)
    );

    // Detect leaves
    const left = lastParticipants.filter(
      (lp) => !currentParticipants.find((p) => p.userId === lp.userId)
    );

    // Rate-limited notifications
    const now = Date.now();
    eventQueueRef.current = eventQueueRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );

    // Notify joins
    joined.forEach((participant) => {
      if (eventQueueRef.current.length < MAX_EVENTS_PER_WINDOW) {
        addNotification({
          type: 'info',
          message: `${participant.callsign} joined the net`,
          duration: 3000,
        });
        eventQueueRef.current.push(now);
      }
    });

    // Notify leaves
    left.forEach((participant) => {
      if (eventQueueRef.current.length < MAX_EVENTS_PER_WINDOW) {
        addNotification({
          type: 'info',
          message: `${participant.callsign} left the net`,
          duration: 3000,
        });
        eventQueueRef.current.push(now);
      }
    });

    lastParticipantsRef.current = currentParticipants;
  }, [voiceNet.participants, voiceNet.activeNetId, addNotification]);

  // Track connection state changes
  useEffect(() => {
    const currentState = voiceNet.connectionState;
    const lastState = lastStateRef.current;

    // Reconnecting
    if (currentState === VOICE_CONNECTION_STATE.RECONNECTING && lastState === VOICE_CONNECTION_STATE.CONNECTED) {
      const notifId = addNotification({
        type: 'warning',
        message: 'Voice connection lost. Reconnecting...',
        duration: 0, // Persistent
      });
      reconnectNotificationIdRef.current = notifId;
    }

    // Reconnected
    if (currentState === VOICE_CONNECTION_STATE.CONNECTED && lastState === VOICE_CONNECTION_STATE.RECONNECTING) {
      addNotification({
        type: 'success',
        message: 'Voice connection restored',
        duration: 3000,
      });
      reconnectNotificationIdRef.current = null;
    }

    lastStateRef.current = currentState;
  }, [voiceNet.connectionState, addNotification]);

  // Track errors
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