import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'training', 'mentor']);

type UpdateAttempt = Record<string, unknown>;

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function asDateOrNull(value: unknown) {
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

function parseCertifications(member: any) {
  const raw = Array.isArray(member?.certifications)
    ? member.certifications
    : Array.isArray(member?.certification_list)
      ? member.certification_list
      : [];

  return raw
    .map((entry: any) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return {
          id: `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: entry,
          level: 'STANDARD',
          status: 'active',
          issued_at: null,
          expires_at: null,
          notes: '',
        };
      }
      const id = text(entry.id || entry.certification_id || entry.name);
      const name = text(entry.name || entry.title);
      if (!name) return null;
      const status = text(entry.status || 'active').toLowerCase();
      return {
        ...entry,
        id: id || `cert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name,
        level: text(entry.level || 'STANDARD').toUpperCase(),
        status: status === 'revoked' ? 'revoked' : status === 'expired' ? 'expired' : 'active',
        issued_at: asDateOrNull(entry.issued_at),
        expires_at: asDateOrNull(entry.expires_at),
        notes: text(entry.notes || ''),
      };
    })
    .filter(Boolean);
}

async function applyFirstSuccessfulMemberUpdate(base44: any, memberId: string, attempts: UpdateAttempt[]) {
  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      return await base44.entities.MemberProfile.update(memberId, payload);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Member update failed');
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

async function writeProgressLog(base44: any, payload: UpdateAttempt) {
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
    if (!commandAccess) {
      return Response.json({ error: 'Command privileges required' }, { status: 403 });
    }

    const targetMemberProfileId = text(payload.targetMemberProfileId || payload.memberProfileId || actorMemberId);
    if (!targetMemberProfileId) {
      return Response.json({ error: 'targetMemberProfileId required' }, { status: 400 });
    }

    const targetMember = await base44.entities.MemberProfile.get(targetMemberProfileId);
    if (!targetMember) {
      return Response.json({ error: 'Target member not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const certifications = parseCertifications(targetMember);

    if (action === 'issue_certification') {
      const name = text(payload.certificationName || payload.name);
      if (!name) {
        return Response.json({ error: 'certificationName required' }, { status: 400 });
      }

      const cert = {
        id: text(payload.certificationId, `cert_${Date.now()}`),
        name,
        level: text(payload.certificationLevel || payload.level || 'STANDARD').toUpperCase(),
        status: 'active',
        issued_at: nowIso,
        expires_at: asDateOrNull(payload.expiresAt || payload.expires_at),
        notes: text(payload.notes || payload.reason || ''),
        issued_by_member_profile_id: actorMemberId,
      };

      const nextCertifications = [...certifications, cert];
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        { certifications: nextCertifications },
        { certification_list: nextCertifications },
      ]);

      await writeProgressLog(base44, {
        type: 'MEMBER_CERTIFICATION_ISSUED',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        target_member_profile_id: targetMemberProfileId,
        summary: `Certification issued: ${name}`,
        details: {
          certification: cert,
          target_member_profile_id: targetMemberProfileId,
        },
      });

      try {
        if (targetMemberProfileId !== actorMemberId) {
          await base44.entities.Notification.create({
            user_id: targetMemberProfileId,
            type: 'system',
            title: 'Certification Awarded',
            message: `${cert.name} (${cert.level})`,
            related_entity_type: 'member_profile',
            related_entity_id: targetMemberProfileId,
          });
        }
      } catch (error) {
        console.error('[updateMemberProgression] Certification notification failed:', error.message);
      }

      return Response.json({
        success: true,
        action,
        profile: updated,
        certification: cert,
      });
    }

    if (action === 'revoke_certification') {
      const certificationId = text(payload.certificationId || payload.id);
      const certificationName = text(payload.certificationName || payload.name).toLowerCase();
      if (!certificationId && !certificationName) {
        return Response.json({ error: 'certificationId or certificationName required' }, { status: 400 });
      }

      const index = certifications.findIndex((entry: any) => {
        if (certificationId && entry.id === certificationId) return true;
        return certificationName && text(entry.name).toLowerCase() === certificationName;
      });
      if (index < 0) {
        return Response.json({ error: 'Certification not found' }, { status: 404 });
      }

      const current = certifications[index];
      const revoked = {
        ...current,
        status: 'revoked',
        revoked_at: nowIso,
        revoked_by_member_profile_id: actorMemberId,
        revoke_reason: text(payload.reason || ''),
      };

      const nextCertifications = [...certifications];
      nextCertifications[index] = revoked;
      const updated = await applyFirstSuccessfulMemberUpdate(base44, targetMemberProfileId, [
        { certifications: nextCertifications },
        { certification_list: nextCertifications },
      ]);

      await writeProgressLog(base44, {
        type: 'MEMBER_CERTIFICATION_REVOKED',
        severity: 'MEDIUM',
        actor_member_profile_id: actorMemberId,
        target_member_profile_id: targetMemberProfileId,
        summary: `Certification revoked: ${text(current.name)}`,
        details: {
          certification: revoked,
          target_member_profile_id: targetMemberProfileId,
        },
      });

      return Response.json({
        success: true,
        action,
        profile: updated,
        certification: revoked,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateMemberProgression] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
