/**
 * Broadcast Command
 * Push a short tactical command to OP live feed (for leadership)
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

    // Check permission: Command rank or higher
    const allowedRanks = ['Founder', 'Pioneer'];
    if (!allowedRanks.includes(user.rank)) {
      return Response.json(
        createCommsResult({
          ok: false,
          errorCode: 'FORBIDDEN',
          message: 'Command rank required to broadcast'
        }),
        { status: 403 }
      );
    }

    const { eventId, message } = await req.json();

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
    const channels = await base44.asServiceRole.entities.CommsChannel.filter(
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
    const post = await base44.asServiceRole.entities.CommsPost.create({
      channel_id: channels[0].id,
      author_id: user.id,
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