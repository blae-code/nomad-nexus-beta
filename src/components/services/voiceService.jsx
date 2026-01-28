/**
 * Voice Service — Thin wrapper around transport + session management
 * Manages VoiceSession records and provides high-level voice operations
 */

import { createVoiceSession } from '@/components/models/voiceNet';

let mockSessions = []; // In-memory store; swappable with Base44

/**
 * List all available voice nets (with participant counts)
 * @returns {Promise<Array>}
 */
export async function listVoiceNets() {
  // Placeholder; later integrate with Base44 entities.VoiceNet.list()
  return [];
}

/**
 * Get sessions for a specific net
 * @param {string} netId
 * @returns {Promise<Array>}
 */
export async function getNetSessions(netId) {
  return mockSessions.filter((s) => s.netId === netId);
}

/**
 * Create or update a voice session when user joins a net
 * @param {string} netId
 * @param {string} userId
 * @param {string} callsign
 * @param {string} clientId
 * @returns {Promise<Object>}
 */
export async function addVoiceSession(netId, userId, callsign, clientId) {
  const session = createVoiceSession({
    netId,
    userId,
    callsign,
    clientId,
  });
  mockSessions.push(session);
  return session;
}

/**
 * Update speaking state for a session
 * @param {string} sessionId
 * @param {boolean} isSpeaking
 * @returns {Promise<Object>}
 */
export async function updateSessionSpeaking(sessionId, isSpeaking) {
  const session = mockSessions.find((s) => s.id === sessionId);
  if (session) {
    session.isSpeaking = isSpeaking;
    session.lastSeenAt = new Date().toISOString();
  }
  return session;
}

/**
 * Update session heartbeat (keep-alive)
 * @param {string} sessionId
 * @returns {Promise<Object>}
 */
export async function updateSessionHeartbeat(sessionId) {
  const session = mockSessions.find((s) => s.id === sessionId);
  if (session) {
    session.lastSeenAt = new Date().toISOString();
  }
  return session;
}

/**
 * Remove session when user leaves (best-effort cleanup)
 * @param {string} sessionId
 * @returns {Promise<void>}
 */
export async function removeVoiceSession(sessionId) {
  const index = mockSessions.findIndex((s) => s.id === sessionId);
  if (index >= 0) {
    mockSessions.splice(index, 1);
  }
}

/**
 * Get active sessions for user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getUserSessions(userId) {
  return mockSessions.filter((s) => s.userId === userId);
}

/**
 * Clear all sessions (reset/cleanup)
 * @returns {Promise<void>}
 */
export async function clearAllSessions() {
  mockSessions = [];
}

export default {
  listVoiceNets,
  getNetSessions,
  addVoiceSession,
  updateSessionSpeaking,
  updateSessionHeartbeat,
  removeVoiceSession,
  getUserSessions,
  clearAllSessions,
};