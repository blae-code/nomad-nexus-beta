/**
 * Presence Heartbeat Hook
 * Writes presence on load and periodically using a shared runtime
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { createPresenceRecord, getOrCreateClientId } from '@/components/models/presence';
import * as presenceService from '@/components/services/presenceService';

const HEARTBEAT_INTERVAL_MS = 25000; // 25 seconds
const CLEANUP_INTERVAL_MS = 60000;   // 60 seconds

const DEFAULT_LAST_WRITE = {
  success: false,
  at: null,
  failureCount: 0,
};

const heartbeatSubscribers = new Set();
let lastWriteSnapshot = { ...DEFAULT_LAST_WRITE };

const heartbeatRuntime = {
  user: null,
  clientId: null,
  intervalMs: HEARTBEAT_INTERVAL_MS,
  heartbeatTimer: null,
  cleanupTimer: null,
  visibilityHandler: null,
  beforeUnloadHandler: null,
  consumerCount: 0,
};

const notifySubscribers = () => {
  heartbeatSubscribers.forEach((listener) => {
    try {
      listener(lastWriteSnapshot);
    } catch {
      // ignore listener failures
    }
  });
};

const updateLastWrite = (next) => {
  lastWriteSnapshot = { ...next };
  notifySubscribers();
};

const clearHeartbeatTimer = () => {
  if (heartbeatRuntime.heartbeatTimer && typeof window !== 'undefined') {
    window.clearInterval(heartbeatRuntime.heartbeatTimer);
  }
  heartbeatRuntime.heartbeatTimer = null;
};

const clearCleanupTimer = () => {
  if (heartbeatRuntime.cleanupTimer && typeof window !== 'undefined') {
    window.clearInterval(heartbeatRuntime.cleanupTimer);
  }
  heartbeatRuntime.cleanupTimer = null;
};

const writePresence = async (statusOverride = null) => {
  const user = heartbeatRuntime.user;
  if (!user?.id || typeof window === 'undefined') return;

  try {
    const presenceRecord = createPresenceRecord(user, heartbeatRuntime.clientId, {
      route: window.location.pathname,
      ...(statusOverride ? { status: statusOverride } : {}),
      // activeNetId will be injected by VoiceNetProvider when connected
    });
    await presenceService.writePresence(presenceRecord);
    updateLastWrite({
      success: true,
      at: new Date().toISOString(),
      failureCount: 0,
    });
  } catch (error) {
    console.error('[usePresenceHeartbeat] Heartbeat write failed:', error);
    updateLastWrite({
      success: false,
      at: lastWriteSnapshot.at,
      failureCount: (lastWriteSnapshot.failureCount || 0) + 1,
    });
  }
};

const ensureHeartbeatTimer = () => {
  if (typeof window === 'undefined') return;
  if (!heartbeatRuntime.user?.id || heartbeatRuntime.heartbeatTimer || document.hidden) return;
  heartbeatRuntime.heartbeatTimer = window.setInterval(() => {
    writePresence().catch(() => {});
  }, heartbeatRuntime.intervalMs);
};

const ensureCleanupTimer = () => {
  if (typeof window === 'undefined' || heartbeatRuntime.cleanupTimer) return;
  heartbeatRuntime.cleanupTimer = window.setInterval(() => {
    presenceService.cleanupOfflineRecords().catch((error) => {
      console.error('[usePresenceHeartbeat] Cleanup failed:', error);
    });
  }, CLEANUP_INTERVAL_MS);
};

const attachRuntimeListeners = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (!heartbeatRuntime.visibilityHandler) {
    heartbeatRuntime.visibilityHandler = () => {
      if (document.hidden) {
        writePresence('idle').catch(() => {});
        clearHeartbeatTimer();
      } else {
        writePresence('online').catch(() => {});
        ensureHeartbeatTimer();
      }
    };
    document.addEventListener('visibilitychange', heartbeatRuntime.visibilityHandler);
  }

  if (!heartbeatRuntime.beforeUnloadHandler) {
    heartbeatRuntime.beforeUnloadHandler = () => {
      writePresence().catch(() => {});
    };
    window.addEventListener('beforeunload', heartbeatRuntime.beforeUnloadHandler);
  }
};

const detachRuntimeListeners = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if (heartbeatRuntime.visibilityHandler) {
    document.removeEventListener('visibilitychange', heartbeatRuntime.visibilityHandler);
    heartbeatRuntime.visibilityHandler = null;
  }

  if (heartbeatRuntime.beforeUnloadHandler) {
    window.removeEventListener('beforeunload', heartbeatRuntime.beforeUnloadHandler);
    heartbeatRuntime.beforeUnloadHandler = null;
  }
};

const startHeartbeatRuntime = (user, intervalMs) => {
  if (!user?.id) return;

  const interval = Number(intervalMs);
  const nextInterval = Number.isFinite(interval) && interval > 0 ? interval : HEARTBEAT_INTERVAL_MS;
  const userChanged = heartbeatRuntime.user?.id !== user.id;
  const intervalChanged = heartbeatRuntime.intervalMs !== nextInterval;

  heartbeatRuntime.user = user;
  heartbeatRuntime.clientId = heartbeatRuntime.clientId || getOrCreateClientId();
  heartbeatRuntime.intervalMs = nextInterval;

  if (intervalChanged) {
    clearHeartbeatTimer();
  }

  ensureCleanupTimer();
  attachRuntimeListeners();
  ensureHeartbeatTimer();

  if (userChanged || !lastWriteSnapshot.at) {
    writePresence().catch(() => {});
  }
};

const stopHeartbeatRuntime = () => {
  clearHeartbeatTimer();
  clearCleanupTimer();
  detachRuntimeListeners();
  heartbeatRuntime.user = null;
  heartbeatRuntime.clientId = null;
  heartbeatRuntime.intervalMs = HEARTBEAT_INTERVAL_MS;
};

/**
 * usePresenceHeartbeat
 * Manages user presence heartbeat: writes on load, periodic updates, visibility-aware pause
 * @param {Object} [config] - { intervalMs, enabled }
 */
export function usePresenceHeartbeat(config = {}) {
  const { intervalMs = HEARTBEAT_INTERVAL_MS, enabled = true } = config;
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const [lastWrite, setLastWrite] = useState(lastWriteSnapshot);

  useEffect(() => {
    if (!enabled || !user?.id) return undefined;

    const listener = (nextSnapshot) => {
      setLastWrite(nextSnapshot);
    };

    heartbeatSubscribers.add(listener);
    heartbeatRuntime.consumerCount += 1;
    listener(lastWriteSnapshot);
    startHeartbeatRuntime(user, intervalMs);

    return () => {
      heartbeatSubscribers.delete(listener);
      heartbeatRuntime.consumerCount = Math.max(0, heartbeatRuntime.consumerCount - 1);
      if (heartbeatRuntime.consumerCount === 0) {
        stopHeartbeatRuntime();
      }
    };
  }, [enabled, intervalMs, user?.id]);

  return {
    lastWrite,
  };
}

export default usePresenceHeartbeat;
