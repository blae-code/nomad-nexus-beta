import { getAuthContext, readJson } from './_shared/memberAuth.ts';

const ALERT_FILTERS = new Set(['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const TEXT_SIZES = new Set(['sm', 'base', 'lg']);

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function sanitizePreferences(input: any) {
  const severity = String(input?.alertSeverityFilter || 'ALL').toUpperCase();
  const textSize = String(input?.textSize || 'base').toLowerCase();

  return {
    showOrders: input?.showOrders !== false,
    showAlerts: input?.showAlerts !== false,
    compactMap: input?.compactMap !== false,
    highContrast: Boolean(input?.highContrast),
    orderLimit: clampInt(input?.orderLimit, 5, 50, 12),
    alertLimit: clampInt(input?.alertLimit, 5, 50, 12),
    alertSeverityFilter: ALERT_FILTERS.has(severity) ? severity : 'ALL',
    textSize: TEXT_SIZES.has(textSize) ? textSize : 'base',
  };
}

async function applyPreferenceUpdate(base44: any, memberId: string, preferences: Record<string, unknown>) {
  const attempts = [
    { hud_preferences: preferences },
    { hud_mode_preferences: preferences },
    { preferences: { hud: preferences } },
  ];

  let lastError: Error | null = null;
  for (const payload of attempts) {
    try {
      const memberProfile = await base44.entities.MemberProfile.update(memberId, payload);
      const updatedField = Object.keys(payload)[0];
      return { memberProfile, updatedField };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Failed to update HUD preferences');
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

    const preferencesPayload = payload.preferences;
    if (!preferencesPayload || typeof preferencesPayload !== 'object') {
      return Response.json({ error: 'preferences object required' }, { status: 400 });
    }

    const actorMemberId = memberProfile?.id || null;
    const targetMemberProfileId = payload.targetMemberProfileId || actorMemberId;

    if (!targetMemberProfileId) {
      return Response.json(
        { error: 'targetMemberProfileId required for admin-only context' },
        { status: 400 }
      );
    }

    if (actorMemberId && targetMemberProfileId !== actorMemberId && actorType !== 'admin') {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const sanitized = sanitizePreferences(preferencesPayload);
    const { memberProfile: updatedProfile, updatedField } = await applyPreferenceUpdate(
      base44,
      targetMemberProfileId,
      sanitized
    );

    try {
      await base44.entities.Notification.create({
        user_id: targetMemberProfileId,
        type: 'system',
        title: 'HUD Preferences Updated',
        message: 'Your HUD customization settings were saved.',
        related_entity_type: 'member_profile',
        related_entity_id: targetMemberProfileId,
      });
    } catch (error) {
      console.error('[updateHudPreferences] Notification failed:', error.message);
    }

    return Response.json({
      success: true,
      actorId: actorMemberId || adminUser?.id || null,
      targetMemberProfileId,
      preferences: sanitized,
      updatedField,
      memberProfile: updatedProfile,
    });
  } catch (error) {
    console.error('[updateHudPreferences] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
