/**
 * Placeholder backend functions for Redscar Comms
 * These will later be connected to LiveKit
 */

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
  // Stub: Would normally generate a LiveKit JWT
  console.log(`[STUB] Issuing token for user ${userId} in event ${eventId}`);
  return {
    token: "placeholder_token_jwt",
    serverUrl: "wss://placeholder.livekit.cloud",
    identity: userId,
    permissions: {
      canPublish: false,
      canSubscribe: false
    }
  };
}