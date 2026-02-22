export const DATA_OPS_SCHEDULER_KEYS = {
  leaderLease: 'nexus.fitting_data_ops.scheduler.leader_lease',
  tabId: 'nexus.fitting_data_ops.scheduler.tab_id',
  lastRunAt: 'nexus.fitting_data_ops.scheduler.last_run_at',
  lastResult: 'nexus.fitting_data_ops.scheduler.last_result',
  lastError: 'nexus.fitting_data_ops.scheduler.last_error',
  voiceLifecycleFallbackEnabled: 'nexus.voice.lifecycle.scheduler.enabled',
};

export const DATA_OPS_SCHEDULER_CONFIG = {
  intervalMs: 120000,
  leaseMs: 180000,
  minRunIntervalMs: 90000,
  startupJitterMs: 20000,
};

function safeParseJson(value, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeGetItem(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function safeSetItem(storage, key, value) {
  try {
    storage?.setItem?.(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemoveItem(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // ignore
  }
}

function randomId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `tab-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

export function canRunDataOpsScheduler(user) {
  if (!user) return false;
  if (String(user.role || '').toLowerCase() === 'admin' || user.is_admin === true) return true;

  const profile = user.member_profile_data || user;
  const rank = String(profile?.rank || '').toUpperCase();
  if (rank === 'COMMANDER' || rank === 'PIONEER' || rank === 'FOUNDER') return true;

  const roles = Array.isArray(profile?.roles)
    ? profile.roles.map((entry) => String(entry || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('command') || roles.includes('operations');
}

export function ensureSchedulerTabId(storage) {
  const existing = safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.tabId);
  if (existing) return existing;
  const tabId = randomId();
  safeSetItem(storage, DATA_OPS_SCHEDULER_KEYS.tabId, tabId);
  return tabId;
}

export function getLeaderLease(storage) {
  return safeParseJson(safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.leaderLease), null);
}

export function tryAcquireSchedulerLease(storage, ownerId, nowMs = Date.now(), leaseMs = DATA_OPS_SCHEDULER_CONFIG.leaseMs) {
  if (!storage || !ownerId) return { acquired: false, ownerId: null, leaseUntil: 0, reason: 'missing_storage_or_owner' };
  const current = getLeaderLease(storage);
  const currentOwner = String(current?.ownerId || '');
  const currentLeaseUntil = Number(current?.leaseUntil || 0);
  const expired = !currentOwner || !Number.isFinite(currentLeaseUntil) || currentLeaseUntil <= nowMs;
  const ownedByCaller = currentOwner === ownerId;
  if (!expired && !ownedByCaller) {
    return { acquired: false, ownerId: currentOwner, leaseUntil: currentLeaseUntil, reason: 'held_by_other' };
  }

  const nextLease = {
    ownerId,
    leaseUntil: nowMs + Math.max(10000, Number(leaseMs || DATA_OPS_SCHEDULER_CONFIG.leaseMs)),
    heartbeatAt: new Date(nowMs).toISOString(),
  };
  const ok = safeSetItem(storage, DATA_OPS_SCHEDULER_KEYS.leaderLease, JSON.stringify(nextLease));
  if (!ok) {
    return { acquired: false, ownerId: currentOwner || ownerId, leaseUntil: currentLeaseUntil || 0, reason: 'persist_failed' };
  }
  return { acquired: true, ownerId, leaseUntil: nextLease.leaseUntil, reason: ownedByCaller ? 'renewed' : 'acquired' };
}

export function releaseSchedulerLease(storage, ownerId) {
  const current = getLeaderLease(storage);
  if (!current) return;
  if (String(current?.ownerId || '') !== String(ownerId || '')) return;
  safeRemoveItem(storage, DATA_OPS_SCHEDULER_KEYS.leaderLease);
}

export function readSchedulerTelemetry(storage, nowMs = Date.now()) {
  const lastRunAt = Number(safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.lastRunAt) || 0);
  const lease = getLeaderLease(storage);
  const result = safeParseJson(safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.lastResult), null);
  const error = safeParseJson(safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.lastError), null);
  const voiceLifecycleFallbackEnabled = safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.voiceLifecycleFallbackEnabled) === 'true';
  const runDue = !lastRunAt || (nowMs - lastRunAt) >= DATA_OPS_SCHEDULER_CONFIG.minRunIntervalMs;
  const leaderActive = Boolean(lease?.ownerId) && Number(lease?.leaseUntil || 0) > nowMs;
  return {
    runDue,
    lastRunAt,
    lastRunAgeMs: lastRunAt ? Math.max(0, nowMs - lastRunAt) : null,
    leaderLease: lease,
    leaderActive,
    lastResult: result,
    lastError: error,
    voiceLifecycleFallbackEnabled,
  };
}

export function readVoiceLifecycleFallbackEnabled(storage) {
  return safeGetItem(storage, DATA_OPS_SCHEDULER_KEYS.voiceLifecycleFallbackEnabled) === 'true';
}

export function setVoiceLifecycleFallbackEnabled(storage, enabled) {
  if (!storage) return false;
  return safeSetItem(
    storage,
    DATA_OPS_SCHEDULER_KEYS.voiceLifecycleFallbackEnabled,
    enabled ? 'true' : 'false'
  );
}

export function recordSchedulerRun(storage, summary, nowMs = Date.now()) {
  if (!storage) return;
  safeSetItem(storage, DATA_OPS_SCHEDULER_KEYS.lastRunAt, String(nowMs));
  safeSetItem(storage, DATA_OPS_SCHEDULER_KEYS.lastResult, JSON.stringify({
    ...summary,
    recordedAt: new Date(nowMs).toISOString(),
  }));
  safeRemoveItem(storage, DATA_OPS_SCHEDULER_KEYS.lastError);
}

export function recordSchedulerError(storage, errorMessage, nowMs = Date.now()) {
  if (!storage) return;
  safeSetItem(storage, DATA_OPS_SCHEDULER_KEYS.lastError, JSON.stringify({
    message: String(errorMessage || 'Scheduler execution failed'),
    recordedAt: new Date(nowMs).toISOString(),
  }));
}

export function summarizeDueSyncPayload(payload) {
  const synced = Array.isArray(payload?.synced) ? payload.synced.length : 0;
  const skipped = Array.isArray(payload?.skipped) ? payload.skipped.length : 0;
  const alerts = Array.isArray(payload?.alertsEmitted) ? payload.alertsEmitted.length : 0;
  const staleCount = Number(payload?.health?.staleCount || 0);
  return {
    synced,
    skipped,
    alerts,
    staleCount,
  };
}
