import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'analyst']);
const CADENCE_TYPES = new Set(['daily', 'weekly', 'monthly', 'on_demand']);

type CreateAttempt = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => text(entry)).filter(Boolean);
  }
  const raw = text(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
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

function normalizeIso(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

async function createFirstSuccessful(entity: any, attempts: CreateAttempt[]) {
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

async function writeReportLog(base44: any, payload: CreateAttempt) {
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

    if (action === 'save_template') {
      const templateName = text(payload.templateName || payload.name);
      if (!templateName) {
        return Response.json({ error: 'templateName required' }, { status: 400 });
      }

      const template = {
        id: text(payload.templateId, `report_template_${Date.now()}`),
        name: templateName,
        description: text(payload.description || ''),
        filters: payload.filters && typeof payload.filters === 'object' ? payload.filters : {},
        visibility: text(payload.visibility || 'private').toLowerCase(),
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
      };

      const log = await writeReportLog(base44, {
        type: 'REPORT_TEMPLATE_SAVED',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Report template saved: ${templateName}`,
        details: template,
      });

      return Response.json({
        success: true,
        action,
        template,
        logId: log?.id || null,
      });
    }

    if (action === 'schedule_report') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }

      const reportName = text(payload.reportName || payload.name || 'Scheduled Report');
      const cadence = text(payload.cadence || 'weekly').toLowerCase();
      if (!CADENCE_TYPES.has(cadence)) {
        return Response.json({
          error: `Unsupported cadence: ${cadence}`,
          allowed: Array.from(CADENCE_TYPES),
        }, { status: 400 });
      }

      const nextRunAt = normalizeIso(payload.nextRunAt || payload.next_run_at) || nowIso;
      const schedule = {
        id: text(payload.scheduleId, `report_schedule_${Date.now()}`),
        report_name: reportName,
        cadence,
        next_run_at: nextRunAt,
        template_id: text(payload.templateId || payload.template_id || ''),
        filters: payload.filters && typeof payload.filters === 'object' ? payload.filters : {},
        recipients: {
          member_profile_ids: asStringArray(payload.memberProfileIds || payload.member_profile_ids),
          emails: asStringArray(payload.emailRecipients || payload.emails),
        },
        created_by_member_profile_id: actorMemberId,
        created_at: nowIso,
        status: 'scheduled',
      };

      const log = await writeReportLog(base44, {
        type: 'REPORT_SCHEDULED',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Scheduled report: ${reportName}`,
        details: schedule,
      });

      return Response.json({
        success: true,
        action,
        schedule,
        logId: log?.id || null,
      });
    }

    if (action === 'send_distribution') {
      if (!commandAccess) {
        return Response.json({ error: 'Command privileges required' }, { status: 403 });
      }

      const subject = text(payload.subject || payload.title || 'Report Distribution');
      const message = text(payload.message || payload.summary || 'A report is ready for review.');
      const memberProfileIds = asStringArray(payload.memberProfileIds || payload.member_profile_ids);
      const emails = asStringArray(payload.emailRecipients || payload.emails);

      if (memberProfileIds.length === 0 && emails.length === 0) {
        return Response.json({ error: 'Provide at least one memberProfileId or email recipient' }, { status: 400 });
      }

      let deliveredToMembers = 0;
      for (const memberId of memberProfileIds) {
        try {
          await createFirstSuccessful(base44.entities.Notification, [
            {
              user_id: memberId,
              type: 'system',
              title: subject,
              message,
              related_entity_type: 'report',
            },
            {
              user_id: memberId,
              type: 'system',
              title: subject,
              message,
            },
          ]);
          deliveredToMembers += 1;
        } catch (error) {
          console.error('[updateReportBuilder] Notification delivery failed:', error.message);
        }
      }

      const distribution = {
        id: text(payload.distributionId, `report_distribution_${Date.now()}`),
        subject,
        message,
        member_profile_ids: memberProfileIds,
        emails,
        delivered_to_members: deliveredToMembers,
        queued_emails: emails.length,
        sent_at: nowIso,
        sent_by_member_profile_id: actorMemberId,
      };

      const log = await writeReportLog(base44, {
        type: 'REPORT_DISTRIBUTION_SENT',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `Report distribution sent: ${subject}`,
        details: distribution,
      });

      return Response.json({
        success: true,
        action,
        distribution,
        logId: log?.id || null,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateReportBuilder] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
