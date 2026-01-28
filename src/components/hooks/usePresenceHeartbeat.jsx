/**
 * Presence Heartbeat Hook
 * Writes presence on load and periodically; visibility-aware
 */

import { useEffect, useRef } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { createPresenceRecord, getOrCreateClientId } from '@/components/models/presence';
import * as presenceService from '@/components/services/presenceService';

const HEARTBEAT_INTERVAL_MS = 25000; // 25 seconds
const CLEANUP_INTERVAL_MS = 60000;   // 60 seconds

/**
 * usePresenceHeartbeat
 * Manages user presence heartbeat: writes on load, periodic updates, visibility-aware pause
 * @param {Object} [config] - { intervalMs, enabled }
 */
export function usePresenceHeartbeat(config = {}) {
  const { intervalMs = HEARTBEAT_INTERVAL_MS, enabled = true } = config;
  const { user } = useCurrentUser();
  const clientIdRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const cleanupIntervalRef = useRef(null);
  const lastWriteRef = useRef({
    success: false,
    at: null,
    failureCount: 0,
  });

  // Initial write on mount
  useEffect(() => {
    if (!enabled || !user || !user.id) return;

    clientIdRef.current = getOrCreateClientId();

    // Write presence immediately
    const writePresenceImmediately = async () => {
      try {
        const presenceRecord = createPresenceRecord(user, clientIdRef.current, {
          route: window.location.pathname,
        });
        await presenceService.writePresence(presenceRecord);
        lastWriteRef.current = {
          success: true,
          at: new Date().toISOString(),
          failureCount: 0,
        };
      } catch (error) {
        console.error('[usePresenceHeartbeat] Initial write failed:', error);
        lastWriteRef.current.failureCount += 1;
      }
    };

    writePresenceImmediately();

    // Periodic heartbeat
    const startHeartbeat = () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          const presenceRecord = createPresenceRecord(user, clientIdRef.current, {
            route: window.location.pathname,
          });
          await presenceService.writePresence(presenceRecord);
          lastWriteRef.current = {
            success: true,
            at: new Date().toISOString(),
            failureCount: 0,
          };
        } catch (error) {
          console.error('[usePresenceHeartbeat] Heartbeat write failed:', error);
          lastWriteRef.current.failureCount += 1;
        }
      }, intervalMs);
    };

    // Cleanup interval (prune old offline records)
    if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
    cleanupIntervalRef.current = setInterval(async () => {
      try {
        await presenceService.cleanupOfflineRecords();
      } catch (error) {
        console.error('[usePresenceHeartbeat] Cleanup failed:', error);
      }
    }, CLEANUP_INTERVAL_MS);

    startHeartbeat();

    // Visibility-aware pause/resume
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden; pause heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        // Tab is visible; resume heartbeat (write immediately + restart interval)
        writePresenceImmediately();
        startHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Final write on unload (best-effort)
    const handleBeforeUnload = async () => {
      try {
        const presenceRecord = createPresenceRecord(user, clientIdRef.current, {
          route: window.location.pathname,
        });
        // Send beacon if available (async, non-blocking)
        if (navigator.sendBeacon) {
          // For now, just clear the interval; real impl would POST to endpoint
        }
        await presenceService.writePresence(presenceRecord);
      } catch (error) {
        // Suppress errors on unload
        console.debug('[usePresenceHeartbeat] Unload write suppressed');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (cleanupIntervalRef.current) clearInterval(cleanupIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, user]);

  return {
    lastWrite: lastWriteRef.current,
  };
}

export default usePresenceHeartbeat;