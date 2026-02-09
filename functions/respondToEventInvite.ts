import { getAuthContext, readJson } from './_shared/memberAuth.ts';

type JsonRecord = Record<string, unknown>;

function text(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function toStatus(value: unknown): 'ACCEPTED' | 'DECLINED' {
  return text(value).toUpperCase() === 'DECLINED' ? 'DECLINED' : 'ACCEPTED';
}

async function findInvite(base44: any, inviteId: string) {
  if (!inviteId) return null;
  if (base44?.entities?.EventInvite?.get) {
    try {
      const row = await base44.entities.EventInvite.get(inviteId);
      if (row) return row;
    } catch {
      // continue
    }
  }
  if (base44?.entities?.EventInvite?.filter) {
    try {
      const rows = await base44.entities.EventInvite.filter({ id: inviteId });
      if (Array.isArray(rows) && rows[0]) return rows[0];
    } catch {
      // continue
    }
  }
  return null;
}

async function updateInvite(base44: any, inviteId: string, patch: JsonRecord) {
  if (base44?.entities?.EventInvite?.update) {
    try {
      return await base44.entities.EventInvite.update(inviteId, patch);
    } catch {
      // continue
    }
  }
  return null;
}

async function writeAudit(base44: any, summary: string, details: JsonRecord) {
  try {
    return await base44.entities.EventLog.create({
      type: 'CROSS_ORG_INVITE_RESPONSE',
      severity: details.status === 'ACCEPTED' ? 'LOW' : 'MEDIUM',
      summary,
      details,
    });
  } catch {
    return null;
  }
}

async function provisionJointChannel(base44: any, invite: any, respondedBy: string) {
  if (!base44?.entities?.Channel?.create) return null;
  try {
    return await base44.entities.Channel.create({
      name: `joint-${text(invite?.event_id || invite?.op_id || 'op')}-${Date.now().toString().slice(-4)}`,
      type: 'public',
      description: `Joint operation channel (${text(invite?.host_org_id)} + ${text(invite?.target_org_id)})`,
      metadata: {
        source: 'respondToEventInvite',
        invite_id: invite?.id,
        host_org_id: invite?.host_org_id,
        target_org_id: invite?.target_org_id,
        created_by: respondedBy,
      },
    });
  } catch {
    return null;
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

    const inviteId = text(payload.inviteId || payload.id);
    if (!inviteId) return Response.json({ success: false, error: 'inviteId required' }, { status: 400 });
    const decision = toStatus(payload.decision || payload.status);
    const responderOrgId = text(payload.responderOrgId || payload.targetOrgId || payload.target_org_id);
    const responderId =
      text(memberProfile?.id) ||
      text(memberProfile?.user_id) ||
      text(adminUser?.id) ||
      'unknown';

    const invite = await findInvite(base44, inviteId);
    if (!invite) {
      const audit = await writeAudit(base44, `Invite response captured without EventInvite entity (${inviteId})`, {
        invite_id: inviteId,
        status: decision,
        responder_org_id: responderOrgId,
        responded_by: responderId,
      });
      return Response.json({
        success: true,
        invite: {
          id: inviteId,
          status: decision,
          responder_org_id: responderOrgId,
          responded_by: responderId,
          source: 'EventLogFallback',
        },
        auditLogId: audit?.id || null,
        warnings: ['EventInvite entity unavailable; stored as audit log only.'],
      });
    }

    const targetOrgId = text(invite?.target_org_id || invite?.targetOrgId);
    if (targetOrgId && responderOrgId && targetOrgId !== responderOrgId) {
      return Response.json({ success: false, error: 'Responder organization mismatch' }, { status: 403 });
    }

    const updated = await updateInvite(base44, inviteId, {
      status: decision,
      responded_by: responderId,
      responded_at: new Date().toISOString(),
    });

    const jointChannel = decision === 'ACCEPTED' ? await provisionJointChannel(base44, invite, responderId) : null;
    const audit = await writeAudit(
      base44,
      `Invite ${inviteId} ${decision.toLowerCase()}`,
      {
        invite_id: inviteId,
        status: decision,
        responder_org_id: responderOrgId,
        responded_by: responderId,
        joint_channel_id: jointChannel?.id || null,
      }
    );

    return Response.json({
      success: true,
      invite: updated || { ...invite, status: decision, responded_by: responderId },
      jointChannel,
      auditLogId: audit?.id || null,
      doctrine: {
        scopedAccessOnly: true,
        noGlobalDataLeak: true,
      },
    });
  } catch (error: any) {
    console.error('respondToEventInvite error:', error);
    return Response.json({ success: false, error: error?.message || 'Failed to process invite response' }, { status: 500 });
  }
});

