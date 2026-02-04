/**
 * Presence Service — Thin wrapper around Base44 SDK or mock storage
 * Handles read/write/query for user presence records
 */

import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';

const VALID_STATUS = new Set(['online', 'idle', 'in-call', 'transmitting', 'away', 'offline']);

const normalizeStatus = (status) => {
  if (!status) return 'online';
  const value = status.toString().toLowerCase();
  return VALID_STATUS.has(value) ? value : 'online';
};

const upsertMockPresence = (presenceRecord) => {
  if (!presenceRecord?.userId) return null;
  const existing = mockPresenceStore[presenceRecord.userId];
  if (existing) {
    mockPresenceStore[presenceRecord.userId] = {
      ...existing,
      ...presenceRecord,
      lastSeenAt: new Date().toISOString(),
    };
  } else {
    mockPresenceStore[presenceRecord.userId] = {
      id: `presence_${presenceRecord.userId}_${Date.now()}`,
      ...presenceRecord,
      lastSeenAt: new Date().toISOString(),
      created_date: new Date().toISOString(),
    };
  }
  return mockPresenceStore[presenceRecord.userId];
};

/**
 * In-memory fallback store (for when Base44 entity not available)
 * Maps userId -> PresenceRecord
 */
let mockPresenceStore = {};

/**
 * Write presence record for current user
 * @param {PresenceRecord} presenceRecord
 * @returns {Promise<PresenceRecord>}
 */
export async function writePresence(presenceRecord) {
  try {
    const status = normalizeStatus(presenceRecord?.status);
    const payload = {
      status,
      netId: presenceRecord?.activeNetId,
      eventId: presenceRecord?.eventId,
      isTransmitting: !!presenceRecord?.isTransmitting,
    };

    if (Object.prototype.hasOwnProperty.call(presenceRecord || {}, 'typingInChannel')) {
      payload.typingInChannel = presenceRecord.typingInChannel;
    }

    try {
      const response = await invokeMemberFunction('updateUserPresence', payload);
      const presence = response?.data?.presence;
      if (presence) {
        return presence;
      }
    } catch (error) {
      console.debug('[presenceService] updateUserPresence failed:', error?.message);
    }

    return upsertMockPresence(presenceRecord);
  } catch (error) {
    console.error('[presenceService] writePresence failed:', error);
    throw error;
  }
}

/**
 * Query presence records
 * @param {Object} filters - e.g., { status: 'ONLINE', membership: 'MEMBER' }
 * @returns {Promise<PresenceRecord[]>}
 */
export async function queryPresence(filters = {}) {
  try {
    let records = Object.values(mockPresenceStore);
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        records = records.filter((r) => r[key] === value);
      }
    });
    
    return records;
  } catch (error) {
    console.error('[presenceService] queryPresence failed:', error);
    throw error;
  }
}

/**
 * Get all presence records (unrestricted)
 * @returns {Promise<PresenceRecord[]>}
 */
export async function getAllPresence() {
  try {
    return Object.values(mockPresenceStore);
  } catch (error) {
    console.error('[presenceService] getAllPresence failed:', error);
    throw error;
  }
}

/**
 * Get presence record for specific user
 * @param {string} userId
 * @returns {Promise<PresenceRecord|null>}
 */
export async function getPresenceForUser(userId) {
  try {
    const map = await getPresenceForUsers([userId]);
    return map[userId] || null;
  } catch (error) {
    console.error('[presenceService] getPresenceForUser failed:', error);
    throw error;
  }
}

/**
 * Get presence map for specific users
 * @param {string[]} memberProfileIds
 * @returns {Promise<Record<string, any>>}
 */
export async function getPresenceForUsers(memberProfileIds = []) {
  if (!memberProfileIds || memberProfileIds.length === 0) return {};
  try {
    const response = await invokeMemberFunction('getPresenceSnapshot', { memberProfileIds });
    if (response?.data?.presenceById) {
      return response.data.presenceById;
    }
  } catch (error) {
    console.debug('[presenceService] getPresenceSnapshot failed:', error?.message);
  }

  const fallback = {};
  await Promise.all(
    memberProfileIds.map(async (id) => {
      if (mockPresenceStore[id]) {
        fallback[id] = mockPresenceStore[id];
        return;
      }
      try {
        let records = await base44.entities.UserPresence.filter({ member_profile_id: id });
        if (!records || records.length === 0) {
          records = await base44.entities.UserPresence.filter({ user_id: id });
        }
        if (records?.[0]) fallback[id] = records[0];
      } catch (error) {
        // ignore
      }
    })
  );

  return fallback;
}

/**
 * Get all "online" users (within recency window)
 * @param {number} recencyWindowMs - Default 90 seconds
 * @returns {Promise<PresenceRecord[]>}
 */
export async function getOnlineUsers(recencyWindowMs = 90000) {
  try {
    const response = await invokeMemberFunction('getOnlinePresence', { recencyWindowMs });
    if (response?.data?.presence) {
      return response.data.presence;
    }
  } catch (error) {
    console.error('[presenceService] getOnlineUsers failed:', error);
  }
  try {
    const all = await getAllPresence();
    const now = Date.now();
    return all.filter((record) => {
      const lastSeenAt = record.last_activity || record.lastSeenAt;
      if (!lastSeenAt) return false;
      const lastSeen = new Date(lastSeenAt).getTime();
      return now - lastSeen <= recencyWindowMs;
    });
  } catch (error) {
    console.error('[presenceService] getOnlineUsers fallback failed:', error);
    return [];
  }
}

/**
 * Clean up offline records (older than window)
 * @param {number} retentionWindowMs - Default 5 minutes
 * @returns {Promise<number>} - Count removed
 */
export async function cleanupOfflineRecords(retentionWindowMs = 5 * 60 * 1000) {
  try {
    const now = Date.now();
    const before = Object.keys(mockPresenceStore).length;
    
    Object.entries(mockPresenceStore).forEach(([userId, record]) => {
      if (record.lastSeenAt) {
        const lastSeen = new Date(record.lastSeenAt).getTime();
        if (now - lastSeen > retentionWindowMs) {
          delete mockPresenceStore[userId];
        }
      }
    });
    
    const after = Object.keys(mockPresenceStore).length;
    return before - after;
  } catch (error) {
    console.error('[presenceService] cleanupOfflineRecords failed:', error);
    return 0;
  }
}

/**
 * Clear all presence data (dev/reset only)
 */
export function resetPresenceStore() {
  mockPresenceStore = {};
}

export default {
  writePresence,
  queryPresence,
  getAllPresence,
  getPresenceForUser,
  getPresenceForUsers,
  getOnlineUsers,
  cleanupOfflineRecords,
  resetPresenceStore,
};
