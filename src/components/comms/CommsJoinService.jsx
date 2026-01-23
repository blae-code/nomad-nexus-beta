/**
 * CommsJoinService: Canonical comms joining logic
 * 
 * Supports:
 * - Multiple net types: voice, text, data
 * - Event/operation context integration
 * - SIM/LIVE mode abstraction
 * - Net type abstraction (voice nets, channels, data streams)
 * 
 * Architecture:
 * - Unified join/leave interface regardless of net type
 * - Context-aware routing (determine whether voice/text/data based on event + net)
 * - Mode-aware (SIM/LIVE backends)
 * - Idempotent (safe to join same net multiple times)
 */

import { base44 } from '@/api/base44Client';

// Net type definitions
export const NET_TYPES = {
  VOICE: 'voice',
  TEXT: 'text',
  DATA: 'data'
};

// Join context object structure
export const createJoinContext = (overrides = {}) => ({
  userId: null,
  eventId: null,
  netId: null,
  netCode: null,
  netType: NET_TYPES.VOICE,
  commsMode: 'SIM',
  metadata: {},
  ...overrides
});

/**
 * Core join logic - returns platform-specific join payload
 */
export async function resolveCommsJoinPayload(context) {
  // Validate context
  if (!context.userId) throw new Error('userId required');
  if (!context.netId && !context.netCode) throw new Error('netId or netCode required');

  const { userId, eventId, netId, netCode, netType, commsMode, metadata } = context;

  // Fetch net metadata if only code provided
  let net = null;
  if (netId) {
    net = await base44.entities.VoiceNet.get(netId);
  } else if (netCode && eventId) {
    const nets = await base44.entities.VoiceNet.filter(
      { event_id: eventId, code: netCode },
      null,
      1
    );
    net = nets[0];
  }

  if (!net && !netCode) {
    throw new Error('Unable to resolve net from context');
  }

  // Determine actual net type (voice, text, data)
  const actualNetType = net?.type || netType || NET_TYPES.VOICE;

  // Build mode-specific payload
  if (commsMode === 'LIVE') {
    return buildLiveJoinPayload({
      userId,
      eventId,
      net,
      netType: actualNetType,
      metadata
    });
  } else {
    return buildSimJoinPayload({
      userId,
      eventId,
      net,
      netType: actualNetType,
      metadata
    });
  }
}

/**
 * LIVE mode: Generate real tokens/connections
 */
function buildLiveJoinPayload({ userId, eventId, net, netType, metadata }) {
  const payload = {
    mode: 'LIVE',
    userId,
    eventId,
    netId: net?.id,
    netCode: net?.code,
    netType,
    timestamp: new Date().toISOString()
  };

  switch (netType) {
    case NET_TYPES.VOICE:
      return {
        ...payload,
        voiceConfig: {
          roomName: net?.livekit_room_name,
          tokenRequired: true,
          participantMetadata: {
            userId,
            callsign: metadata.callsign,
            rank: metadata.rank,
            eventId
          }
        }
      };

    case NET_TYPES.TEXT:
      return {
        ...payload,
        textConfig: {
          channelId: net?.id,
          channelCode: net?.code,
          metadata: {
            userId,
            eventId
          }
        }
      };

    case NET_TYPES.DATA:
      return {
        ...payload,
        dataConfig: {
          streamId: net?.id,
          streamCode: net?.code,
          metadata: {
            userId,
            eventId
          }
        }
      };

    default:
      throw new Error(`Unknown net type: ${netType}`);
  }
}

/**
 * SIM mode: Generate simulated experience
 */
function buildSimJoinPayload({ userId, eventId, net, netType, metadata }) {
  const payload = {
    mode: 'SIM',
    userId,
    eventId,
    netId: net?.id,
    netCode: net?.code,
    netType,
    timestamp: new Date().toISOString()
  };

  switch (netType) {
    case NET_TYPES.VOICE:
      return {
        ...payload,
        voiceConfig: {
          roomName: `sim-${net?.code || 'unknown'}`,
          simulated: true,
          participantMetadata: {
            userId,
            callsign: metadata.callsign,
            rank: metadata.rank,
            eventId
          }
        }
      };

    case NET_TYPES.TEXT:
      return {
        ...payload,
        textConfig: {
          channelId: net?.id,
          channelCode: net?.code,
          simulated: true,
          metadata: {
            userId,
            eventId
          }
        }
      };

    case NET_TYPES.DATA:
      return {
        ...payload,
        dataConfig: {
          streamId: net?.id,
          streamCode: net?.code,
          simulated: true,
          metadata: {
            userId,
            eventId
          }
        }
      };

    default:
      throw new Error(`Unknown net type: ${netType}`);
  }
}

/**
 * Update user presence to track current net/event
 */
export async function updateCommsPresence(context) {
  const { userId, eventId, netId, netCode } = context;

  try {
    await base44.functions.invoke('updateUserPresence', {
      status: 'in-call',
      netId: netId || netCode,
      eventId: eventId,
      isTransmitting: false
    });
  } catch (error) {
    console.error('[COMMS] Failed to update presence:', error);
    throw error;
  }
}

/**
 * Clear user presence when leaving comms
 */
export async function clearCommsPresence(userId) {
  try {
    await base44.functions.invoke('updateUserPresence', {
      status: 'online',
      netId: null,
      eventId: null,
      isTransmitting: false
    });
  } catch (error) {
    console.error('[COMMS] Failed to clear presence:', error);
  }
}

/**
 * Validate user has permission to join net
 */
export async function validateNetAccess(user, net) {
  if (!user || !net) return false;

  // Check rank-based TX access
  if (net.min_rank_to_rx) {
    const rankValue = getRankValue(user.rank);
    const minRankValue = getRankValue(net.min_rank_to_rx);
    if (rankValue < minRankValue) return false;
  }

  // Check role-based access if specified
  if (net.allowed_role_ids?.length > 0) {
    const userRoles = await base44.entities.Role.filter({ user_id: user.id });
    const hasRole = userRoles.some(r => net.allowed_role_ids.includes(r.id));
    if (!hasRole) return false;
  }

  return true;
}

/**
 * Helper: Convert rank string to numeric value for comparison
 */
function getRankValue(rankString) {
  const rankHierarchy = {
    'vagrant': 0,
    'scout': 1,
    'pilot': 2,
    'explorer': 3,
    'pathfinder': 4,
    'pioneer': 5,
    'voyager': 6
  };
  return rankHierarchy[rankString?.toLowerCase()] || 0;
}

/**
 * Resolve all nets available for an event/operation
 */
export async function resolveEventCommsNets(eventId, filter = {}) {
  if (!eventId) return [];

  try {
    const nets = await base44.entities.VoiceNet.filter(
      { event_id: eventId, status: 'active', ...filter },
      'priority',
      50
    );
    return nets || [];
  } catch (error) {
    console.error('[COMMS] Failed to resolve event nets:', error);
    return [];
  }
}

/**
 * Get recommended net for joining (based on user role/rank)
 */
export async function getRecommendedNet(user, eventId) {
  if (!user || !eventId) return null;

  const nets = await resolveEventCommsNets(eventId);
  
  // Prefer command net if user has access
  const commandNet = nets.find(n => n.type === 'command');
  if (commandNet && await validateNetAccess(user, commandNet)) {
    return commandNet;
  }

  // Fall back to first accessible net
  for (const net of nets) {
    if (await validateNetAccess(user, net)) {
      return net;
    }
  }

  return nets[0] || null;
}