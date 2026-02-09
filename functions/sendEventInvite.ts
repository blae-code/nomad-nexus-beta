import { getAuthContext, readJson } from './_shared/memberAuth.ts';

type JsonRecord = Record<string, unknown>;

function text(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toClassification(value: unknown): 'INTERNAL' | 'ALLIED' | 'PUBLIC' {
  const token = text(value, 'ALLIED').toUpperCase();
  if (token === 'INTERNAL' || token === 'PUBLIC') return token;
  return 'ALLIED';
}

async function createInviteRecord(base44: any, payload: JsonRecord) {
  if (base44?.entities?.EventInvite?.create) {
    try {
      const created = await base44.entities.EventInvite.create(payload);
      return {
        invite: created,
        persistedTo: 'EventInvite',
      };
    } catch {
      // fall through to EventLog backup
    }
  }

  const log = await base44.entities.EventLog.create({
    type: 'CROSS_ORG_INVITE',
    severity: 'LOW',
    summary: `Cross-org invite created for ${payload.target_org_id || payload.targetOrgId}`,
    details: payload,
  });
  return {
    invite: {
      id: `event_invite_fallback_${Date.now()}`,
      ...payload,
      source: 'EventLogFallback',
      log_id: log?.id || null,
    },
    persistedTo: 'EventLogFallback',
  };
}

async function notifyTargetOrg(base44: any, targetOrgId: string, message: string) {
  try {
    const members = await base44.entities.MemberProfile.filter({ organization_id: targetOrgId });
    const sent: string[] = [];
    for (const member of (members || []).slice(0, 50)) {
      const userId = text(member?.user_id || member?.id);
      if (!userId) continue;
      try {
        await base44.entities.Notification.create({
          user_id: userId,
          type: 'system',
          title: 'Cross-Org Operation Invite',
          message,
          related_entity_type: 'cross_org_invite',
          related_entity_id: targetOrgId,
        });
        sent.push(userId);
      } catch {
        // best effort only
      }
    }
    return sent;
  } catch {
    return [];
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
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = text(payload.eventId || payload.opId);
    const hostOrgId = text(payload.hostOrgId || payload.host_org_id);
    const targetOrgId = text(payload.targetOrgId || payload.target_org_id);
    if (!eventId) return Response.json({ success: false, error: 'eventId/opId required' }, { status: 400 });
    if (!hostOrgId) return Response.json({ success: false, error: 'hostOrgId required' }, { status: 400 });
    if (!targetOrgId) return Response.json({ success: false, error: 'targetOrgId required' }, { status: 400 });

    const createdBy =
      text(memberProfile?.id) ||
      text(memberProfile?.user_id) ||
      text(adminUser?.id) ||
      'unknown';

    const invitePayload: JsonRecord = {
      id: text(payload.id) || `evt_invite_${Date.now()}`,
      event_id: eventId,
      op_id: eventId,
      host_org_id: hostOrgId,
      target_org_id: targetOrgId,
      status: 'PENDING',
      classification: toClassification(payload.classification),
      message: text(payload.message || 'Joint operation request'),
      expires_at: text(payload.expiresAt),
      created_by: createdBy,
      created_at: new Date().toISOString(),
    };

    const persisted = await createInviteRecord(base44, invitePayload);
    const notificationMessage = `${hostOrgId} invited your organization to operation ${eventId}.`;
    const notifiedUsers = await notifyTargetOrg(base44, targetOrgId, notificationMessage);

    return Response.json({
      success: true,
      invite: persisted.invite,
      persistedTo: persisted.persistedTo,
      notifiedUsersCount: notifiedUsers.length,
      doctrine: {
        crossOrgScopeOnly: true,
        rescueFirstRecommended: true,
      },
    });
  } catch (error: any) {
    console.error('sendEventInvite error:', error);
    return Response.json({ success: false, error: error?.message || 'Failed to send invite' }, { status: 500 });
  }
});

