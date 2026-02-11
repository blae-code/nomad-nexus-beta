/**
 * Voice Service — session + authority registry with cross-tab sync primitives.
 * Keeps legacy API shape while adding:
 * - monitor/transmit net metadata
 * - single active TX device authority per net
 * - lightweight command bus snapshot cache
 */

import { createVoiceSession } from '../models/voiceNet.jsx';

const TX_AUTHORITY_TTL_MS = 30 * 1000;
const CHANNEL_NAME = 'nexus.voice.session-control';
const STORAGE_KEY = 'nexus.voice.txAuthority';

let mockSessions = []; // In-memory store; swappable with Base44
const txAuthorityByNet = new Map(); // netId -> { userId, clientId, claimedAt }
let commandBusSnapshot = [];

let broadcast = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  broadcast = new BroadcastChannel(CHANNEL_NAME);
  broadcast.onmessage = (event) => {
    const payload = event?.data || {};
    if (payload?.type === 'tx-authority-sync' && payload.netId) {
      txAuthorityByNet.set(payload.netId, payload.authority || null);
      persistAuthority();
    }
    if (payload?.type === 'command-bus-sync') {
      commandBusSnapshot = Array.isArray(payload.entries) ? payload.entries : [];
    }
  };
}

function nowIso() {
  return new Date().toISOString();
}

function persistAuthority() {
  try {
    if (typeof localStorage === 'undefined') return;
    const serializable = {};
    txAuthorityByNet.forEach((value, key) => {
      if (!value) return;
      serializable[key] = value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignore
  }
}

function loadAuthorityFromStorage() {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    Object.entries(parsed).forEach(([netId, authority]) => {
      txAuthorityByNet.set(netId, authority);
    });
  } catch {
    // ignore
  }
}

loadAuthorityFromStorage();

function pruneAuthority() {
  const now = Date.now();
  for (const [netId, authority] of txAuthorityByNet.entries()) {
    const claimedAtMs = new Date(authority?.claimedAt || authority?.claimed_at || 0).getTime();
    if (!claimedAtMs || now - claimedAtMs > TX_AUTHORITY_TTL_MS) {
      txAuthorityByNet.delete(netId);
    }
  }
}

function emitAuthority(netId) {
  if (!broadcast) return;
  broadcast.postMessage({
    type: 'tx-authority-sync',
    netId,
    authority: txAuthorityByNet.get(netId) || null,
  });
}

function emitCommandBus(entries) {
  if (!broadcast) return;
  broadcast.postMessage({
    type: 'command-bus-sync',
    entries: Array.isArray(entries) ? entries : [],
  });
}

/**
 * List all available voice nets (with participant counts)
 * @returns {Promise<Array>}
 */
export async function listVoiceNets() {
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
 * Create or update a voice session when user joins a net.
 */
export async function addVoiceSession(netId, userId, callsign, clientId, extras = {}) {
  const existing = mockSessions.find((entry) => entry.netId === netId && entry.userId === userId && entry.clientId === clientId);
  if (existing) {
    Object.assign(existing, {
      ...extras,
      lastSeenAt: nowIso(),
    });
    return existing;
  }

  const session = createVoiceSession({
    netId,
    userId,
    callsign,
    clientId,
    monitoredNetIds: Array.isArray(extras?.monitoredNetIds) ? extras.monitoredNetIds : [netId],
    transmitNetId: extras?.transmitNetId || netId,
    disciplineMode: extras?.disciplineMode || 'PTT',
    txAuthority: extras?.txAuthority ?? true,
    ...extras,
  });
  mockSessions.push(session);
  return session;
}

/**
 * Update speaking state for a session
 */
export async function updateSessionSpeaking(sessionId, isSpeaking) {
  const session = mockSessions.find((s) => s.id === sessionId);
  if (session) {
    session.isSpeaking = isSpeaking;
    session.lastSeenAt = nowIso();
  }
  return session;
}

/**
 * Update session heartbeat (keep-alive)
 */
export async function updateSessionHeartbeat(sessionId) {
  const session = mockSessions.find((s) => s.id === sessionId);
  if (session) {
    session.lastSeenAt = nowIso();
  }
  return session;
}

/**
 * Update monitor/transmit topology for a session.
 */
export async function updateSessionTopology(sessionId, topology = {}) {
  const session = mockSessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (Array.isArray(topology.monitoredNetIds)) {
    session.monitoredNetIds = [...new Set(topology.monitoredNetIds.filter(Boolean))];
  }
  if (Object.prototype.hasOwnProperty.call(topology, 'transmitNetId')) {
    session.transmitNetId = topology.transmitNetId || null;
  }
  if (topology.disciplineMode) {
    session.disciplineMode = topology.disciplineMode;
  }
  session.lastSeenAt = nowIso();
  return session;
}

/**
 * Remove session when user leaves (best-effort cleanup)
 */
export async function removeVoiceSession(sessionId) {
  const index = mockSessions.findIndex((s) => s.id === sessionId);
  if (index >= 0) {
    mockSessions.splice(index, 1);
  }
}

/**
 * Get active sessions for user
 */
export async function getUserSessions(userId) {
  return mockSessions.filter((s) => s.userId === userId);
}

/**
 * Claim TX authority for a net/client.
 * Returns authority winner and ownership boolean.
 */
export async function claimTransmitAuthority(netId, userId, clientId) {
  if (!netId || !userId || !clientId) {
    return { granted: false, authority: null };
  }
  pruneAuthority();
  const current = txAuthorityByNet.get(netId);
  if (!current || current.clientId === clientId || current.userId === userId) {
    const authority = {
      netId,
      userId,
      clientId,
      claimedAt: nowIso(),
    };
    txAuthorityByNet.set(netId, authority);
    persistAuthority();
    emitAuthority(netId);
    return { granted: true, authority };
  }
  return { granted: false, authority: current };
}

/**
 * Release TX authority for a net/client.
 */
export async function releaseTransmitAuthority(netId, clientId) {
  if (!netId) return;
  const current = txAuthorityByNet.get(netId);
  if (!current) return;
  if (!clientId || current.clientId === clientId) {
    txAuthorityByNet.delete(netId);
    persistAuthority();
    emitAuthority(netId);
  }
}

/**
 * Get current TX authority for a net.
 */
export async function getTransmitAuthority(netId) {
  pruneAuthority();
  return txAuthorityByNet.get(netId) || null;
}

/**
 * Overwrite command-bus snapshot cache.
 */
export async function setCommandBusSnapshot(entries = []) {
  commandBusSnapshot = Array.isArray(entries) ? entries : [];
  emitCommandBus(commandBusSnapshot);
}

/**
 * Read cached command-bus snapshot.
 */
export async function getCommandBusSnapshot() {
  return Array.isArray(commandBusSnapshot) ? commandBusSnapshot : [];
}

/**
 * Clear all sessions (reset/cleanup)
 */
export async function clearAllSessions() {
  mockSessions = [];
  txAuthorityByNet.clear();
  commandBusSnapshot = [];
  persistAuthority();
}

export default {
  listVoiceNets,
  getNetSessions,
  addVoiceSession,
  updateSessionSpeaking,
  updateSessionHeartbeat,
  updateSessionTopology,
  removeVoiceSession,
  getUserSessions,
  claimTransmitAuthority,
  releaseTransmitAuthority,
  getTransmitAuthority,
  setCommandBusSnapshot,
  getCommandBusSnapshot,
  clearAllSessions,
};
