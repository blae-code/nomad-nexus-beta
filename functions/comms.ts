/**
 * LiveKit Comms Backend Functions
 * Handles voice token generation and net configuration
 */

import { AccessToken } from 'npm:livekit@0.15.5';

export async function configureEventNets(eventId) {
  // Stub: Would normally create VoiceNet entities for the event
  console.log(`[STUB] Configuring nets for event ${eventId}`);
  return {
    success: true,
    message: "Placeholder: Nets configuration stub executed",
    nets: []
  };
}

export async function issueLiveKitToken(eventId, userId) {
  try {
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');

    if (!apiKey || !apiSecret || !liveKitUrl) {
      throw new Error('LiveKit configuration missing');
    }

    // Generate JWT token for voice net access
    const at = new AccessToken(apiKey, apiSecret);
    at.identity = userId;
    at.name = userId;
    at.addGrant({
      room: eventId,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = at.toJwt();

    return {
      token,
      serverUrl: liveKitUrl,
      identity: userId,
      room: eventId,
      permissions: {
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      }
    };
  } catch (error) {
    console.error('Failed to issue LiveKit token:', error);
    throw new Error(`LiveKit token generation failed: ${error.message}`);
  }
}