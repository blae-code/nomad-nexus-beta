/**
 * Presence Service — Thin wrapper around Base44 SDK or mock storage
 * Handles read/write/query for user presence records
 */

import { base44 } from '@/api/base44Client';

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
    // Try to use Base44 SDK if UserPresence entity exists
    // For now, fall back to mock store (can be swapped later)
    const existing = mockPresenceStore[presenceRecord.userId];
    if (existing) {
      // Simulate update
      mockPresenceStore[presenceRecord.userId] = {
        ...existing,
        ...presenceRecord,
        lastSeenAt: new Date().toISOString(),
      };
    } else {
      // Simulate create
      mockPresenceStore[presenceRecord.userId] = {
        id: `presence_${presenceRecord.userId}_${Date.now()}`,
        ...presenceRecord,
        lastSeenAt: new Date().toISOString(),
        created_date: new Date().toISOString(),
      };
    }
    return mockPresenceStore[presenceRecord.userId];
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
    return mockPresenceStore[userId] || null;
  } catch (error) {
    console.error('[presenceService] getPresenceForUser failed:', error);
    throw error;
  }
}

/**
 * Get all "online" users (within recency window)
 * @param {number} recencyWindowMs - Default 90 seconds
 * @returns {Promise<PresenceRecord[]>}
 */
export async function getOnlineUsers(recencyWindowMs = 90000) {
  try {
    const all = await getAllPresence();
    const now = Date.now();
    return all.filter((record) => {
      if (!record.lastSeenAt) return false;
      const lastSeen = new Date(record.lastSeenAt).getTime();
      return now - lastSeen <= recencyWindowMs;
    });
  } catch (error) {
    console.error('[presenceService] getOnlineUsers failed:', error);
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
  getOnlineUsers,
  cleanupOfflineRecords,
  resetPresenceStore,
};