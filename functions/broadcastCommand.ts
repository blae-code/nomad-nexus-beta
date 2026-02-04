/**
 * Broadcast Command
 * Push a short tactical command to OP live feed (for leadership)
 * Returns canonical commsResult structure
 */
import { createCommsResult } from '../components/comms/commsContract.js';
import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    if (!actorType) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'UNAUTHORIZED',
          message: 'User not authenticated'
        }),
        { status: 401 }
      );
    }

    // Check permission: Command rank or higher
    const allowedRanks = ['FOUNDER', 'PIONEER'];
    const rank = (memberProfile?.rank || '').toUpperCase();
    if (!allowedRanks.includes(rank) && !isAdminMember(memberProfile) && actorType !== 'admin') {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'FORBIDDEN',
          message: 'Command rank required to broadcast'
        }),
        { status: 403 }
      );
    }

    const { eventId, message } = payload;

    if (!eventId || !message) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'INVALID_PARAMS',
          message: 'eventId and message required'
        })
      );
    }

    // Find OP live feed channel
    const channels = await base44.entities.CommsChannel.filter(
      { scope_id: eventId, type: 'OPS_FEED' },
      '-created_date',
      1
    );

    if (!channels || channels.length === 0) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'CHANNEL_NOT_FOUND',
          message: 'Operation live feed not found'
        })
      );
    }

    // Create post in live feed
    const post = await base44.entities.CommsPost.create({
      channel_id: channels[0].id,
      author_id: memberProfile?.id,
      content: message,
      template_type: 'OPS_UPDATE',
      is_pinned: true
    });

    return Response.json(
      createCommsResult({
        ok: true,
        data: post,
        message: 'Command broadcast to live feed'
      })
    );
  } catch (error) {
    console.error('[broadcastCommand] Error:', error);
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
