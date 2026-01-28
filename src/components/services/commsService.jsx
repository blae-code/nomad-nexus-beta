/**
 * Comms Service — In-memory mock store for channels, messages, read state
 * Swappable to Base44 SDK later
 */

import { createCommsChannel, createCommsMessage, createReadState, CommsChannelDefaults } from '@/components/models/comms';

// Mock stores
const mockChannels = {};
const mockMessages = {};
const mockReadState = {};

/**
 * Initialize default casual channels
 */
function initializeDefaultChannels() {
  const channels = [
    createCommsChannel({ id: 'general', name: 'General', type: CommsChannelDefaults.CASUAL }),
    createCommsChannel({ id: 'lounge', name: 'Lounge', type: CommsChannelDefaults.CASUAL }),
    createCommsChannel({ id: 'rangersclan', name: 'Rangers Clan', type: CommsChannelDefaults.FOCUSED, isTemporary: false }),
    createCommsChannel({ id: 'shamans', name: 'Shamans Guild', type: CommsChannelDefaults.FOCUSED, isTemporary: false }),
    createCommsChannel({ id: 'tempfocused', name: 'Temporary Focused Op', type: CommsChannelDefaults.FOCUSED, isTemporary: true }),
  ];

  channels.forEach((ch) => {
    mockChannels[ch.id] = ch;
  });
}

// Init on load
initializeDefaultChannels();

/**
 * Get all channels
 */
export async function getChannels() {
  return Object.values(mockChannels);
}

/**
 * Get channel by ID
 */
export async function getChannel(channelId) {
  return mockChannels[channelId] || null;
}

/**
 * Get messages for a channel
 */
export async function getMessages(channelId, limit = 50) {
  const channelMessages = mockMessages[channelId] || [];
  return channelMessages.slice(-limit);
}

/**
 * Send a message to a channel
 */
export async function sendMessage(channelId, authorId, authorCallsign, body) {
  if (!mockChannels[channelId]) {
    throw new Error(`Channel ${channelId} not found`);
  }

  const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const message = createCommsMessage({
    id: messageId,
    channelId,
    authorId,
    authorCallsign,
    body,
    createdAt: new Date().toISOString(),
  });

  if (!mockMessages[channelId]) {
    mockMessages[channelId] = [];
  }

  mockMessages[channelId].push(message);
  return message;
}

/**
 * Get read state for a user + scope
 */
export async function getReadState(userId, scopeType, scopeId) {
  const key = `${userId}:${scopeType}:${scopeId}`;
  return mockReadState[key] || null;
}

/**
 * Update read state (mark as read)
 */
export async function setReadState(userId, scopeType, scopeId) {
  const key = `${userId}:${scopeType}:${scopeId}`;
  const readState = createReadState({
    id: key,
    userId,
    scopeType,
    scopeId,
    lastReadAt: new Date().toISOString(),
  });

  mockReadState[key] = readState;
  return readState;
}

/**
 * Seed some demo messages for testing
 */
export async function seedDemoMessages() {
  await sendMessage('general', 'user-001', 'Scout', 'Welcome to the console!');
  await sendMessage('general', 'user-002', 'Vagrant', 'Roger that, standing by.');
  await sendMessage('lounge', 'user-001', 'Scout', 'Anyone up for a casual op tonight?');
}

/**
 * Subscribe to new messages for a channel (simple callback)
 * Returns unsubscribe function
 */
export function subscribeToChannel(channelId, callback) {
  // Stub: would use WebSocket or Base44 subscriptions later
  // For now, return no-op unsubscribe
  return () => {};
}