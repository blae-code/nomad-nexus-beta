/**
 * CANONICAL COMMS CONTRACT
 * Single source of truth for room naming, comms entity shapes, and result structures
 * All comms functions must adhere to these contracts
 */

/**
 * Build canonical room name from scope + identifiers
 * Format: {scope}-{net}-{opId?}-{squadSlug?}
 * Examples:
 *   ORG COMMAND net: org-command
 *   OP LIVE net: op-abc123-live
 *   SQUAD net: squad-alpha-squad
 *   OP THEATER: op-abc123-theater
 */
export function buildRoomName({ scope, net, opId, squadSlug }) {
  if (!scope || !net) {
    throw new Error('buildRoomName requires scope and net');
  }

  const parts = [scope.toLowerCase()];

  if (opId) parts.push(opId);
  if (squadSlug) parts.push(squadSlug);

  parts.push(net.toLowerCase());

  return parts.join('-');
}

/**
 * Parse room name back to components (inverse of buildRoomName)
 */
export function parseRoomName(roomName) {
  if (!roomName) return null;

  const parts = roomName.split('-');
  if (parts.length < 2) return null;

  const scope = parts[0].toUpperCase();
  const net = parts[parts.length - 1].toUpperCase();

  let opId, squadSlug;
  if (parts.length > 2) {
    if (scope === 'OP') {
      opId = parts[1];
      squadSlug = parts.length > 3 ? parts[2] : undefined;
    } else if (scope === 'SQUAD') {
      squadSlug = parts[1];
    }
  }

  return { scope, net, opId, squadSlug, roomName };
}

/**
 * Canonical comms entity shape used everywhere
 */
export const COMMS_ENTITY_SCHEMA = {
  room_name: 'string', // Canonical name from buildRoomName
  scope: 'enum:ORG|SQUAD|OP', // Visibility scope
  net_code: 'enum:COMMAND|THEATER|SQUAD|DISTRESS|...', // Net type
  op_id: 'string?', // Operation ID if OP-scoped
  squad_id: 'string?', // Squad ID if SQUAD-scoped
  mode: 'enum:SIM|LIVE', // Current comms mode
  status: 'enum:CONNECTING|CONNECTED|DISCONNECTED|ERROR',
  created_at: 'date-time',
  participant_count: 'integer',
  last_activity_at: 'date-time'
};

/**
 * Canonical server function result structure
 * ALL server comms functions must return this shape
 */
export function createCommsResult({ ok = true, data = null, errorCode = null, message = null }) {
  return {
    ok,
    data,
    errorCode: ok ? null : errorCode || 'UNKNOWN_ERROR',
    message: ok ? message || 'Success' : message || 'Operation failed',
    timestamp: new Date().toISOString()
  };
}

/**
 * Create a token result (for minting LiveKit tokens)
 */
export function createTokenResult(token, roomName, identity) {
  return createCommsResult({
    ok: !!token,
    data: token ? { token, roomName, identity, expiresAt: new Date(Date.now() + 3600000).toISOString() } : null,
    errorCode: token ? null : 'TOKEN_MINT_FAILED',
    message: token ? 'Token minted successfully' : 'Failed to mint token'
  });
}

/**
 * Create a join result (for room joins)
 */
export function createJoinResult({ success, roomName, identity, participants = [], mode = 'LIVE', error = null }) {
  return createCommsResult({
    ok: success,
    data: success ? { roomName, identity, participants, mode } : null,
    errorCode: error,
    message: success ? `Joined room ${roomName}` : `Failed to join: ${error}`
  });
}

/**
 * Comms debug info that any panel can render
 */
export function createCommsDebugInfo({
  roomName,
  mode = 'SIM',
  identity,
  tokenMinted = false,
  connectionState = 'disconnected',
  lastError = null,
  participantCount = 0
}) {
  return {
    roomName,
    mode,
    identity,
    tokenMinted,
    connectionState,
    lastError,
    participantCount,
    timestamp: new Date().toISOString(),
    isHealthy: !lastError && connectionState !== 'error'
  };
}

/**
 * Canonical SIM mode participant generator
 */
export function generateSimParticipants(count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    id: `sim-${i}`,
    name: `Operative ${String.fromCharCode(65 + i)}`,
    isLocal: i === 0,
    metadata: { simulated: true },
    audioLevel: Math.random() * 0.8,
    connectionQuality: 'good'
  }));
}