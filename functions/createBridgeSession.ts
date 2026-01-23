/**
 * Create Voice Bridge Session
 * Allows Voyager+ or Command role to patch two rooms together
 * Returns canonical commsResult structure
 */
import { createCommsResult } from '../components/comms/commsContract.js';

Deno.serve(async (req) => {
  try {
    const base44 = await import('npm:@base44/sdk@0.8.6').then(m => m.createClientFromRequest(req));
    
    const user = await base44.auth.me();
    if (!user) {
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
    const allowedRanks = ['Voyager', 'Pioneer', 'Founder'];
    if (!allowedRanks.includes(user.rank)) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'FORBIDDEN',
          message: 'Voyager+ rank required to create bridges'
        }),
        { status: 403 }
      );
    }

    const { eventId, leftRoom, rightRoom, bridgeType = 'OP_INTERNAL' } = await req.json();

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
    const bridge = await base44.asServiceRole.entities.BridgeSession.create({
      event_id: eventId,
      left_room: leftRoom,
      right_room: rightRoom,
      bridge_type: bridgeType,
      initiated_by: user.id,
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