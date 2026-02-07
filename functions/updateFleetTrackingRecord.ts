import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const DEPLOYMENT_STATUSES = new Set(['deployed', 'recalled', 'maintenance_transfer', 'standby']);
const ALERT_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function text(value: unknown, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function hasCommandAccess(memberProfile: any, actorType: string | null) {
  if (actorType === 'admin') return true;
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((role: unknown) => String(role || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('command') || roles.includes('officer');
}

function canManageAsset(actorMemberId: string | null, commandAccess: boolean, asset: any) {
  if (commandAccess) return true;
  if (!actorMemberId) return false;
  const ownerId = asset?.owner_member_profile_id ? String(asset.owner_member_profile_id) : null;
  const assignedId = asset?.assigned_member_profile_id
    ? String(asset.assigned_member_profile_id)
    : asset?.assigned_user_id
    ? String(asset.assigned_user_id)
    : null;
  return actorMemberId === ownerId || actorMemberId === assignedId;
}

async function createFirstSuccessful(entity: any, attempts: Array<Record<string, unknown>>) {
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

async function writeFleetLog(base44: any, payload: Record<string, unknown>) {
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

    if (action === 'log_deployment') {
      const assetId = text(payload.assetId || payload.asset_id);
      if (!assetId) {
        return Response.json({ error: 'assetId required' }, { status: 400 });
      }

      const asset = await base44.entities.FleetAsset.get(assetId);
      if (!asset) {
        return Response.json({ error: 'Fleet asset not found' }, { status: 404 });
      }
      if (!canManageAsset(actorMemberId, commandAccess, asset)) {
        return Response.json({ error: 'Only assigned crew or command staff can log deployment history' }, { status: 403 });
      }

      const deploymentStatusRaw = text(payload.status || 'deployed').toLowerCase();
      const deploymentStatus = DEPLOYMENT_STATUSES.has(deploymentStatusRaw) ? deploymentStatusRaw : 'deployed';
      const eventId = text(payload.eventId || payload.event_id) || null;
      if (eventId && base44?.entities?.Event?.get) {
        const event = await base44.entities.Event.get(eventId).catch(() => null);
        if (!event) {
          return Response.json({ error: 'Operation not found' }, { status: 404 });
        }
      }

      const record = {
        asset_id: assetId,
        asset_name: text(asset?.name || asset?.model || assetId),
        event_id: eventId,
        status: deploymentStatus,
        location: text(payload.location || asset?.location || 'Unknown'),
        note: text(payload.note),
        logged_at: new Date().toISOString(),
      };

      const log = await writeFleetLog(base44, {
        event_id: eventId,
        type: 'FLEET_DEPLOYMENT_HISTORY',
        severity: 'LOW',
        actor_member_profile_id: actorMemberId,
        summary: `${record.asset_name} ${deploymentStatus}`,
        details: record,
      });

      return Response.json({
        success: true,
        action,
        record,
        logId: log?.id || null,
      });
    }

    if (action === 'ack_condition_alert') {
      const assetId = text(payload.assetId || payload.asset_id);
      const alertKey = text(payload.alertKey || payload.alert_key);
      if (!assetId || !alertKey) {
        return Response.json({ error: 'assetId and alertKey required' }, { status: 400 });
      }

      const severityRaw = text(payload.severity || 'medium').toLowerCase();
      const severity = ALERT_SEVERITIES.has(severityRaw) ? severityRaw : 'medium';
      const details = {
        asset_id: assetId,
        alert_key: alertKey,
        severity,
        acknowledged_by_member_profile_id: actorMemberId,
        acknowledged_at: new Date().toISOString(),
      };

      const log = await writeFleetLog(base44, {
        type: 'FLEET_CONDITION_ALERT_ACK',
        severity: severity.toUpperCase(),
        actor_member_profile_id: actorMemberId,
        summary: `Condition alert acknowledged (${assetId})`,
        details,
      });

      return Response.json({
        success: true,
        action,
        acknowledgement: details,
        logId: log?.id || null,
      });
    }

    return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[updateFleetTrackingRecord] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
