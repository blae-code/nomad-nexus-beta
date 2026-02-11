import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { AccessToken } from 'npm:livekit@2.0.0';

/**
 * Mint LiveKit access tokens for voice net sessions.
 * Called by frontend when user joins a voice net.
 * Returns { url, token, roomName } or error.
 */
Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, adminUser, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { netId, userId, callsign, clientId, netType } = payload;
    const disciplineMode = String(payload?.disciplineMode || payload?.discipline_mode || 'PTT').toUpperCase();
    const requestToSpeakApproved = Boolean(payload?.requestToSpeakApproved || payload?.request_to_speak_approved);
    const secureMode = Boolean(payload?.secureMode || payload?.secure_mode);
    const secureKeyVersion = String(payload?.secureKeyVersion || payload?.secure_key_version || '').trim();
    const whisperTarget = payload?.whisperTarget || payload?.whisper_target || null;
    const monitorSubmixes = Array.isArray(payload?.monitorSubmixes || payload?.monitor_submixes)
      ? (payload?.monitorSubmixes || payload?.monitor_submixes)
      : [];
    const txSubmix = String(payload?.txSubmix || payload?.tx_submix || 'SQUAD').toUpperCase();
    const disableRecordings = payload?.disableRecordings !== false;

    if (!netId || !userId) {
      return Response.json({ error: 'Missing netId or userId' }, { status: 400 });
    }

    if (actorType === 'member' && memberProfile?.id && userId !== memberProfile.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const rank = String(memberProfile?.rank || '').toUpperCase();
    const roles = Array.isArray(memberProfile?.roles)
      ? memberProfile.roles.map((entry: unknown) => String(entry || '').toLowerCase())
      : [];
    const commandPrivileges = actorType === 'admin' || isAdminMember(memberProfile) || rank === 'COMMANDER' || roles.includes('command') || roles.includes('officer');

    // Enforce policy: Focused nets require Member/Affiliate/Partner membership
    if (netType === 'FOCUSED' && !netId.includes('briefing-temp')) {
      const membership = memberProfile?.membership || (isAdminMember(memberProfile) ? 'PARTNER' : 'GUEST');
      const allowedMemberships = ['MEMBER', 'AFFILIATE', 'PARTNER'];
      
      if (!allowedMemberships.includes(membership)) {
        return Response.json(
          {
            code: 'ACCESS_DENIED',
            reason: 'Focused nets require Member, Affiliate, or Partner membership.',
          },
          { status: 403 }
        );
      }
    }

    const envMode = (Deno.env.get('NODE_ENV') || Deno.env.get('DENO_ENV') || '')?.toLowerCase();
    const isDev = !envMode || envMode === 'development';

    // Check env vars
    const liveKitUrl = Deno.env.get('LIVEKIT_URL');
    const liveKitApiKey = Deno.env.get('LIVEKIT_API_KEY');
    const liveKitApiSecret = Deno.env.get('LIVEKIT_API_SECRET');

    if (!liveKitUrl || !liveKitApiKey || !liveKitApiSecret) {
      // Return structured error; client can fall back to mock
      return Response.json(
        {
          error: 'VOICE_NOT_CONFIGURED',
          message: 'LiveKit credentials not configured. Voice comms unavailable.',
        },
        { status: 503 }
      );
    }

    let normalizedUrl = liveKitUrl.trim();
    if (!isDev && (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('ws://'))) {
      return Response.json(
        {
          error: 'INSECURE_LIVEKIT_URL',
          message: 'Insecure LiveKit URL blocked',
        },
        { status: 400 }
      );
    }

    if (normalizedUrl.startsWith('https://')) {
      normalizedUrl = `wss://${normalizedUrl.slice(8)}`;
    } else if (normalizedUrl.startsWith('http://')) {
      normalizedUrl = `ws://${normalizedUrl.slice(7)}`;
    } else if (!normalizedUrl.startsWith('wss://') && !normalizedUrl.startsWith('ws://')) {
      normalizedUrl = `${isDev ? 'ws' : 'wss'}://${normalizedUrl}`;
    }

    // Generate room name from netId (deterministic)
    const roomName = `nexus-net-${netId}`;

    const canPublishByDiscipline = (() => {
      if (disciplineMode === 'COMMAND_ONLY') return commandPrivileges;
      if (disciplineMode === 'REQUEST_TO_SPEAK') return commandPrivileges || requestToSpeakApproved;
      return true;
    })();
    const canPublish = payload?.canPublish === false ? false : canPublishByDiscipline;
    const canSubscribe = payload?.canSubscribe === false ? false : true;
    const canPublishData = payload?.canPublishData === false ? false : true;

    const token = new AccessToken(liveKitApiKey, liveKitApiSecret);
    token.identity = userId;
    token.name =
      callsign ||
      memberProfile?.display_callsign ||
      memberProfile?.callsign ||
      adminUser?.full_name ||
      'Unknown';
    token.metadata = JSON.stringify({
      callsign: callsign || memberProfile?.display_callsign || memberProfile?.callsign || adminUser?.full_name || 'Unknown',
      clientId: clientId || '',
      netId: netId,
      disciplineMode,
      commandPrivileges,
      secureMode,
      secureKeyVersion: secureKeyVersion || null,
      whisperTarget,
      monitorSubmixes,
      txSubmix,
      disableRecordings,
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish,
      canPublishData,
      canSubscribe,
    });

    return Response.json({
      url: normalizedUrl,
      token: token.toJwt(),
      roomName,
      policy: {
        disciplineMode,
        canPublish,
        canSubscribe,
        secureMode,
        secureKeyVersion: secureKeyVersion || null,
      },
    });
  } catch (error) {
    console.error('[mintVoiceToken]', error.message);
    return Response.json(
      {
        error: 'VOICE_TOKEN_FAILED',
        message: error.message,
      },
      { status: 500 }
    );
  }
});
