import { useEffect } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  canRunDataOpsScheduler,
  DATA_OPS_SCHEDULER_CONFIG,
  ensureSchedulerTabId,
  readSchedulerTelemetry,
  recordSchedulerError,
  recordSchedulerRun,
  releaseSchedulerLease,
  summarizeDueSyncPayload,
  tryAcquireSchedulerLease,
} from '@/components/admin/dataOpsScheduler';

function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export default function FittingDataOpsScheduler() {
  const { user: authUser, initialized, loading } = useAuth();
  const schedulerEnabled = initialized && !loading && canRunDataOpsScheduler(authUser);

  useEffect(() => {
    if (!schedulerEnabled) return undefined;
    const storage = getStorage();
    if (!storage) return undefined;
    const tabId = ensureSchedulerTabId(getSessionStorage() || storage);
    let cancelled = false;
    let interval = null;
    let startupTimer = null;

    const execute = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = Date.now();
      const lease = tryAcquireSchedulerLease(storage, tabId, now, DATA_OPS_SCHEDULER_CONFIG.leaseMs);
      if (!lease.acquired) return;

      const telemetry = readSchedulerTelemetry(storage, now);
      if (!telemetry.runDue) return;

      try {
        const response = await invokeMemberFunction('updateFittingDataOps', {
          action: 'run_due_syncs',
          mode: 'auto',
          emitAlerts: true,
        });
        const payload = response?.data || response;
        if (!payload?.success) {
          recordSchedulerError(storage, payload?.error || 'run_due_syncs failed', Date.now());
          return;
        }
        recordSchedulerRun(storage, summarizeDueSyncPayload(payload), Date.now());
      } catch (error) {
        recordSchedulerError(storage, error?.data?.error || error?.message || 'run_due_syncs failed', Date.now());
      }
    };

    const start = () => {
      const jitter = Math.floor(Math.random() * DATA_OPS_SCHEDULER_CONFIG.startupJitterMs);
      startupTimer = window.setTimeout(() => {
        execute();
        interval = window.setInterval(execute, DATA_OPS_SCHEDULER_CONFIG.intervalMs);
      }, jitter);
    };

    const handleVisibility = () => {
      if (document.hidden) return;
      execute();
    };

    const handleBeforeUnload = () => {
      releaseSchedulerLease(storage, tabId);
    };

    start();
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      cancelled = true;
      if (startupTimer) window.clearTimeout(startupTimer);
      if (interval) window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      releaseSchedulerLease(storage, tabId);
    };
  }, [schedulerEnabled, authUser?.id]);

  return null;
}
