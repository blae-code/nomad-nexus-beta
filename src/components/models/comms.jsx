/**
 * Comms Models — Minimal shape for channels, messages, read state
 * Swappable to Base44 SDK entities later
 */

export const CommsChannelDefaults = {
  CASUAL: 'CASUAL',
  FOCUSED: 'FOCUSED',
};

/**
 * CommsChannel model shape
 */
export function createCommsChannel({
  id,
  name,
  type = CommsChannelDefaults.CASUAL,
  isTemporary = false,
  createdAt = new Date().toISOString(),
} = {}) {
  return {
    id,
    name,
    type,
    isTemporary,
    createdAt,
  };
}

/**
 * CommsMessage model shape
 */
export function createCommsMessage({
  id,
  channelId,
  authorId,
  authorCallsign,
  body,
  createdAt = new Date().toISOString(),
} = {}) {
  return {
    id,
    channelId,
    authorId,
    authorCallsign,
    body,
    createdAt,
  };
}

/**
 * ReadState model shape
 * scopeType: 'TAB' (e.g., 'comms') or 'CHANNEL' (channelId)
 */
export function createReadState({
  id,
  userId,
  scopeType = 'CHANNEL',
  scopeId,
  lastReadAt = new Date().toISOString(),
} = {}) {
  return {
    id,
    userId,
    scopeType,
    scopeId,
    lastReadAt,
  };
}