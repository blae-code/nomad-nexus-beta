import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER', 'VOYAGER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'communications', 'comms']);
const PRIORITY_LEVELS = new Set(['STANDARD', 'HIGH', 'CRITICAL']);
const CAPTION_SEVERITY = new Set(['INFO', 'ALERT', 'CRITICAL']);
const MODERATION_ACTIONS = new Set(['MUTE', 'UNMUTE', 'DEAFEN', 'UNDEAFEN', 'KICK', 'LOCK_CHANNEL', 'UNLOCK_CHANNEL']);
const DISCIPLINE_MODES = new Set(['OPEN', 'PTT', 'REQUEST_TO_SPEAK', 'COMMAND_ONLY']);
const COMMAND_BUS_ACTIONS = new Set(['SILENCE_UNTIL_CLEARED', 'CLEAR_TO_TRANSMIT', 'PRIORITY_OVERRIDE', 'REQUEST_TO_SPEAK', 'REQUEST_APPROVED', 'REQUEST_DENIED']);
const SUBMIX_CHANNELS = new Set(['COMMAND', 'SQUAD', 'LOCAL']);
const MAP_MACRO_IDS = new Set([
  'ISSUE_CRITICAL_CALLOUT',
  'PRIORITY_OVERRIDE',
  'LOCK_COMMAND_DISCIPLINE',
  'ENABLE_SECURE_NET',
  'REQUEST_SITREP_BURST',
]);

type UpdateAttempt = Record<string, unknown>;

type ScheduledMessage = {
  id: string;
  channel_id: string;
  content: string;
  send_at: string;
  status: 'scheduled' | 'cancelled' | 'dispatched';
  created_by_member_profile_id: string | null;
  created_at: string;
  dispatched_message_id?: string | null;
  reason?: string;
};

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toIso(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function hasCommandAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.some((role: string) => COMMAND_ROLES.has(role));
}

async function createFirstSuccessful(entity: any, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await entity.create(payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Create failed');
}

async function writeCommsLog(base44: any, payload: UpdateAttempt) {
  return createFirstSuccessful(base44.entities.EventLog, [
    payload,
    {
      type: payload.type,
      severity: payload.severity,
      actor_member_profile_id: payload.actor_member_profile_id,
      summary: payload.summary,
    },
  ]);
}

function buildScheduledMessages(eventLogs: any[]) {
  const ordered = [...(eventLogs || [])].sort(
    (a, b) => new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime()
  );

  const byId = new Map<string, ScheduledMessage>();
  for (const entry of ordered) {
    const type = text(entry?.type).toUpperCase();
    const details = entry?.details || {};
    if (type === 'COMMS_SCHEDULED_MESSAGE') {
      const id = text(details?.id || details?.schedule_id);
      if (!id) continue;
      byId.set(id, {
        id,
        channel_id: text(details?.channel_id),
        content: text(details?.content),
        send_at: text(details?.send_at),
        status: text(details?.status || 'scheduled').toLowerCase() === 'cancelled' ? 'cancelled' : 'scheduled',
        created_by_member_profile_id: details?.created_by_member_profile_id ? text(details.created_by_member_profile_id) : null,
        created_at: text(details?.created_at || entry?.created_date),
      });
    }

    if (type === 'COMMS_SCHEDULED_MESSAGE_STATE') {
      const scheduleId = text(details?.scheduled_message_id || details?.id || details?.schedule_id);
      if (!scheduleId || !byId.has(scheduleId)) continue;
      const current = byId.get(scheduleId)!;
      const state = text(details?.status).toLowerCase();
      if (state === 'cancelled' || state === 'dispatched') {
        byId.set(scheduleId, {
          ...current,
          status: state,
          dispatched_message_id: details?.dispatched_message_id ? text(details.dispatched_message_id) : current.dispatched_message_id || null,
          reason: details?.reason ? text(details.reason) : current.reason,
        });
      }
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.send_at).getTime() - new Date(b.send_at).getTime()
  );
}

function eventIdFromEntry(entry: any) {
  return text(entry?.details?.event_id || entry?.related_entity_id);
}

function buildPriorityCallouts(eventLogs: any[], eventId: string | null = null) {
  return (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_PRIORITY_CALLOUT')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .map((entry) => {
      const details = entry?.details || {};
      return {
        id: entry?.id,
        event_id: text(details?.event_id),
        channel_id: text(details?.channel_id),
        lane: text(details?.lane || 'COMMAND'),
        priority: text(details?.priority || 'STANDARD').toUpperCase(),
        message: text(details?.message),
        requires_ack: Boolean(details?.requires_ack),
        issued_by_member_profile_id: text(details?.issued_by_member_profile_id || entry?.actor_member_profile_id),
        created_date: entry?.created_date || null,
      };
    })
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
}

