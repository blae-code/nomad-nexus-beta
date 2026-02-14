/**
 * Create Voice Bridge Session
 * Allows Voyager+ or Command role to patch two rooms together
 * Returns canonical commsResult structure
 */
import { createCommsResult } from './_shared/commsResult.ts';
import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    
    if (!actorType || !memberProfile) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }),
        { status: 401 }
      );
    }

    // Check permission: Voyager+ or Command role
    const allowedRanks = ['VOYAGER', 'PIONEER', 'FOUNDER'];
    const rank = (memberProfile.rank || '').toUpperCase();
    if (!allowedRanks.includes(rank)) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'FORBIDDEN',
          message: 'Voyager+ rank required to create bridges'
        }),
        { status: 403 }
      );
    }

    const { eventId, leftRoom, rightRoom, bridgeType = 'OP_INTERNAL' } = payload;

    if (!eventId || !leftRoom || !rightRoom) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'eventId, leftRoom, and rightRoom required'
        })
      );
    }

    // Create bridge session
    const bridge = await base44.entities.BridgeSession.create({
      event_id: eventId,
      left_room: leftRoom,
      right_room: rightRoom,
      bridge_type: bridgeType,
      initiated_by_member_profile_id: memberProfile.id,
      status: 'ACTIVE',
      started_at: new Date().toISOString(),
      metadata: {}
    });

    return Response.json(
      createCommsResult({
        ok: true,
        data: bridge,
        message: `Bridge active: ${leftRoom} ↔ ${rightRoom}`
      })
    );
  } catch (error) {
    console.error('[createBridgeSession] Error:', error);
    return Response.json(
      createCommsResult({
        ok: false,
        errorCode: 'SERVER_ERROR',
        message: error.message
      }),
      { status: 500 }
    );
  }
});
