/**
 * Voice Net Models — Minimal shapes for voice-based operations
 * Swappable with Base44 VoiceNet + VoiceSession entities
 */

export const VOICE_NET_TYPE = {
  CASUAL: 'CASUAL',
  FOCUSED: 'FOCUSED',
};

/**
 * VoiceNet Model
 * Represents a voice channel/net that users can join
 */
export function createVoiceNet(override = {}) {
  return {
    id: override.id || `net-${Date.now()}`,
    name: override.name || 'General',
    type: override.type || VOICE_NET_TYPE.CASUAL,
    isTemporary: override.isTemporary ?? false,
    createdAt: override.createdAt || new Date().toISOString(),
    description: override.description || '',
    ...override,
  };
}

/**
 * VoiceSession Model
 * Represents a user's active session in a voice net
 */
export function createVoiceSession(override = {}) {
  return {
    id: override.id || `session-${Date.now()}`,
    netId: override.netId || '',
    userId: override.userId || '',
    callsign: override.callsign || 'Unknown',
    clientId: override.clientId || '',
    joinedAt: override.joinedAt || new Date().toISOString(),
    lastSeenAt: override.lastSeenAt || new Date().toISOString(),
    isSpeaking: override.isSpeaking ?? false,
    micEnabled: override.micEnabled ?? true,
    ...override,
  };
}