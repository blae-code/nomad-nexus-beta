/**
 * Comms Service — Base44 SDK integration for channels, messages, read state
 * Migrated from mock service to real persistence
 */

import { base44 } from '@/api/base44Client';

/**
 * Get all channels
 */
export async function getChannels() {
  try {
    return await base44.entities.Channel.list('name', 100);
  } catch (error) {
    console.error('Error loading channels:', error);
    return [];
  }
}

/**
 * Get channel by ID
 */
export async function getChannel(channelId) {
  try {
    return await base44.entities.Channel.get(channelId);
  } catch (error) {
    console.error('Error loading channel:', error);
    return null;
  }
}

/**
 * Get messages for a channel
 */
export async function getMessages(channelId, limit = 50) {
  try {
    const messages = await base44.entities.Message.filter(
      { channel_id: channelId },
      '-created_date',
      limit
    );
    
    // Reverse to show oldest first
    return messages.reverse();
  } catch (error) {
    console.error('Error loading messages:', error);
    return [];
  }
}

/**
 * Send a message to a channel
 */
export async function sendMessage(channelId, authorId, authorCallsign, body) {
  try {
    const message = await base44.entities.Message.create({
      channel_id: channelId,
      user_id: authorId,
      content: body,
    });

    // Enrich with author callsign for local display
    return {
      ...message,
      authorCallsign,
      body,
      createdAt: message.created_date,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Get read state for a user + scope
 */
export async function getReadState(userId, scopeType, scopeId) {
  try {
    const states = await base44.entities.CommsReadState.filter({
      user_id: userId,
      scope_type: scopeType,
      scope_id: scopeId,
    });
    return states[0] || null;
  } catch (error) {
    console.error('Error loading read state:', error);
    return null;
  }
}

/**
 * Update read state (mark as read)
 */
export async function setReadState(userId, scopeType, scopeId) {
  try {
    // Check if read state already exists
    const existing = await getReadState(userId, scopeType, scopeId);
    
    if (existing) {
      return await base44.entities.CommsReadState.update(existing.id, {
        last_read_at: new Date().toISOString(),
      });
    } else {
      return await base44.entities.CommsReadState.create({
        user_id: userId,
        scope_type: scopeType,
        scope_id: scopeId,
        last_read_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error updating read state:', error);
    throw error;
  }
}

/**
 * Subscribe to new messages for a channel (real-time)
 * Returns unsubscribe function
 */
export function subscribeToChannel(channelId, callback) {
  try {
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      // Only trigger for messages in this channel
      if (event.data?.channel_id === channelId && event.type === 'create') {
        callback(event.data);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to channel:', error);
    return () => {}; // Return no-op unsubscribe
  }
}

/**
 * Get connection state for real-time subscriptions
 */
export function getConnectionState() {
  // Placeholder for connection monitoring
  // Base44 SDK handles connection internally
  return 'connected';
}