function buildCaptionFeed(eventLogs: any[], options: { eventId?: string | null; netId?: string | null; limit?: number }) {
  const { eventId = null, netId = null, limit = 120 } = options;
  const rows = (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_VOICE_CAPTION')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
    .map((entry) => {
      const details = entry?.details || {};
      return {
        id: entry?.id,
        event_id: text(details?.event_id),
        net_id: text(details?.net_id),
        speaker: text(details?.speaker),
        text: text(details?.text),
        severity: text(details?.severity || 'INFO').toUpperCase(),
        created_date: entry?.created_date || details?.captured_at || null,
      };
    })
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
  return rows.slice(0, Math.max(1, limit));
}

function buildModerationFeed(eventLogs: any[], eventId: string | null = null) {
  return (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_VOICE_MODERATION')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .map((entry) => {
      const details = entry?.details || {};
      return {
        id: entry?.id,
        event_id: text(details?.event_id),
        moderation_action: text(details?.moderation_action).toUpperCase(),
        target_member_profile_id: text(details?.target_member_profile_id),
        reason: text(details?.reason),
        channel_id: text(details?.channel_id),
        duration_seconds: safeNumber(details?.duration_seconds, 0),
        penalty_expires_at: text(details?.penalty_expires_at),
        radio_check: Boolean(details?.radio_check),
        moderated_by_member_profile_id: text(details?.moderated_by_member_profile_id || entry?.actor_member_profile_id),
        created_date: entry?.created_date || null,
      };
    })
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildDisciplineState(eventLogs: any[], options: { eventId?: string | null; netId?: string | null }) {
  const { eventId = null, netId = null } = options;
  const filtered = (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_DISCIPLINE_MODE')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
    .sort((a, b) => new Date(b?.created_date || 0).getTime() - new Date(a?.created_date || 0).getTime());
  const latest = filtered[0];
  if (!latest) return null;
  return {
    mode: text(latest?.details?.mode || 'PTT').toUpperCase(),
    net_id: text(latest?.details?.net_id),
    event_id: text(latest?.details?.event_id),
    actor_member_profile_id: text(latest?.actor_member_profile_id || latest?.details?.actor_member_profile_id),
    updated_at: latest?.created_date || null,
  };
}

function buildSpeakRequestFeed(eventLogs: any[], options: { eventId?: string | null; netId?: string | null; includeResolved?: boolean }) {
  const { eventId = null, netId = null, includeResolved = true } = options;
  const ordered = [...(eventLogs || [])].sort(
    (a, b) => new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime()
  );
  const requests = new Map<string, any>();

  for (const entry of ordered) {
    const type = text(entry?.type).toUpperCase();
    const details = entry?.details || {};
    if (type === 'COMMS_SPEAK_REQUEST') {
      const requestId = text(details?.request_id || details?.id || entry?.id);
      if (!requestId) continue;
      if (eventId && eventIdFromEntry(entry) !== eventId) continue;
      if (netId && text(details?.net_id) !== netId) continue;
      requests.set(requestId, {
        request_id: requestId,
        event_id: text(details?.event_id),
        net_id: text(details?.net_id),
        requester_member_profile_id: text(details?.requester_member_profile_id || entry?.actor_member_profile_id),
        status: 'PENDING',
        reason: text(details?.reason),
        created_date: entry?.created_date || null,
        resolved_at: null,
        resolved_by_member_profile_id: null,
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
        resolved_at: entry?.created_date || null,
        resolved_by_member_profile_id: text(details?.resolved_by_member_profile_id || entry?.actor_member_profile_id),
      });
    }
  }

  let rows = Array.from(requests.values()).sort(
    (a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
  );
  if (!includeResolved) {
    rows = rows.filter((entry) => entry.status === 'PENDING');
  }
  return rows;
}

function buildTelemetryFeed(eventLogs: any[], options: { eventId?: string | null; netId?: string | null; limit?: number }) {
  const { eventId = null, netId = null, limit = 120 } = options;
  const rows = (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_VOICE_TELEMETRY')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
    .map((entry) => ({
      id: entry?.id,
      event_id: text(entry?.details?.event_id),
      net_id: text(entry?.details?.net_id),
      member_profile_id: text(entry?.details?.member_profile_id || entry?.actor_member_profile_id),
      rtt_ms: safeNumber(entry?.details?.rtt_ms),
      jitter_ms: safeNumber(entry?.details?.jitter_ms),
      packet_loss_pct: safeNumber(entry?.details?.packet_loss_pct),
      mos_proxy: safeNumber(entry?.details?.mos_proxy),
      created_date: entry?.created_date || null,
    }))
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
  return rows.slice(0, Math.max(1, limit));
}

function buildRadioLog(eventLogs: any[], options: { eventId?: string | null; netId?: string | null; limit?: number; query?: string | null }) {
  const { eventId = null, netId = null, limit = 200, query = null } = options;
  const normalizedQuery = text(query).toLowerCase();
  let rows = (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_RADIO_LOG')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
    .map((entry) => ({
      id: entry?.id,
      event_id: text(entry?.details?.event_id),
      net_id: text(entry?.details?.net_id),
      speaker_member_profile_id: text(entry?.details?.speaker_member_profile_id),
      speaker: text(entry?.details?.speaker),
      transcript: text(entry?.details?.transcript),
      transcript_confidence: safeNumber(entry?.details?.transcript_confidence, 0),
      started_at: text(entry?.details?.started_at || entry?.created_date),
      ended_at: text(entry?.details?.ended_at || entry?.created_date),
      source_clip_id: text(entry?.details?.source_clip_id),
      created_date: entry?.created_date || null,
    }))
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());

  if (normalizedQuery) {
    rows = rows.filter((entry) =>
      entry.transcript.toLowerCase().includes(normalizedQuery) ||
      entry.speaker.toLowerCase().includes(normalizedQuery)
    );
  }
  return rows.slice(0, Math.max(1, limit));
}

function buildVoiceClipFeed(eventLogs: any[], options: { eventId?: string | null; netId?: string | null; limit?: number }) {
  const { eventId = null, netId = null, limit = 120 } = options;
  return (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_VOICE_CLIP')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
    .map((entry) => ({
      id: entry?.id,
      event_id: text(entry?.details?.event_id),
      net_id: text(entry?.details?.net_id),
      clip_seconds: safeNumber(entry?.details?.clip_seconds, 60),
      ttl_hours: safeNumber(entry?.details?.ttl_hours, 24),
      visibility: text(entry?.details?.visibility || 'COMMAND').toUpperCase(),
      title: text(entry?.details?.title || 'Voice Clip'),
      captured_by_member_profile_id: text(entry?.details?.captured_by_member_profile_id || entry?.actor_member_profile_id),
      retention_expires_at: text(entry?.details?.retention_expires_at),
      created_date: entry?.created_date || null,
    }))
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())
    .slice(0, Math.max(1, limit));
}

function buildCommandWhisperFeed(eventLogs: any[], options: { eventId?: string | null; includeReceipts?: boolean }) {
  const { eventId = null, includeReceipts = true } = options;
  const ordered = [...(eventLogs || [])].sort(
    (a, b) => new Date(a?.created_date || 0).getTime() - new Date(b?.created_date || 0).getTime()
  );
  const whispers = new Map<string, any>();
  for (const entry of ordered) {
    const type = text(entry?.type).toUpperCase();
    const details = entry?.details || {};
    if (type === 'COMMS_COMMAND_WHISPER') {
      if (eventId && eventIdFromEntry(entry) !== eventId) continue;
      const whisperId = text(details?.whisper_id || details?.id || entry?.id);
      if (!whisperId) continue;
      whispers.set(whisperId, {
        whisper_id: whisperId,
        event_id: text(details?.event_id),
        sender_member_profile_id: text(details?.sender_member_profile_id || entry?.actor_member_profile_id),
        target_member_profile_id: text(details?.target_member_profile_id),
        target_type: text(details?.target_type),
        voice_instruction: text(details?.voice_instruction),
        text_summary: text(details?.text_summary),
        status: 'SENT',
        receipts: [] as Array<Record<string, unknown>>,
        created_date: entry?.created_date || null,
      });
      continue;
    }
    if (type === 'COMMS_COMMAND_WHISPER_RECEIPT') {
      const whisperId = text(details?.whisper_id);
      if (!whisperId || !whispers.has(whisperId)) continue;
      const current = whispers.get(whisperId)!;
      const receipt = {
        member_profile_id: text(details?.member_profile_id || entry?.actor_member_profile_id),
        state: text(details?.state || 'ACK').toUpperCase(),
        note: text(details?.note),
        created_date: entry?.created_date || null,
      };
      whispers.set(whisperId, {
        ...current,
        status: receipt.state === 'NAK' ? 'NAK' : 'ACK',
        receipts: [...current.receipts, receipt],
      });
    }
  }

  return Array.from(whispers.values())
    .map((row) => ({
      ...row,
      receipts: includeReceipts ? row.receipts : [],
    }))
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
}

function buildCommandBusFeed(eventLogs: any[], options: { eventId?: string | null; netId?: string | null; limit?: number }) {
  const { eventId = null, netId = null, limit = 200 } = options;
  return (eventLogs || [])
    .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_COMMAND_BUS')
    .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
    .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
    .map((entry) => ({
      id: entry?.id,
      event_id: text(entry?.details?.event_id),
      net_id: text(entry?.details?.net_id),
      action: text(entry?.details?.action).toUpperCase(),
      payload: entry?.details?.payload || {},
      actor_member_profile_id: text(entry?.details?.actor_member_profile_id || entry?.actor_member_profile_id),
      created_date: entry?.created_date || null,
    }))
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime())
    .slice(0, Math.max(1, limit));
}

function resolvePresenceNet(presence: any, voiceNets: any[]) {
  const netId = text(presence?.net_id || presence?.current_net?.id);
  const netCode = text(presence?.current_net?.code || presence?.net_code);
  if (netId) {
    const match = voiceNets.find((net: any) => text(net?.id) === netId);
    if (match) return match;
  }
  if (netCode) {
    const match = voiceNets.find((net: any) => text(net?.code).toUpperCase() === netCode.toUpperCase());
    if (match) return match;
  }
  return null;
}

function summarizeNetLoad(voiceNets: any[], memberships: any[], callouts: any[], captions: any[]) {
  return voiceNets.map((net) => {
    const netId = text(net?.id);
    const netCode = text(net?.code).toUpperCase();
    const netLabel = text(net?.label || net?.name).toUpperCase();
    const memberCount = memberships.filter((entry) => text(entry?.net_id) === netId).length;
    const calloutCount = callouts.filter((entry) => {
      const calloutNetId = text(entry?.net_id);
      if (calloutNetId && calloutNetId === netId) return true;
      const lane = text(entry?.lane).toUpperCase();
      if (!lane) return false;
      return (
        netCode.includes(lane) ||
        netLabel.includes(lane) ||
        lane.includes(netCode)
      );
    }).length;
    const captionCount = captions.filter((entry) => text(entry?.net_id) === netId).length;
    return {
      net_id: netId,
      participants: memberCount,
      callouts: calloutCount,
      captions: captionCount,
      traffic_score: memberCount + (calloutCount * 2) + captionCount,
    };
  });
}

async function notifyMember(base44: any, memberId: string, title: string, message: string, relatedEntityId: string | null = null) {
  if (!memberId) return;
  try {
    await createFirstSuccessful(base44.entities.Notification, [
      {
        user_id: memberId,
        type: 'system',
        title,
        message,
        related_entity_type: relatedEntityId ? 'event' : undefined,
        related_entity_id: relatedEntityId || undefined,
      },
      {
        user_id: memberId,
        type: 'system',
        title,
        message,
      },
    ]);
  } catch (error) {
    console.error('[updateCommsConsole] Notification failed:', (error as Error).message);
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const action = text(payload.action).toLowerCase();
    if (!action) {
      return Response.json({ error: 'action required' }, { status: 400 });
    }

    const actorMemberId = memberProfile?.id || null;
    const commandAccess = hasCommandAccess(memberProfile, actorType);
    const nowIso = new Date().toISOString();
    const scopedEventId = text(payload.eventId || payload.event_id) || null;

    if (actorType === 'member' && !commandAccess && scopedEventId) {
      const scopedEvent = base44.entities.Event?.get
        ? await base44.entities.Event.get(scopedEventId).catch(() => null)
        : null;
      if (!scopedEvent) {
        return Response.json({ error: 'Operation not found' }, { status: 404 });
      }
      const assignedMemberIds = Array.isArray(scopedEvent?.assigned_member_profile_ids)
        ? scopedEvent.assigned_member_profile_ids
        : Array.isArray(scopedEvent?.assigned_user_ids)
          ? scopedEvent.assigned_user_ids
          : [];
      const assigned = assignedMemberIds.map((entry: unknown) => text(entry)).filter(Boolean);
      const hostMemberId = text(scopedEvent?.host_id || scopedEvent?.hostId);
      if (!actorMemberId || (!assigned.includes(actorMemberId) && hostMemberId !== actorMemberId)) {
        return Response.json({ error: 'Operation access denied' }, { status: 403 });
      }
    }

    if (action === 'schedule_message') {
      const channelId = text(payload.channelId || payload.channel_id);
      const content = text(payload.content || payload.message);
      const sendAt = toIso(payload.sendAt || payload.send_at);
      if (!channelId || !content || !sendAt) {
        return Response.json({ error: 'channelId, content, and sendAt are required' }, { status: 400 });
      }
      const sendMs = new Date(sendAt).getTime();
      if (sendMs <= Date.now()) {
        return Response.json({ error: 'sendAt must be in the future' }, { status: 400 });
      }

      const channel = await base44.entities.Channel.get(channelId);
      if (!channel) {
        return Response.json({ error: 'Channel not found' }, { status: 404 });
      }

      const schedule: ScheduledMessage = {
        id: text(payload.scheduleId, `sched_${Date.now()}`),
        channel_id: channelId,
        content,
        send_at: sendAt,
        status: 'scheduled',
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      };

      const log = await writeCommsLog(base44, {
        type: 'COMMS_SCHEDULED_MESSAGE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Scheduled message for ${channelId}`,
        details: schedule,
      });

      return Response.json({
        success: true,
        action,
        schedule,
        logId: log?.id || null,
      });
    }

    if (action === 'list_scheduled_messages') {
      const eventLogs = await base44.entities.EventLog.list('-created_date', 600);
      let schedules = buildScheduledMessages(eventLogs || []);
      if (!commandAccess) {
        schedules = schedules.filter((entry) => entry.created_by_member_profile_id === actorMemberId);
      }
      return Response.json({
        success: true,
        action,
        schedules,
      });
    }

    if (action === 'cancel_scheduled_message') {
      const scheduleId = text(payload.scheduleId || payload.id);
      if (!scheduleId) {
        return Response.json({ error: 'scheduleId required' }, { status: 400 });
      }
      const eventLogs = await base44.entities.EventLog.list('-created_date', 600);
      const schedules = buildScheduledMessages(eventLogs || []);
      const schedule = schedules.find((entry) => entry.id === scheduleId);
      if (!schedule) {
        return Response.json({ error: 'Scheduled message not found' }, { status: 404 });
      }
      if (schedule.status !== 'scheduled') {
        return Response.json({ error: `Scheduled message is already ${schedule.status}` }, { status: 400 });
      }
      if (!commandAccess && schedule.created_by_member_profile_id !== actorMemberId) {
        return Response.json({ error: 'Cannot cancel another member schedule without command privileges' }, { status: 403 });
      }

      const reason = text(payload.reason || '');
      const state = {
        scheduled_message_id: schedule.id,
        status: 'cancelled',
        reason,
        updated_at: nowIso,
      };

      const log = await writeCommsLog(base44, {
        type: 'COMMS_SCHEDULED_MESSAGE_STATE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Cancelled scheduled message ${schedule.id}`,
        details: state,
      });

      return Response.json({
        success: true,
        action,
        schedule: { ...schedule, status: 'cancelled', reason: reason || undefined },
        logId: log?.id || null,
      });
    }

    if (action === 'dispatch_due_messages') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }

      const nowMs = Date.now();
      const eventLogs = await base44.entities.EventLog.list('-created_date', 800);
      const schedules = buildScheduledMessages(eventLogs || []);
      const due = schedules.filter((entry) => entry.status === 'scheduled' && new Date(entry.send_at).getTime() <= nowMs);

      const dispatches: Array<Record<string, unknown>> = [];
      for (const entry of due) {
        const sourceMemberId = entry.created_by_member_profile_id || actorMemberId;
        const message = await createFirstSuccessful(base44.entities.Message, [
          {
            channel_id: entry.channel_id,
            user_id: sourceMemberId,
            content: entry.content,
          },
          {
            channel_id: entry.channel_id,
            content: entry.content,
          },
        ]);

        await writeCommsLog(base44, {
          type: 'COMMS_SCHEDULED_MESSAGE_STATE',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          summary: `Dispatched scheduled message ${entry.id}`,
          details: {
            scheduled_message_id: entry.id,
            status: 'dispatched',
            dispatched_message_id: message?.id || null,
            dispatched_at: nowIso,
          },
        });

        dispatches.push({
          scheduleId: entry.id,
          messageId: message?.id || null,
          channelId: entry.channel_id,
        });
      }

      return Response.json({
        success: true,
        action,
        dispatchedCount: dispatches.length,
        dispatches,
      });
    }

    if (action === 'issue_priority_callout') {
      const message = text(payload.message || payload.content);
      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }
      const priority = text(payload.priority || 'STANDARD').toUpperCase();
      const normalizedPriority = PRIORITY_LEVELS.has(priority) ? priority : 'STANDARD';
      if (normalizedPriority !== 'STANDARD' && !commandAccess) {
        return Response.json({ error: 'Command privileges required for HIGH/CRITICAL callouts' }, { status: 403 });
      }

      const channelId = text(payload.channelId || payload.channel_id);
      if (channelId) {
        const channel = await base44.entities.Channel.get(channelId).catch(() => null);
        if (!channel) {
          return Response.json({ error: 'Channel not found' }, { status: 404 });
        }
      }

      const eventId = text(payload.eventId || payload.event_id);
      const lane = text(payload.lane || payload.voice_lane || 'COMMAND').toUpperCase();
      const requiresAck = Boolean(payload.requiresAck || payload.requires_ack);

      let relayedMessageId: string | null = null;
      if (channelId) {
        const relayed = await createFirstSuccessful(base44.entities.Message, [
          {
            channel_id: channelId,
            user_id: actorMemberId,
            content: `[${normalizedPriority}] ${message}`,
          },
          {
            channel_id: channelId,
            content: `[${normalizedPriority}] ${message}`,
          },
        ]);
        relayedMessageId = relayed?.id || null;
      }

      const details = {
        event_id: eventId || null,
        channel_id: channelId || null,
        lane,
        priority: normalizedPriority,
        message,
        requires_ack: requiresAck,
        issued_by_member_profile_id: actorMemberId,
        issued_at: nowIso,
        relayed_message_id: relayedMessageId,
      };

      const log = await writeCommsLog(base44, {
        type: 'COMMS_PRIORITY_CALLOUT',
        severity: normalizedPriority === 'CRITICAL' ? 'MEDIUM' : normalizedPriority === 'HIGH' ? 'LOW' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Priority callout (${normalizedPriority})`,
        details,
      });

      if (normalizedPriority === 'CRITICAL' && eventId) {
        const event = base44.entities.Event?.get
          ? await base44.entities.Event.get(eventId).catch(() => null)
          : null;
        const targets = Array.isArray(event?.assigned_member_profile_ids)
          ? event.assigned_member_profile_ids
          : Array.isArray(event?.assigned_user_ids)
            ? event.assigned_user_ids
            : [];
        for (const memberId of targets) {
          await notifyMember(base44, text(memberId), 'Critical Comms Callout', message, eventId);
        }
      }

      return Response.json({
        success: true,
        action,
        callout: details,
        logId: log?.id || null,
      });
    }

    if (action === 'list_priority_callouts') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 900);
      const callouts = buildPriorityCallouts(eventLogs || [], eventId);
      return Response.json({
        success: true,
        action,
        callouts,
      });
    }

    if (action === 'record_voice_caption') {
      const captionText = text(payload.text || payload.caption);
      if (!captionText) {
        return Response.json({ error: 'text required' }, { status: 400 });
      }
      const severity = text(payload.severity || 'INFO').toUpperCase();
      const normalizedSeverity = CAPTION_SEVERITY.has(severity) ? severity : 'INFO';

      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        channel_id: text(payload.channelId || payload.channel_id) || null,
        speaker: text(payload.speaker || memberProfile?.display_callsign || memberProfile?.callsign || 'Unknown'),
        text: captionText,
        severity: normalizedSeverity,
        captured_by_member_profile_id: actorMemberId,
        captured_at: nowIso,
      };

      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_CAPTION',
        severity: normalizedSeverity === 'CRITICAL' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Voice caption (${normalizedSeverity})`,
        details,
      });

      return Response.json({
        success: true,
        action,
        caption: details,
        logId: log?.id || null,
      });
    }

    if (action === 'list_voice_captions') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const limitRaw = Number(payload.limit || 120);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 300)) : 120;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 1200);
      const captions = buildCaptionFeed(eventLogs || [], { eventId, netId, limit });
      return Response.json({
        success: true,
        action,
        captions,
      });
    }

    if (action === 'set_voice_alert_preferences') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        member_profile_id: actorMemberId,
        preferences: {
          text_fallback: Boolean(payload?.preferences?.text_fallback ?? payload?.text_fallback ?? true),
          show_visual_alerts: Boolean(payload?.preferences?.show_visual_alerts ?? payload?.show_visual_alerts ?? true),
          play_audio_cues: Boolean(payload?.preferences?.play_audio_cues ?? payload?.play_audio_cues ?? true),
          vibrate_alerts: Boolean(payload?.preferences?.vibrate_alerts ?? payload?.vibrate_alerts ?? false),
          caption_font_scale: Number(payload?.preferences?.caption_font_scale ?? payload?.caption_font_scale ?? 1),
        },
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_ALERT_PREFERENCES',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice accessibility preferences updated',
        details,
      });

      return Response.json({
        success: true,
        action,
        preferences: details.preferences,
        logId: log?.id || null,
      });
    }

    if (action === 'moderate_voice_user') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const moderationAction = text(payload.moderationAction || payload.moderation_action).toUpperCase();
      if (!MODERATION_ACTIONS.has(moderationAction)) {
        return Response.json({ error: 'Unsupported moderation action' }, { status: 400 });
      }
      const targetMemberProfileId = text(payload.targetMemberProfileId || payload.target_member_profile_id);
      const needsTarget = moderationAction !== 'LOCK_CHANNEL' && moderationAction !== 'UNLOCK_CHANNEL';
      if (needsTarget && !targetMemberProfileId) {
        return Response.json({ error: 'targetMemberProfileId required for this moderation action' }, { status: 400 });
      }
      const durationSeconds = Math.max(0, Math.floor(safeNumber(payload.durationSeconds || payload.duration_seconds, 0)));
      const radioCheck = Boolean(payload.radioCheck || payload.radio_check);
      const penaltyExpiresAt = durationSeconds > 0
        ? new Date(Date.now() + durationSeconds * 1000).toISOString()
        : null;

      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        moderation_action: moderationAction,
        target_member_profile_id: targetMemberProfileId || null,
        channel_id: text(payload.channelId || payload.channel_id) || null,
        reason: text(payload.reason || ''),
        duration_seconds: durationSeconds || null,
        penalty_expires_at: penaltyExpiresAt,
        radio_check: radioCheck,
        moderated_by_member_profile_id: actorMemberId,
        moderated_at: nowIso,
      };

      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_MODERATION',
        severity: moderationAction === 'KICK' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Voice moderation: ${moderationAction}`,
        details,
      });

      if (targetMemberProfileId && targetMemberProfileId !== actorMemberId) {
        await notifyMember(
          base44,
          targetMemberProfileId,
          'Voice Moderation Action',
          `${moderationAction}${details.reason ? ` - ${details.reason}` : ''}`,
          details.event_id ? String(details.event_id) : null
        );
      }

      return Response.json({
        success: true,
        action,
        moderation: details,
        logId: log?.id || null,
      });
    }

    if (action === 'list_voice_moderation') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 900);
      const moderation = buildModerationFeed(eventLogs || [], eventId);
      return Response.json({
        success: true,
        action,
        moderation,
      });
    }

    if (action === 'set_voice_discipline_mode') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const mode = text(payload.mode || payload.discipline_mode || 'PTT').toUpperCase();
      if (!DISCIPLINE_MODES.has(mode)) {
        return Response.json({ error: 'Unsupported discipline mode' }, { status: 400 });
      }
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        mode,
        actor_member_profile_id: actorMemberId,
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_DISCIPLINE_MODE',
        severity: mode === 'COMMAND_ONLY' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Voice discipline mode -> ${mode}`,
        details,
      });

      return Response.json({
        success: true,
        action,
        discipline: details,
        logId: log?.id || null,
      });
    }

    if (action === 'get_voice_discipline_state') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const includeResolved = payload.includeResolved === true;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 1400);
      const discipline = buildDisciplineState(eventLogs || [], { eventId, netId });
      const speakRequests = buildSpeakRequestFeed(eventLogs || [], { eventId, netId, includeResolved });
      return Response.json({
        success: true,
        action,
        discipline: discipline || { mode: 'PTT', event_id: eventId, net_id: netId, updated_at: null },
        speakRequests,
      });
    }

    if (action === 'request_to_speak') {
      const netId = text(payload.netId || payload.net_id);
      if (!netId) {
        return Response.json({ error: 'netId required' }, { status: 400 });
      }
      const requestId = text(payload.requestId || payload.request_id, `rts_${Date.now()}`);
      const details = {
        request_id: requestId,
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: netId,
        requester_member_profile_id: actorMemberId,
        reason: text(payload.reason || ''),
        requested_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_SPEAK_REQUEST',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Speak request on ${netId}`,
        details,
      });
      return Response.json({
        success: true,
        action,
        request: {
          ...details,
          status: 'PENDING',
        },
        logId: log?.id || null,
      });
    }

    if (action === 'resolve_speak_request') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const requestId = text(payload.requestId || payload.request_id);
      if (!requestId) {
        return Response.json({ error: 'requestId required' }, { status: 400 });
      }
      const state = text(payload.state || payload.decision || 'APPROVED').toUpperCase();
      if (!['APPROVED', 'DENIED', 'CANCELLED'].includes(state)) {
        return Response.json({ error: 'Invalid state' }, { status: 400 });
      }
      const details = {
        request_id: requestId,
        status: state,
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        resolved_by_member_profile_id: actorMemberId,
        resolved_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_SPEAK_REQUEST_STATE',
        severity: state === 'DENIED' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Speak request ${requestId} -> ${state}`,
        details,
      });
      return Response.json({
        success: true,
        action,
        resolution: details,
        logId: log?.id || null,
      });
    }

    if (action === 'record_voice_telemetry') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        rtt_ms: safeNumber(payload.rttMs || payload.rtt_ms, 0),
        jitter_ms: safeNumber(payload.jitterMs || payload.jitter_ms, 0),
        packet_loss_pct: safeNumber(payload.packetLossPct || payload.packet_loss_pct, 0),
        mos_proxy: safeNumber(payload.mosProxy || payload.mos_proxy, 5),
        profile_hint: text(payload.profileHint || payload.profile_hint),
        recorded_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_TELEMETRY',
        severity: details.packet_loss_pct >= 10 ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice telemetry snapshot',
        details,
      });
      return Response.json({
        success: true,
        action,
        telemetry: details,
        logId: log?.id || null,
      });
    }

    if (action === 'list_voice_telemetry') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const limitRaw = Number(payload.limit || 120);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 400)) : 120;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 1800);
      const telemetry = buildTelemetryFeed(eventLogs || [], { eventId, netId, limit });
      return Response.json({
        success: true,
        action,
        telemetry,
      });
    }

    if (action === 'set_voice_output_profile') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        output_device_id: text(payload.outputDeviceId || payload.output_device_id),
        normalize_enabled: Boolean(payload.normalizeEnabled ?? payload.normalize_enabled ?? true),
        per_user_gain_db: payload.perUserGainDb || payload.per_user_gain_db || {},
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_OUTPUT_PROFILE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice output profile updated',
        details,
      });
      return Response.json({
        success: true,
        action,
        profile: details,
        logId: log?.id || null,
      });
    }

    if (action === 'set_voice_submix_profile') {
      const monitors = Array.isArray(payload.monitorSubmixes || payload.monitor_submixes)
        ? (payload.monitorSubmixes || payload.monitor_submixes)
        : [];
      const normalizedMonitors = Array.from(new Set(monitors.map((entry: unknown) => text(entry).toUpperCase())))
        .filter((entry) => SUBMIX_CHANNELS.has(entry));
      const txSubmix = text(payload.txSubmix || payload.tx_submix || 'SQUAD').toUpperCase();
      const normalizedTxSubmix = SUBMIX_CHANNELS.has(txSubmix) ? txSubmix : 'SQUAD';

      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        monitor_submixes: normalizedMonitors,
        tx_submix: normalizedTxSubmix,
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_SUBMIX_PROFILE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice submix profile updated',
        details,
      });
      return Response.json({
        success: true,
        action,
        submix: details,
        logId: log?.id || null,
      });
    }

    if (action === 'sync_op_voice_text_presence') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        channel_id: text(payload.channelId || payload.channel_id) || null,
        member_profile_id: actorMemberId,
        status: text(payload.status || 'in-call'),
        preset: text(payload.preset || 'operation-default'),
        synced_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_OP_SYNC',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Operation comms topology synced',
        details,
      });
      return Response.json({
        success: true,
        action,
        sync: details,
        logId: log?.id || null,
      });
    }

    if (action === 'append_radio_log_entry') {
      const transcript = text(payload.transcript || payload.text);
      if (!transcript) {
        return Response.json({ error: 'transcript required' }, { status: 400 });
      }
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        speaker_member_profile_id: text(payload.speakerMemberProfileId || payload.speaker_member_profile_id || actorMemberId),
        speaker: text(payload.speaker || memberProfile?.display_callsign || memberProfile?.callsign || 'Unknown'),
        transcript,
        transcript_confidence: safeNumber(payload.transcriptConfidence || payload.transcript_confidence, 0.82),
        started_at: text(payload.startedAt || payload.started_at || nowIso),
        ended_at: text(payload.endedAt || payload.ended_at || nowIso),
        source_clip_id: text(payload.sourceClipId || payload.source_clip_id),
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_RADIO_LOG',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Radio log entry captured',
        details,
      });
      return Response.json({
        success: true,
        action,
        entry: { id: log?.id || null, ...details, created_date: nowIso },
        logId: log?.id || null,
      });
    }

    if (action === 'list_radio_log') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const query = text(payload.query || payload.search) || null;
      const limitRaw = Number(payload.limit || 200);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 2400);
      const entries = buildRadioLog(eventLogs || [], { eventId, netId, limit, query });
      return Response.json({
        success: true,
        action,
        entries,
      });
    }

    if (action === 'capture_voice_clip') {
      const clipSeconds = Math.max(10, Math.min(600, Math.floor(safeNumber(payload.clipSeconds || payload.clip_seconds, 60))));
      const ttlHours = Math.max(1, Math.min(72, Math.floor(safeNumber(payload.ttlHours || payload.ttl_hours, 24))));
      const retentionExpiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        clip_seconds: clipSeconds,
        ttl_hours: ttlHours,
        visibility: text(payload.visibility || 'COMMAND').toUpperCase(),
        title: text(payload.title || `Clip ${new Date().toLocaleTimeString()}`),
        captured_by_member_profile_id: actorMemberId,
        retention_expires_at: retentionExpiresAt,
        created_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_CLIP',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Voice clip captured (${clipSeconds}s)`,
        details,
      });
      return Response.json({
        success: true,
        action,
        clip: { id: log?.id || null, ...details },
        logId: log?.id || null,
      });
    }

    if (action === 'list_voice_clips') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const limitRaw = Number(payload.limit || 120);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 300)) : 120;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 2200);
      const clips = buildVoiceClipFeed(eventLogs || [], { eventId, netId, limit });
      return Response.json({
        success: true,
        action,
        clips,
      });
    }

    if (action === 'generate_voice_structured_draft') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const draftTypeRaw = text(payload.draftType || payload.draft_type || 'SITREP').toUpperCase();
      const draftType = ['SITREP', 'ORDERS', 'STATUS'].includes(draftTypeRaw) ? draftTypeRaw : 'SITREP';
      const eventLogs = await base44.entities.EventLog.list('-created_date', 2200);
      const entries = buildRadioLog(eventLogs || [], { eventId, netId, limit: 40 });
      const transcriptSnippet = entries
        .slice(0, 15)
        .map((entry) => `${entry.started_at} ${entry.speaker}: ${entry.transcript}`)
        .join('\n');

      const aiResp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Comms Officer assistant. Build a ${draftType} from radio log evidence. Use only provided transcript lines. If evidence is missing, mark unknown.

