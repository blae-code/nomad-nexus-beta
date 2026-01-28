/**
 * Readiness Utility
 * Derives system readiness from presence heartbeat + latency
 */

export const READINESS_STATE = {
  READY: 'READY',
  DEGRADED: 'DEGRADED',
  OFFLINE: 'OFFLINE',
};

/**
 * Readiness state shape
 * @typedef {Object} ReadinessSnapshot
 * @property {string} state - READY | DEGRADED | OFFLINE
 * @property {string} reason - Human-readable reason
 * @property {Object} context - Supporting metrics
 */

/**
 * Derive readiness state from presence and latency data
 * @param {Object} presence - { lastWriteAt, lastWriteSuccess, writeFailureCount }
 * @param {Object} latency - { latencyMs, isHealthy, error }
 * @param {Object} [config] - { heartbeatTimeoutMs, degradedLatencyMs }
 * @returns {ReadinessSnapshot}
 */
export function deriveReadiness(presence, latency, config = {}) {
  const {
    heartbeatTimeoutMs = 60000, // 60 seconds
    degradedLatencyMs = 150,     // 150ms threshold
  } = config;

  const now = Date.now();
  let state = READINESS_STATE.READY;
  let reason = 'All systems operational';
  const context = { presence, latency };

  // Check heartbeat health
  if (!presence.lastWriteSuccess) {
    state = READINESS_STATE.OFFLINE;
    reason = 'Heartbeat write failed';
    return { state, reason, context };
  }

  if (presence.lastWriteAt) {
    const lastWrite = new Date(presence.lastWriteAt).getTime();
    if (now - lastWrite > heartbeatTimeoutMs) {
      state = READINESS_STATE.OFFLINE;
      reason = 'Heartbeat timeout';
      return { state, reason, context };
    }
  }

  // Check latency
  if (latency.error || !latency.isHealthy) {
    state = READINESS_STATE.DEGRADED;
    reason = `High latency (${latency.latencyMs}ms)`;
  }

  if (latency.latencyMs > degradedLatencyMs && state === READINESS_STATE.READY) {
    state = READINESS_STATE.DEGRADED;
    reason = `Latency degraded (${latency.latencyMs}ms)`;
  }

  // Check repeated failures
  if (presence.writeFailureCount >= 3) {
    state = READINESS_STATE.DEGRADED;
    reason = `Repeated failures (${presence.writeFailureCount}x)`;
  }

  return { state, reason, context };
}

/**
 * Get human-readable status message
 */
export function getReadinessMessage(state) {
  const messages = {
    [READINESS_STATE.READY]: '✓ Ready',
    [READINESS_STATE.DEGRADED]: '⚠ Degraded',
    [READINESS_STATE.OFFLINE]: '✗ Offline',
  };
  return messages[state] || 'Unknown';
}

/**
 * Get CSS color class for readiness state
 */
export function getReadinessColorClass(state) {
  const colors = {
    [READINESS_STATE.READY]: 'text-green-500 bg-green-500/15',
    [READINESS_STATE.DEGRADED]: 'text-yellow-500 bg-yellow-500/15',
    [READINESS_STATE.OFFLINE]: 'text-red-500 bg-red-500/15',
  };
  return colors[state] || '';
}

export default {
  READINESS_STATE,
  deriveReadiness,
  getReadinessMessage,
  getReadinessColorClass,
};