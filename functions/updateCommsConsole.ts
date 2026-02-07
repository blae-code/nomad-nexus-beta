import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER', 'VOYAGER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'communications', 'comms']);

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

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateCommsConsole] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
