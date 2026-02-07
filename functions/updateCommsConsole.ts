import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER', 'VOYAGER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'communications', 'comms']);
const PRIORITY_LEVELS = new Set(['STANDARD', 'HIGH', 'CRITICAL']);
const CAPTION_SEVERITY = new Set(['INFO', 'ALERT', 'CRITICAL']);
const MODERATION_ACTIONS = new Set(['MUTE', 'UNMUTE', 'DEAFEN', 'UNDEAFEN', 'KICK', 'LOCK_CHANNEL', 'UNLOCK_CHANNEL']);

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
        moderated_by_member_profile_id: text(details?.moderated_by_member_profile_id || entry?.actor_member_profile_id),
        created_date: entry?.created_date || null,
      };
    })
    .sort((a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime());
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

      const details = {
        event_id: text(payload.eventId || payload.event_id) || null,
        moderation_action: moderationAction,
        target_member_profile_id: targetMemberProfileId || null,
        channel_id: text(payload.channelId || payload.channel_id) || null,
        reason: text(payload.reason || ''),
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

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateCommsConsole] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
