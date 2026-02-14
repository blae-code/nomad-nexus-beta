import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { AccessToken } from 'npm:livekit@2.0.0';

const FOCUSED_MEMBERSHIPS = new Set(['MEMBER', 'AFFILIATE', 'PARTNER']);
const DISCIPLINE_MODES = new Set(['OPEN', 'PTT', 'REQUEST_TO_SPEAK', 'COMMAND_ONLY']);

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function isFocusedNet(net: any) {
  const discipline = text(net?.discipline).toLowerCase();
  const type = text(net?.type).toUpperCase();
  return discipline === 'focused' || type === 'FOCUSED' || Boolean(net?.stage_mode);
}

function isTemporaryNet(net: any, netId: string) {
  return Boolean(net?.isTemporary || net?.is_temporary || net?.temporary || net?.is_temp) || netId.includes('briefing-temp');
}

function eventAssignedMemberIds(event: any) {
  const assigned = Array.isArray(event?.assigned_member_profile_ids)
    ? event.assigned_member_profile_ids
    : Array.isArray(event?.assigned_user_ids)
      ? event.assigned_user_ids
      : [];
  return assigned.map((entry: unknown) => text(entry)).filter(Boolean);
}

async function resolveVoiceNet(base44: any, netId: string) {
  if (!base44?.entities?.VoiceNet) return null;
  if (base44.entities.VoiceNet.get) {
    const byGet = await base44.entities.VoiceNet.get(netId).catch(() => null);
    if (byGet) return byGet;
  }
  if (base44.entities.VoiceNet.filter) {
    const rows = await base44.entities.VoiceNet.filter({ id: netId }).catch(() => []);
    if (rows?.[0]) return rows[0];
  }
  return null;
}

async function resolveEvent(base44: any, eventId: string) {
  if (!eventId || !base44?.entities?.Event) return null;
  if (base44.entities.Event.get) {
    const byGet = await base44.entities.Event.get(eventId).catch(() => null);
    if (byGet) return byGet;
  }
  if (base44.entities.Event.filter) {
    const rows = await base44.entities.Event.filter({ id: eventId }).catch(() => []);
    if (rows?.[0]) return rows[0];
  }
  return null;
}

