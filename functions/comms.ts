import { base44 } from '@/api/base44Client';

// Mocking secrets for now since the SDK is not available in this environment
const API_KEY = "mock_key";
const API_SECRET = "mock_secret";
const LIVEKIT_URL = "wss://mock-livekit.example.com";

/**
 * Populates voice nets for a specific event.
 * Creates a COMMAND net and one net per existing Squad.
 */
export async function configureEventNets(eventId) {
  console.log(`[COMMS] Configuring nets for event: ${eventId}`);
  
  try {
    // 1. Create COMMAND net
    const existingCommand = await base44.entities.VoiceNet.list({
      event_id: eventId,
      code: 'COMMAND'
    }, 1);

    if (existingCommand.length === 0) {
      await base44.entities.VoiceNet.create({
        event_id: eventId,
        code: 'COMMAND',
        type: 'command',
        access_rules: 'high_command_only',
        status: 'active'
      });
    }

    // 2. Fetch all Squads
    const squads = await base44.entities.Squad.list({}, 50);

    // 3. Create a net for each squad
    for (const squad of squads) {
      // Generate a safe code (e.g., RANGERS, INDUSTRY)
      const code = squad.name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
      
      const existing = await base44.entities.VoiceNet.list({
        event_id: eventId,
        linked_squad_id: squad.id
      }, 1);

      if (existing.length === 0) {
        await base44.entities.VoiceNet.create({
          event_id: eventId,
          code: code,
          type: 'squad',
          linked_squad_id: squad.id,
          access_rules: 'squad_members',
          status: 'active'
        });
      }
    }

    return { success: true, message: "Nets configured" };

  } catch (error) {
    console.error("Error configuring nets:", error);
    throw error;
  }
}

/**
 * Mints a LiveKit token for a user and determines net permissions.
 */
export async function issueLiveKitToken(eventId, userId) {
  // 1. Fetch User details (for rank)
  const user = await base44.entities.User.get(userId);
  if (!user) throw new Error("User not found");

  // 2. Fetch Squad Memberships for this user
  const memberships = await base44.entities.SquadMember.list({ user_id: userId }, 20);
  const userSquadIds = memberships.map(m => m.squad_id);

  // 3. Fetch all VoiceNets for the event
  let nets = await base44.entities.VoiceNet.list({ event_id: eventId }, 50);
  
  // If no nets exist, try to configure them on the fly (self-healing)
  if (nets.length === 0) {
    await configureEventNets(eventId);
    nets = await base44.entities.VoiceNet.list({ event_id: eventId }, 50);
  }

  // 4. Determine Permissions
  const isCommand = ['pioneer', 'founder', 'voyager'].includes(user.rank?.toLowerCase());
  
  const netPermissions = nets.map(net => {
    let canRx = false;
    let canTx = false;

    if (net.code === 'COMMAND') {
      if (isCommand) {
        canRx = true;
        canTx = true;
      }
    } else {
      // Squad Nets
      const isSquadMember = net.linked_squad_id && userSquadIds.includes(net.linked_squad_id);
      
      if (isCommand) {
        // High command can listen to all squads, talk on none (unless member)
        canRx = true;
        canTx = isSquadMember; 
      } else if (isSquadMember) {
        // Regular member
        canRx = true;
        canTx = true;
      }
    }

    return {
      ...net,
      canRx,
      canTx
    };
  });

  // 5. Create LiveKit Token (MOCKED)
  // The livekit-server-sdk is not available in this environment, so we return a mock token.
  // In a real production environment with the SDK installed, we would generate a real JWT here.
  const token = `mock_token_${userId}_${eventId}`;

  return {
    token,
    url: LIVEKIT_URL,
    nets: netPermissions,
    userRank: user.rank
  };
}