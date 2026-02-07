import { getAuthContext, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const HOSTILE_TYPES = new Set(['hostile', 'pirate', 'combat', 'ambush']);

type Level = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

type LogPayload = {
  event_id?: string;
  type: string;
  severity: string;
  actor_member_profile_id: string | null;
  summary: string;
  details?: Record<string, unknown>;
};

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function tags(input: unknown) {
  if (Array.isArray(input)) {
    return input.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(/[,\s]+/)
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }
  return [];
}

function parseLevel(value: unknown): Level {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'MEDIUM') return normalized;
  return 'LOW';
}

function toSeverity(level: Level) {
  if (level === 'CRITICAL') return 'CRITICAL';
  if (level === 'HIGH') return 'HIGH';
  if (level === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function suggestChannels(level: Level, threatType: string, intelTags: string[]) {
  const hints = ['intel'];
  if (level === 'HIGH' || level === 'CRITICAL') hints.push('command', 'operations');
  if (HOSTILE_TYPES.has(threatType)) hints.push('operations', 'focused-command');
  if (intelTags.includes('distress') || intelTags.includes('medical')) hints.push('rescue');
  if (intelTags.includes('logistics') || intelTags.includes('hauling') || intelTags.includes('supply')) hints.push('logistics');
  if (intelTags.includes('contract') || intelTags.includes('commerce')) hints.push('trade');
  return unique(hints).slice(0, 8);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function riskScore(level: Level, threatType: string, intelTags: string[], recentIncidentCount: number, countermeasures: string) {
  const base = level === 'CRITICAL' ? 85 : level === 'HIGH' ? 68 : level === 'MEDIUM' ? 45 : 24;
  let score = base;
  if (HOSTILE_TYPES.has(threatType)) score += 8;
  if (threatType === 'environmental') score += 5;
  if (threatType === 'logistics') score += 4;
  if (intelTags.includes('distress')) score += 9;
  if (intelTags.includes('blockade')) score += 7;
  score += Math.min(12, Math.max(0, recentIncidentCount) * 3);
  score += countermeasures ? -5 : 7;
  return clamp(Math.round(score));
}

async function createEventLogWithFallback(base44: any, payload: LogPayload) {
  const attempts: LogPayload[] = [
    payload,
    {
      ...payload,
      details: undefined,
    },
  ];
  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      return await base44.entities.EventLog.create(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Failed to create intel event log');
}

async function eventExists(base44: any, eventId: string) {
  try {
    const event = await base44.entities.Event.get(eventId);
    if (event) return true;
  } catch {
    // ignore
  }
  try {
    const rows = await base44.entities.Event.filter({ id: eventId });
    return Boolean(rows?.[0]);
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile, adminUser } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const title = text(payload.title);
    const summary = text(payload.summary);
    if (!title || !summary) {
      return Response.json({ error: 'title and summary required' }, { status: 400 });
    }

    const eventId = text(payload.eventId || payload.event_id);
    if (eventId) {
      const exists = await eventExists(base44, eventId);
      if (!exists) {
        return Response.json({ error: 'Operation not found' }, { status: 404 });
      }
    }

    const threatType = text(payload.threatType || payload.threat_type, 'hostile').toLowerCase();
    const level = parseLevel(payload.threatLevel || payload.threat_level);
    const location = text(payload.location || 'Unknown');
    const countermeasures = text(payload.countermeasures || payload.mitigations || '');
    const intelTags = unique(tags(payload.tags));
    const actorMemberId = memberProfile?.id || null;
    const actorUserId = adminUser?.id || null;

    let recentIncidents = [];
    try {
      recentIncidents = eventId
        ? await base44.entities.Incident.filter({ event_id: eventId }, '-created_date', 100)
        : await base44.entities.Incident.list('-created_date', 100);
    } catch {
      recentIncidents = [];
    }

    const incidentCount = Array.isArray(recentIncidents) ? recentIncidents.length : 0;
    const score = riskScore(level, threatType, intelTags, incidentCount, countermeasures);
    const channelSuggestions = suggestChannels(level, threatType, intelTags);
    const nowIso = new Date().toISOString();

    const reportLog = await createEventLogWithFallback(base44, {
      ...(eventId ? { event_id: eventId } : {}),
      type: 'INTEL_REPORT',
      severity: toSeverity(level),
      actor_member_profile_id: actorMemberId,
      summary: `${title}: ${summary}`,
      details: {
        title,
        summary,
        threat_type: threatType,
        threat_level: level,
        location,
        tags: intelTags,
        risk_score: score,
        recommended_channels: channelSuggestions,
        countermeasures: countermeasures || null,
        reporter_member_profile_id: actorMemberId,
        reporter_user_id: actorUserId,
        reported_at: nowIso,
      },
    });

    let incidentRecord: any = null;
    const shouldCreateIncident = Boolean(payload.createIncident) || level === 'CRITICAL';
    if (shouldCreateIncident && (level === 'HIGH' || level === 'CRITICAL')) {
      try {
        incidentRecord = await base44.entities.Incident.create({
          title: `Intel: ${title}`,
          description: summary,
          severity: level,
          status: 'investigating',
          incident_type: 'intel',
          event_id: eventId || null,
          reported_by: actorMemberId,
          reported_at: nowIso,
          location,
          source_log_id: reportLog?.id || null,
        });
      } catch (error) {
        console.error('[submitIntelReport] Incident create failed:', error.message);
      }
    }

    const shouldNotifyCommand = level === 'HIGH' || level === 'CRITICAL' || score >= 70;
    let notified = 0;
    if (shouldNotifyCommand) {
      try {
        const profiles = await base44.entities.MemberProfile.list('-created_date', 300).catch(() => []);
        const targets = (profiles || []).filter((profile: any) =>
          COMMAND_RANKS.has(String(profile?.rank || '').toUpperCase())
        );
        for (const profile of targets.slice(0, 20)) {
          if (!profile?.id || (actorMemberId && profile.id === actorMemberId)) continue;
          await base44.entities.Notification.create({
            user_id: profile.id,
            type: 'system',
            title: `Intel Alert (${level})`,
            message: `${title} · ${location}`,
            related_entity_type: 'event_log',
            related_entity_id: reportLog?.id || null,
          });
          notified += 1;
        }
      } catch (error) {
        console.error('[submitIntelReport] Notifications failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      report: {
        id: reportLog?.id || null,
        title,
        summary,
        threatType,
        threatLevel: level,
        location,
        tags: intelTags,
        riskScore: score,
        recommendedChannels: channelSuggestions,
        createdAt: nowIso,
      },
      incident: incidentRecord ? { id: incidentRecord.id, severity: incidentRecord.severity } : null,
      notified,
    });
  } catch (error) {
    console.error('[submitIntelReport] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