RADIO LOG:
${transcriptSnippet || '(no entries)'}`,
        response_json_schema: {
          type: 'object',
          properties: {
            draft_type: { type: 'string' },
            summary: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  heading: { type: 'string' },
                  content: { type: 'string' },
                  citations: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            confidence: { type: 'number' },
          },
        },
      });

      const details = {
        event_id: eventId,
        net_id: netId,
        draft_type: draftType,
        generated_by_member_profile_id: actorMemberId,
        source_entries: entries.slice(0, 15).map((entry) => entry.id),
        draft: aiResp,
        generated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_AI_DRAFT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `AI ${draftType} draft generated`,
        details,
      });

      return Response.json({
        success: true,
        action,
        draft: {
          ...aiResp,
          is_ai_draft: true,
          requires_confirmation: true,
          source_entry_ids: details.source_entries,
        },
        logId: log?.id || null,
      });
    }

    if (action === 'set_voice_hotkey_profile') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        profile_name: text(payload.profileName || payload.profile_name || 'default'),
        bindings: payload.bindings || {},
        side_tone: Boolean(payload.sideTone ?? payload.side_tone ?? false),
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_HOTKEY_PROFILE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice hotkey profile updated',
        details,
      });
      return Response.json({
        success: true,
        action,
        profile: details,
        logId: log?.id || null,
      });
    }

    if (action === 'set_voice_loadout') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        loadout_name: text(payload.loadoutName || payload.loadout_name || 'default'),
        role_hint: text(payload.roleHint || payload.role_hint),
        environment_hint: text(payload.environmentHint || payload.environment_hint),
        codec: text(payload.codec || 'opus'),
        bitrate_kbps: safeNumber(payload.bitrateKbps || payload.bitrate_kbps, 24),
        noise_suppression: Boolean(payload.noiseSuppression ?? payload.noise_suppression ?? true),
        agc: Boolean(payload.agc ?? true),
        eq_profile: payload.eqProfile || payload.eq_profile || {},
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_LOADOUT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice comms loadout updated',
        details,
      });
      return Response.json({
        success: true,
        action,
        loadout: details,
        logId: log?.id || null,
      });
    }

    if (action === 'claim_tx_device') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        client_id: text(payload.clientId || payload.client_id),
        status: 'CLAIMED',
        claimed_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_TX_DEVICE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Transmit device claimed',
        details,
      });
      return Response.json({
        success: true,
        action,
        authority: details,
        logId: log?.id || null,
      });
    }

    if (action === 'release_tx_device') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        member_profile_id: actorMemberId,
        client_id: text(payload.clientId || payload.client_id),
        status: 'RELEASED',
        released_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_TX_DEVICE',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Transmit device released',
        details,
      });
      return Response.json({
        success: true,
        action,
        authority: details,
        logId: log?.id || null,
      });
    }

    if (action === 'send_command_whisper') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const targetMemberProfileId = text(payload.targetMemberProfileId || payload.target_member_profile_id);
      if (!targetMemberProfileId) {
        return Response.json({ error: 'targetMemberProfileId required' }, { status: 400 });
      }
      const voiceInstruction = text(payload.voiceInstruction || payload.voice_instruction);
      const textSummary = text(payload.textSummary || payload.text_summary || voiceInstruction);
      if (!voiceInstruction) {
        return Response.json({ error: 'voiceInstruction required' }, { status: 400 });
      }
      const whisperId = text(payload.whisperId || payload.whisper_id, `cmdw_${Date.now()}`);
      const details = {
        whisper_id: whisperId,
        event_id: text(payload.eventId || payload.event_id) || null,
        sender_member_profile_id: actorMemberId,
        target_member_profile_id: targetMemberProfileId,
        target_type: text(payload.targetType || payload.target_type || 'member'),
        voice_instruction: voiceInstruction,
        text_summary: textSummary,
        requires_receipt: payload.requiresReceipt !== false,
        sent_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_COMMAND_WHISPER',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Command whisper dispatched',
        details,
      });

      await notifyMember(
        base44,
        targetMemberProfileId,
        'Command Whisper',
        textSummary,
        details.event_id ? String(details.event_id) : null
      );

      return Response.json({
        success: true,
        action,
        whisper: details,
        logId: log?.id || null,
      });
    }

    if (action === 'acknowledge_command_whisper') {
      const whisperId = text(payload.whisperId || payload.whisper_id);
      if (!whisperId) {
        return Response.json({ error: 'whisperId required' }, { status: 400 });
      }
      const state = text(payload.state || 'ACK').toUpperCase();
      if (!['ACK', 'NAK', 'READ'].includes(state)) {
        return Response.json({ error: 'Invalid state' }, { status: 400 });
      }
      const details = {
        whisper_id: whisperId,
        event_id: text(payload.eventId || payload.event_id) || null,
        member_profile_id: actorMemberId,
        state,
        note: text(payload.note || ''),
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_COMMAND_WHISPER_RECEIPT',
        severity: state === 'NAK' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Command whisper receipt ${state}`,
        details,
      });
      return Response.json({
        success: true,
        action,
        receipt: details,
        logId: log?.id || null,
      });
    }

    if (action === 'list_command_whispers') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const includeReceipts = payload.includeReceipts !== false;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 2500);
      const whispers = buildCommandWhisperFeed(eventLogs || [], { eventId, includeReceipts });
      return Response.json({
        success: true,
        action,
        whispers,
      });
    }

    if (action === 'set_voice_secure_mode') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const enabled = Boolean(payload.enabled ?? true);
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        enabled,
        key_version: text(payload.keyVersion || payload.key_version, `kv-${Date.now()}`),
        rotate_on_op_start: Boolean(payload.rotateOnOpStart ?? payload.rotate_on_op_start ?? true),
        recordings_disabled: Boolean(payload.recordingsDisabled ?? payload.recordings_disabled ?? true),
        allowed_roles: Array.isArray(payload.allowedRoles || payload.allowed_roles)
          ? (payload.allowedRoles || payload.allowed_roles)
          : [],
        updated_by_member_profile_id: actorMemberId,
        updated_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_SECURE_MODE',
        severity: enabled ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Secure comms ${enabled ? 'enabled' : 'disabled'}`,
        details,
      });
      return Response.json({
        success: true,
        action,
        secureMode: details,
        logId: log?.id || null,
      });
    }

    if (action === 'link_voice_thread') {
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        radio_log_id: text(payload.radioLogId || payload.radio_log_id),
        message_id: text(payload.messageId || payload.message_id),
        thread_id: text(payload.threadId || payload.thread_id),
        anchor_excerpt: text(payload.anchorExcerpt || payload.anchor_excerpt),
        linked_by_member_profile_id: actorMemberId,
        linked_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_VOICE_THREAD_LINK',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: 'Voice-linked thread anchor created',
        details,
      });
      return Response.json({
        success: true,
        action,
        link: { id: log?.id || null, ...details },
        logId: log?.id || null,
      });
    }

    if (action === 'list_voice_thread_links') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 1800);
      const links = (eventLogs || [])
        .filter((entry) => text(entry?.type).toUpperCase() === 'COMMS_VOICE_THREAD_LINK')
        .filter((entry) => !eventId || eventIdFromEntry(entry) === eventId)
        .filter((entry) => !netId || text(entry?.details?.net_id) === netId)
        .map((entry) => ({
          id: entry?.id,
          event_id: text(entry?.details?.event_id),
          net_id: text(entry?.details?.net_id),
          radio_log_id: text(entry?.details?.radio_log_id),
          message_id: text(entry?.details?.message_id),
          thread_id: text(entry?.details?.thread_id),
          anchor_excerpt: text(entry?.details?.anchor_excerpt),
          linked_at: text(entry?.details?.linked_at || entry?.created_date),
        }))
        .sort((a, b) => new Date(b.linked_at || 0).getTime() - new Date(a.linked_at || 0).getTime());
      return Response.json({
        success: true,
        action,
        links,
      });
    }

    if (action === 'publish_command_bus_action') {
      const busAction = text(payload.busAction || payload.actionType || payload.command_bus_action).toUpperCase();
      if (!COMMAND_BUS_ACTIONS.has(busAction)) {
        return Response.json({ error: 'Unsupported command bus action' }, { status: 400 });
      }
      if (busAction !== 'REQUEST_TO_SPEAK' && !commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }
      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        net_id: text(payload.netId || payload.net_id) || null,
        action: busAction,
        payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : {},
        actor_member_profile_id: actorMemberId,
        published_at: nowIso,
      };
      const log = await writeCommsLog(base44, {
        type: 'COMMS_COMMAND_BUS',
        severity: busAction === 'PRIORITY_OVERRIDE' ? 'MEDIUM' : 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Command bus action ${busAction}`,
        details,
      });
      return Response.json({
        success: true,
        action,
        bus: details,
        logId: log?.id || null,
      });
    }

    if (action === 'list_command_bus_actions') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const limitRaw = Number(payload.limit || 200);
      const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200;
      const eventLogs = await base44.entities.EventLog.list('-created_date', 2800);
      const actionsFeed = buildCommandBusFeed(eventLogs || [], { eventId, netId, limit });
      return Response.json({
        success: true,
        action,
        actions: actionsFeed,
      });
    }

    if (action === 'execute_map_command_macro') {
      if (!commandAccess) {
        return Response.json(
          {
            error: 'Command privileges required',
            error_code: 'COMMS_PERMISSION_DENIED',
          },
          { status: 403 }
        );
      }
      const macroId = text(payload.macroId || payload.macro_id).toUpperCase();
      if (!MAP_MACRO_IDS.has(macroId)) {
        return Response.json(
          {
            error: 'Unsupported macro id',
            error_code: 'MAP_MACRO_UNSUPPORTED',
          },
          { status: 400 }
        );
      }

      const eventId = text(payload.eventId || payload.event_id) || null;
      const netId = text(payload.netId || payload.net_id) || null;
      const lane = text(payload.lane || 'COMMAND').toUpperCase();
      const effects: string[] = [];
      const warnings: string[] = [];
      const logIds: string[] = [];

      if (macroId === 'ISSUE_CRITICAL_CALLOUT') {
        const message = text(payload.message || payload.calloutMessage || 'Critical command synchronization now in effect.');
        const callout = {
          event_id: eventId,
          channel_id: text(payload.channelId || payload.channel_id) || null,
          net_id: netId,
          lane,
          priority: 'CRITICAL',
          message,
          requires_ack: true,
          issued_by_member_profile_id: actorMemberId,
          issued_at: nowIso,
        };
        const log = await writeCommsLog(base44, {
          type: 'COMMS_PRIORITY_CALLOUT',
          severity: 'HIGH',
          actor_member_profile_id: actorMemberId,
          related_entity_id: eventId || null,
          summary: `Map macro: CRITICAL callout on ${lane}`,
          details: callout,
        });
        if (log?.id) logIds.push(log.id);
        effects.push(`Issued CRITICAL callout on lane ${lane}`);
      }

      if (macroId === 'PRIORITY_OVERRIDE') {
        const details = {
          event_id: eventId,
          net_id: netId,
          action: 'PRIORITY_OVERRIDE',
          payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : { source: 'tactical_map' },
          actor_member_profile_id: actorMemberId,
          published_at: nowIso,
        };
        const log = await writeCommsLog(base44, {
          type: 'COMMS_COMMAND_BUS',
          severity: 'MEDIUM',
          actor_member_profile_id: actorMemberId,
          related_entity_id: eventId || null,
          summary: 'Map macro: PRIORITY_OVERRIDE',
          details,
        });
        if (log?.id) logIds.push(log.id);
        effects.push('Published PRIORITY_OVERRIDE on command bus');
      }

      if (macroId === 'LOCK_COMMAND_DISCIPLINE') {
        const discipline = {
          mode: 'COMMAND_ONLY',
          event_id: eventId,
          net_id: netId,
          actor_member_profile_id: actorMemberId,
          updated_at: nowIso,
        };
        const log = await writeCommsLog(base44, {
          type: 'COMMS_DISCIPLINE_MODE',
          severity: 'MEDIUM',
          actor_member_profile_id: actorMemberId,
          related_entity_id: eventId || null,
          summary: 'Map macro: discipline -> COMMAND_ONLY',
          details: discipline,
        });
        if (log?.id) logIds.push(log.id);
        effects.push('Locked discipline mode to COMMAND_ONLY');
      }

      if (macroId === 'ENABLE_SECURE_NET') {
        const secureMode = {
          event_id: eventId,
          net_id: netId,
          enabled: true,
          key_version: text(payload.keyVersion || payload.key_version || 'map-default'),
          recordings_disabled: payload.recordingsDisabled !== false,
          enabled_by_member_profile_id: actorMemberId,
          updated_at: nowIso,
        };
        const log = await writeCommsLog(base44, {
          type: 'COMMS_SECURE_MODE',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          related_entity_id: eventId || null,
          summary: 'Map macro: secure mode enabled',
          details: secureMode,
        });
        if (log?.id) logIds.push(log.id);
        effects.push('Enabled secure mode for scoped net');
      }

      if (macroId === 'REQUEST_SITREP_BURST') {
        const burst = {
          event_id: eventId,
          net_id: netId,
          action: 'REQUEST_SITREP_BURST',
          payload: payload.payload && typeof payload.payload === 'object' ? payload.payload : { lane },
          actor_member_profile_id: actorMemberId,
          published_at: nowIso,
        };
        const busLog = await writeCommsLog(base44, {
          type: 'COMMS_COMMAND_BUS',
          severity: 'LOW',
          actor_member_profile_id: actorMemberId,
          related_entity_id: eventId || null,
          summary: 'Map macro: REQUEST_SITREP_BURST',
          details: burst,
        });
        if (busLog?.id) logIds.push(busLog.id);
        effects.push('Requested synchronized SITREP burst');

        const targetMemberIds = Array.isArray(payload.targetMemberProfileIds)
          ? payload.targetMemberProfileIds.map((entry: unknown) => text(entry)).filter(Boolean)
          : [];
        if (targetMemberIds.length > 0) {
          const whisperSummary = text(payload.whisperSummary || payload.textSummary || 'Provide SITREP now.');
          const whisperInstruction = text(payload.voiceInstruction || 'Command requests immediate SITREP.');
          for (const targetMemberId of targetMemberIds.slice(0, 12)) {
            const whisper = {
              whisper_id: `whisper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              event_id: eventId,
              net_id: netId,
              target_member_profile_id: targetMemberId,
              voice_instruction: whisperInstruction,
              text_summary: whisperSummary,
              sender_member_profile_id: actorMemberId,
              status: 'SENT',
              sent_at: nowIso,
            };
            const whisperLog = await writeCommsLog(base44, {
              type: 'COMMS_COMMAND_WHISPER',
              severity: 'LOW',
              actor_member_profile_id: actorMemberId,
              related_entity_id: eventId || null,
              summary: 'Map macro: SITREP whisper',
              details: whisper,
            });
            if (whisperLog?.id) logIds.push(whisperLog.id);
          }
          effects.push(`Dispatched ${Math.min(targetMemberIds.length, 12)} SITREP whispers`);
          if (targetMemberIds.length > 12) warnings.push('Whisper targets truncated to 12 recipients.');
        }
      }

      return Response.json({
        success: true,
        action,
        macroId,
        executedAt: nowIso,
        effects,
        logIds,
        warnings,
      });
    }

    if (action === 'get_map_command_surface') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const includeGlobal = payload.includeGlobal !== false;
      const limitRaw = Number(payload.limit || 120);
      const limit = Number.isFinite(limitRaw) ? Math.max(20, Math.min(limitRaw, 300)) : 120;

      const [voiceNetsRaw, presencesRaw, bridgesRaw, eventLogs] = await Promise.all([
        base44.entities.VoiceNet?.list ? base44.entities.VoiceNet.list('-created_date', 250).catch(() => []) : [],
        base44.entities.UserPresence?.list
          ? base44.entities.UserPresence.list('-last_activity', 350).catch(() => [])
          : base44.entities.UserPresence?.filter
            ? base44.entities.UserPresence.filter({}, '-last_activity', 350).catch(() => [])
            : [],
        base44.entities.BridgeSession?.list ? base44.entities.BridgeSession.list('-created_date', 200).catch(() => []) : [],
        base44.entities.EventLog?.list ? base44.entities.EventLog.list('-created_date', 1600).catch(() => []) : [],
      ]);

      const voiceNets = (voiceNetsRaw || []).filter((net: any) => {
        if (!eventId) return true;
        const netEventId = text(net?.event_id || net?.eventId);
        if (netEventId === eventId) return true;
        if (!includeGlobal && !netEventId) return false;
        return includeGlobal && !netEventId;
      });

      const allowedNetIds = new Set(voiceNets.map((net: any) => text(net?.id)).filter(Boolean));
      const memberships = (presencesRaw || [])
        .map((presence: any) => {
          const net = resolvePresenceNet(presence, voiceNets);
          if (!net) return null;
          const memberProfileId = text(presence?.member_profile_id || presence?.user_id);
          if (!memberProfileId) return null;
          return {
            member_profile_id: memberProfileId,
            net_id: text(net?.id),
            net_code: text(net?.code),
            net_label: text(net?.label || net?.name),
            speaking: Boolean(presence?.is_speaking),
            muted: Boolean(presence?.muted || presence?.is_muted),
            last_activity: presence?.last_activity || presence?.updated_date || presence?.created_date || null,
          };
        })
        .filter((entry: any) => entry && allowedNetIds.has(text(entry.net_id)));

      const bridges = (bridgesRaw || []).filter((bridge: any) => {
        const status = text(bridge?.status, 'active').toLowerCase();
        if (status === 'ended' || status === 'closed') return false;
        const bridgeEventId = text(bridge?.event_id || bridge?.eventId);
        if (!eventId) return true;
        if (bridgeEventId === eventId) return true;
        return includeGlobal && !bridgeEventId;
      });

      const callouts = buildPriorityCallouts(eventLogs || [], eventId).slice(0, limit);
      const captions = buildCaptionFeed(eventLogs || [], { eventId, limit });
      const moderation = buildModerationFeed(eventLogs || [], eventId).slice(0, limit);
      const telemetry = buildTelemetryFeed(eventLogs || [], { eventId, limit });
      const discipline = buildDisciplineState(eventLogs || [], { eventId, netId: null });
      const speakRequests = buildSpeakRequestFeed(eventLogs || [], { eventId, netId: null, includeResolved: false });
      const commandBus = buildCommandBusFeed(eventLogs || [], { eventId, netId: null, limit: Math.min(limit, 200) });
      const netLoad = summarizeNetLoad(voiceNets, memberships, callouts, captions);
      const actionableAlerts: any[] = [];

      const criticalCallouts = callouts.filter((entry: any) => text(entry?.priority).toUpperCase() === 'CRITICAL');
      const degradedNets = netLoad.filter((entry: any) => safeNumber(entry?.traffic_score, safeNumber(entry?.trafficScore, 0)) >= 8);
      if (criticalCallouts.length > 0) {
        actionableAlerts.push({
          id: 'critical-callouts',
          level: 'HIGH',
          title: 'Critical callouts active',
          detail: `${criticalCallouts.length} critical callouts require immediate command attention.`,
        });
      }
      if (degradedNets.length > 0) {
        actionableAlerts.push({
          id: 'degraded-nets',
          level: degradedNets.length > 1 ? 'HIGH' : 'MED',
          title: 'Degraded/contested nets',
          detail: `${degradedNets.length} nets exceed healthy traffic thresholds.`,
        });
      }
      if (speakRequests.length > 0) {
        actionableAlerts.push({
          id: 'pending-speak-requests',
          level: speakRequests.length > 2 ? 'MED' : 'LOW',
          title: 'Pending speak requests',
          detail: `${speakRequests.length} pending transmit requests awaiting disposition.`,
        });
      }

      return Response.json({
        success: true,
        action,
        actionable_alerts: actionableAlerts,
        topology: {
          event_id: eventId,
          nets: voiceNets,
          memberships,
          bridges,
          callouts,
          captions,
          moderation,
          telemetry,
          discipline,
          speakRequests,
          commandBus,
          netLoad,
          generated_at: nowIso,
        },
      });
    }

    if (action === 'get_comms_topology_snapshot') {
      const eventId = text(payload.eventId || payload.event_id) || null;
      const includeGlobal = payload.includeGlobal !== false;
      const limitRaw = Number(payload.limit || 120);
      const limit = Number.isFinite(limitRaw) ? Math.max(20, Math.min(limitRaw, 300)) : 120;

      const [voiceNetsRaw, presencesRaw, bridgesRaw, eventLogs] = await Promise.all([
        base44.entities.VoiceNet?.list ? base44.entities.VoiceNet.list('-created_date', 250).catch(() => []) : [],
        base44.entities.UserPresence?.list
          ? base44.entities.UserPresence.list('-last_activity', 350).catch(() => [])
          : base44.entities.UserPresence?.filter
            ? base44.entities.UserPresence.filter({}, '-last_activity', 350).catch(() => [])
            : [],
        base44.entities.BridgeSession?.list ? base44.entities.BridgeSession.list('-created_date', 200).catch(() => []) : [],
        base44.entities.EventLog?.list ? base44.entities.EventLog.list('-created_date', 1600).catch(() => []) : [],
      ]);

      const voiceNets = (voiceNetsRaw || []).filter((net: any) => {
        if (!eventId) return true;
        const netEventId = text(net?.event_id || net?.eventId);
        if (netEventId === eventId) return true;
        if (!includeGlobal && !netEventId) return false;
        return includeGlobal && !netEventId;
      });

      const allowedNetIds = new Set(voiceNets.map((net: any) => text(net?.id)).filter(Boolean));
      const memberships = (presencesRaw || [])
        .map((presence: any) => {
          const net = resolvePresenceNet(presence, voiceNets);
          if (!net) return null;
          const memberProfileId = text(presence?.member_profile_id || presence?.user_id);
          if (!memberProfileId) return null;
          return {
            member_profile_id: memberProfileId,
            net_id: text(net?.id),
            net_code: text(net?.code),
            net_label: text(net?.label || net?.name),
            speaking: Boolean(presence?.is_speaking),
            muted: Boolean(presence?.muted || presence?.is_muted),
            last_activity: presence?.last_activity || presence?.updated_date || presence?.created_date || null,
          };
        })
        .filter((entry: any) => entry && allowedNetIds.has(text(entry.net_id)));

      const bridges = (bridgesRaw || []).filter((bridge: any) => {
        const status = text(bridge?.status, 'active').toLowerCase();
        if (status === 'ended' || status === 'closed') return false;
        const bridgeEventId = text(bridge?.event_id || bridge?.eventId);
        if (!eventId) return true;
        if (bridgeEventId === eventId) return true;
        return includeGlobal && !bridgeEventId;
      });

      const callouts = buildPriorityCallouts(eventLogs || [], eventId).slice(0, limit);
      const captions = buildCaptionFeed(eventLogs || [], { eventId, limit });
      const moderation = buildModerationFeed(eventLogs || [], eventId).slice(0, limit);
      const telemetry = buildTelemetryFeed(eventLogs || [], { eventId, limit });
      const discipline = buildDisciplineState(eventLogs || [], { eventId, netId: null });
      const speakRequests = buildSpeakRequestFeed(eventLogs || [], { eventId, netId: null, includeResolved: false });
      const commandBus = buildCommandBusFeed(eventLogs || [], { eventId, netId: null, limit: Math.min(limit, 200) });
      const netLoad = summarizeNetLoad(voiceNets, memberships, callouts, captions);

      return Response.json({
        success: true,
        action,
        topology: {
          event_id: eventId,
          nets: voiceNets,
          memberships,
          bridges,
          callouts,
          captions,
          moderation,
          telemetry,
          discipline,
          speakRequests,
          commandBus,
          netLoad,
          generated_at: nowIso,
        },
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateCommsConsole] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
