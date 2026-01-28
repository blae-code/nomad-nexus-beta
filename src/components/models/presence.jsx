/**
 * Presence Model
 * Canonical shape for user presence/heartbeat records
 */

export const PRESENCE_STATUS = {
  ONLINE: 'ONLINE',
  AWAY: 'AWAY',
  OFFLINE: 'OFFLINE',
};

/**
 * Presence record shape (minimum fields)
 * @typedef {Object} PresenceRecord
 * @property {string} userId - User ID from auth
 * @property {string} callsign - Display callsign
 * @property {string} rank - Rank label (e.g., SCOUT, VAGRANT)
 * @property {string} membership - Membership tier
 * @property {string[]} roles - Array of role tags
 * @property {string} status - ONLINE | AWAY | OFFLINE
 * @property {string} lastSeenAt - ISO timestamp of last activity
 * @property {string} clientId - Stable browser session ID
 * @property {string} [route] - Current page/route
 * @property {string} [activeNetId] - Current voice net (nullable)
 */

/**
 * Create a default presence record for the current user
 */
export function createPresenceRecord(user, clientId, overrides = {}) {
  return {
    userId: user.id || user.email,
    callsign: user.callsign || user.full_name || 'Anonymous',
    rank: user.rank || 'VAGRANT',
    membership: user.membership || 'GUEST',
    roles: user.roles || [],
    status: PRESENCE_STATUS.ONLINE,
    lastSeenAt: new Date().toISOString(),
    clientId,
    route: window?.location?.pathname || '/',
    activeNetId: null,
    ...overrides,
  };
}

/**
 * Determine if a presence record is considered "online"
 * @param {PresenceRecord} record
 * @param {number} recencyWindowMs - Time window (default 90 seconds)
 */
export function isOnline(record, recencyWindowMs = 90000) {
  if (!record || !record.lastSeenAt) return false;
  const lastSeen = new Date(record.lastSeenAt).getTime();
  const now = Date.now();
  return now - lastSeen <= recencyWindowMs;
}

/**
 * Derive display status from record and recency
 */
export function getDerivedStatus(record, recencyWindowMs = 90000) {
  if (!record || !record.lastSeenAt) return PRESENCE_STATUS.OFFLINE;
  const lastSeen = new Date(record.lastSeenAt).getTime();
  const now = Date.now();
  const elapsed = now - lastSeen;

  if (elapsed <= recencyWindowMs) {
    return record.status || PRESENCE_STATUS.ONLINE;
  }
  return PRESENCE_STATUS.OFFLINE;
}

/**
 * Get a stable client session ID from localStorage
 */
export function getOrCreateClientId() {
  const key = 'nexus.clientId';
  let clientId = typeof window !== 'undefined' ? localStorage?.getItem(key) : null;
  if (!clientId) {
    clientId = `client_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
    if (typeof window !== 'undefined') {
      localStorage?.setItem(key, clientId);
    }
  }
  return clientId;
}