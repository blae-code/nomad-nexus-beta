import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { AccessToken } from 'npm:livekit@0.16.5';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { roomName, userIdentity } = await req.json();

    if (!roomName || !userIdentity) {
      return new Response(JSON.stringify({ error: 'Missing roomName or userIdentity' }), { status: 400 });
    }

    // Get LiveKit credentials from env
    const apiKey = Deno.env.get('LIVEKIT_API_KEY');
    const apiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!apiKey || !apiSecret) {
      return new Response(JSON.stringify({ error: 'LiveKit credentials not configured' }), { status: 500 });
    }

    // Create access token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: userIdentity,
      name: user.callsign || user.full_name || 'Anonymous',
      grants: {
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        room: roomName,
        roomJoin: true
      }
    });

    const jwt = await token.toJwt();

    return new Response(JSON.stringify({
      token: jwt,
      url: Deno.env.get('LIVEKIT_URL'),
      roomName,
      identity: userIdentity
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to initialize room:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});