async function deriveVoicePolicy(
  base44: any,
  options: {
    netId: string;
    eventId: string | null;
    fallbackMode: string;
    memberProfileId: string | null;
  }
) {
  const fallback = DISCIPLINE_MODES.has(options.fallbackMode) ? options.fallbackMode : 'PTT';
  if (!base44?.entities?.EventLog?.list) {
    return { disciplineMode: fallback, requestToSpeakApproved: false };
  }

  const rows = await base44.entities.EventLog.list('-created_date', 2200).catch(() => []);
  const ordered = [...(rows || [])].sort(
    (a, b) => new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime()
  );

  const requests = new Map<
    string,
    {
      requesterMemberId: string;
      netId: string;
      eventId: string | null;
      status: string;
    }
  >();

  let disciplineMode = fallback;

  const matchesScope = (entryNetId: string, entryEventId: string | null) => {
    if (entryNetId && entryNetId !== options.netId) return false;
    if (options.eventId && entryEventId && entryEventId !== options.eventId) return false;
    return true;
  };

  for (const entry of ordered) {
    const type = text(entry?.type).toUpperCase();
    const details = entry?.details || {};
    const entryNetId = text(details?.net_id);
    const entryEventIdRaw = text(details?.event_id || entry?.related_entity_id);
    const entryEventId = entryEventIdRaw || null;

    if (type === 'COMMS_DISCIPLINE_MODE') {
      if (!matchesScope(entryNetId, entryEventId)) continue;
      const mode = text(details?.mode).toUpperCase();
      if (DISCIPLINE_MODES.has(mode)) {
        disciplineMode = mode;
      }
      continue;
    }

    if (type === 'COMMS_SPEAK_REQUEST') {
      if (!matchesScope(entryNetId, entryEventId)) continue;
      const requestId = text(details?.request_id || details?.id || entry?.id);
      if (!requestId) continue;
      requests.set(requestId, {
        requesterMemberId: text(details?.requester_member_profile_id || entry?.actor_member_profile_id),
        netId: entryNetId || options.netId,
        eventId: entryEventId,
        status: 'PENDING',
      });
      continue;
    }

    if (type === 'COMMS_SPEAK_REQUEST_STATE') {
      const requestId = text(details?.request_id || details?.id);
      if (!requestId || !requests.has(requestId)) continue;
      const current = requests.get(requestId)!;
      requests.set(requestId, {
        ...current,
        status: text(details?.status || 'PENDING').toUpperCase(),
        netId: current.netId || entryNetId || options.netId,
        eventId: current.eventId || entryEventId || null,
      });
    }
  }

  const requestToSpeakApproved = Array.from(requests.values()).some(
    (row) =>
      row.requesterMemberId === text(options.memberProfileId) &&
      text(row.netId) === options.netId &&
      (!options.eventId || !row.eventId || row.eventId === options.eventId) &&
      row.status === 'APPROVED'
  );

  return {
    disciplineMode,
    requestToSpeakApproved,
  };
}

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

    const { netId, userId, callsign, clientId } = payload;
    const requestedDisciplineMode = text(payload?.disciplineMode || payload?.discipline_mode || 'PTT').toUpperCase();
    const secureMode = Boolean(payload?.secureMode || payload?.secure_mode);
    const secureKeyVersion = text(payload?.secureKeyVersion || payload?.secure_key_version);
    const whisperTarget = payload?.whisperTarget || payload?.whisper_target || null;
    const monitorSubmixes = Array.isArray(payload?.monitorSubmixes || payload?.monitor_submixes)
      ? (payload?.monitorSubmixes || payload?.monitor_submixes)
      : [];
    const txSubmix = text(payload?.txSubmix || payload?.tx_submix || 'SQUAD').toUpperCase();
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

    const voiceNet = await resolveVoiceNet(base44, netId);
    if (!voiceNet) {
      return Response.json({ error: 'Voice net not found' }, { status: 404 });
    }

    const netEventId = text(voiceNet?.event_id || voiceNet?.eventId) || null;
    if (actorType === 'member' && !commandPrivileges && memberProfile?.id && netEventId) {
      const scopedEvent = await resolveEvent(base44, netEventId);
      if (scopedEvent) {
        const assigned = eventAssignedMemberIds(scopedEvent);
        const hostId = text(scopedEvent?.host_id || scopedEvent?.hostId);
        const isAssigned = assigned.includes(memberProfile.id) || hostId === memberProfile.id;
        if (!isAssigned) {
          return Response.json({ error: 'Voice net access denied for this operation' }, { status: 403 });
        }
      }
    }

    if (isFocusedNet(voiceNet) && !isTemporaryNet(voiceNet, netId) && !commandPrivileges) {
      const membership = text(memberProfile?.membership || (isAdminMember(memberProfile) ? 'PARTNER' : 'GUEST')).toUpperCase();
      if (!FOCUSED_MEMBERSHIPS.has(membership)) {
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

    const policy = await deriveVoicePolicy(base44, {
      netId,
      eventId: netEventId,
      fallbackMode: requestedDisciplineMode,
      memberProfileId: memberProfile?.id || userId,
    });

    const canPublishByDiscipline = (() => {
      if (policy.disciplineMode === 'COMMAND_ONLY') return commandPrivileges;
      if (policy.disciplineMode === 'REQUEST_TO_SPEAK') return commandPrivileges || policy.requestToSpeakApproved;
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
      netType: text(voiceNet?.type),
      disciplineMode: policy.disciplineMode,
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
        disciplineMode: policy.disciplineMode,
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
