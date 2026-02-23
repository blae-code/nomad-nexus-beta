import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const COMMAND_RANKS = new Set(['PIONEER', 'FOUNDER', 'VOYAGER', 'COMMANDER']);
const COMMAND_ROLES = new Set(['admin', 'command', 'officer', 'communications', 'comms']);
const MAX_RECIPIENTS = 120;

function text(value: unknown): string {
  return String(value || '').trim();
}

function token(value: unknown): string {
  return text(value).toLowerCase();
}

function unique(values: string[]): string[] {
  return [...new Set((values || []).map((entry) => text(entry)).filter(Boolean))];
}

function hasCommandAuthority(memberProfile: any): boolean {
  if (isAdminMember(memberProfile)) return true;
  const rank = text(memberProfile?.rank).toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(memberProfile?.roles)
    ? memberProfile.roles.map((entry: unknown) => token(entry))
    : [];
  return roles.some((entry) => COMMAND_ROLES.has(entry));
}

function hasScopedSignalAuthority(memberProfile: any, scopeRaw: string): boolean {
  const scope = token(scopeRaw);
  const roleSet = new Set(
    (Array.isArray(memberProfile?.roles) ? memberProfile.roles : [])
      .map((entry: unknown) => token(entry))
      .filter(Boolean)
  );
  const isSquadLead = roleSet.has('squad_lead') || roleSet.has('squadlead') || roleSet.has('lead') || roleSet.has('command');
  const isPilot = roleSet.has('pilot') || token(memberProfile?.role).includes('pilot');
  const isCommandLike = roleSet.has('command') || roleSet.has('officer') || roleSet.has('admin');

  if (scope === 'ship') return isPilot || isSquadLead || isCommandLike;
  if (scope === 'squad') return isSquadLead || isCommandLike;
  if (scope === 'wing' || scope === 'fleet') return false;
  return false;
}

async function listAllMembers(base44: any): Promise<any[]> {
  try {
    const rows = await base44.entities.MemberProfile.list();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType || !memberProfile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      message,
      targetType,
      targetIds,
      eventId,
      netId,
      channelId,
      scope,
      scopeContext = {},
      allowScopedRoleSignal = false,
      roleToken = '',
    } = payload || {};

    if (!message || !targetType || !Array.isArray(targetIds) || targetIds.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const commandAuthority = hasCommandAuthority(memberProfile);
    const scopedMode = Boolean(allowScopedRoleSignal);
    if (!commandAuthority) {
      const targetTypeToken = token(targetType);
      if (!scopedMode) {
        return Response.json({ error: 'Insufficient rank - Pioneer or higher required' }, { status: 403 });
      }
      if (targetTypeToken !== 'member') {
        return Response.json({ error: 'Scoped role signal only supports targetType "member"' }, { status: 403 });
      }
      if (!hasScopedSignalAuthority(memberProfile, scope)) {
        return Response.json({ error: 'Insufficient scoped authority' }, { status: 403 });
      }
    }

    // Fetch target users based on type.
    const targetTypeToken = token(targetType);
    let recipientUserIds: string[] = [];
    const recipientNames: string[] = [];

    if (targetTypeToken === 'role') {
      const allMembers = await listAllMembers(base44);
      for (const roleId of targetIds) {
        let roleName = text(roleId);
        try {
          const role = await base44.entities.Role.get(roleId);
          if (role?.name) roleName = role.name;
        } catch {
          // roleId may already be role name.
        }

        if (!roleName) continue;
        recipientNames.push(roleName);
        const membersWithRole = allMembers.filter((member: any) =>
          Array.isArray(member.roles) && member.roles.map((entry: unknown) => token(entry)).includes(token(roleName))
        );
        recipientUserIds.push(...membersWithRole.map((member: any) => text(member.id)));
      }
    } else if (targetTypeToken === 'rank') {
      const allMembers = await listAllMembers(base44);
      for (const rank of targetIds) {
        const rankToken = text(rank).toUpperCase();
        if (!rankToken) continue;
        recipientNames.push(rankToken);
        const membersWithRank = allMembers.filter((member: any) => text(member.rank).toUpperCase() === rankToken);
        recipientUserIds.push(...membersWithRank.map((member: any) => text(member.id)));
      }
    } else if (targetTypeToken === 'squad') {
      const squads = await base44.entities.Squad.list().catch(() => []);
      const squadRows = Array.isArray(squads) ? squads : [];
      const squadsById = new Map(squadRows.map((entry: any) => [text(entry.id), entry]));
      const squadsByName = new Map(squadRows.map((entry: any) => [token(entry.name || entry.slug || entry.id), entry]));

      for (const squadId of targetIds) {
        const rawId = text(squadId);
        const squad =
          squadsById.get(rawId) ||
          squadsByName.get(token(rawId)) ||
          null;
        if (!squad) continue;
        recipientNames.push(text(squad.name || squad.id));
        const memberships = await base44.entities.SquadMembership.filter({
          squad_id: squad.id,
          status: 'active',
        }).catch(() => []);
        if (!Array.isArray(memberships)) continue;
        recipientUserIds.push(
          ...memberships.map((entry: any) => text(entry.member_profile_id || entry.user_id)).filter(Boolean)
        );
      }
    } else if (targetTypeToken === 'member') {
      const allMembers = await listAllMembers(base44);
      const memberMap = new Map(allMembers.map((member: any) => [text(member.id), member]));
      for (const memberId of targetIds) {
        const normalizedId = text(memberId);
        if (!normalizedId) continue;
        const member = memberMap.get(normalizedId);
        if (member) {
          recipientNames.push(text(member.display_callsign || member.callsign || member.full_name || member.id));
        } else {
          recipientNames.push(normalizedId);
        }
        recipientUserIds.push(normalizedId);
      }
    }

    recipientUserIds = unique(recipientUserIds);
    if (recipientUserIds.length > MAX_RECIPIENTS) {
      recipientUserIds = recipientUserIds.slice(0, MAX_RECIPIENTS);
    }
    if (recipientNames.length > MAX_RECIPIENTS) {
      recipientNames.length = MAX_RECIPIENTS;
    }

    if (recipientUserIds.length === 0) {
      return Response.json({ error: 'No recipients found' }, { status: 400 });
    }

    const whisperMessage = await base44.entities.Message.create({
      channel_id: channelId || netId || eventId || 'global',
      user_id: memberProfile.id,
      content: `[WHISPER to ${recipientNames.join(', ')}] ${message}`,
      whisper_metadata: {
        is_whisper: true,
        sender_member_profile_id: memberProfile.id,
        sender_name: memberProfile.display_callsign || memberProfile.callsign || memberProfile.full_name,
        target_type: targetTypeToken,
        target_ids: targetIds,
        recipient_member_profile_ids: recipientUserIds,
        sent_at: new Date().toISOString(),
        scope: text(scope).toLowerCase() || null,
        scope_context: scopeContext || {},
        role_token: text(roleToken).toLowerCase() || null,
        allow_scoped_role_signal: scopedMode,
      },
    });

    for (const recipientId of recipientUserIds) {
      await base44.entities.Notification.create({
        user_id: recipientId,
        type: 'direct_message',
        title: 'Whisper from Command',
        message: `${memberProfile.display_callsign || memberProfile.callsign}: ${message}`,
        related_entity_type: 'message',
        related_entity_id: whisperMessage.id,
        is_read: false,
      });
    }

    await base44.entities.EventLog.create({
      event_id: eventId || null,
      type: 'COMMS',
      severity: 'LOW',
      actor_member_profile_id: memberProfile.id,
      summary: `Whisper sent to ${recipientNames.join(', ')} (${recipientUserIds.length} recipients)`,
      details: {
        target_type: targetTypeToken,
        targets: recipientNames,
        scope: text(scope).toLowerCase() || null,
        scope_context: scopeContext || {},
        role_token: text(roleToken).toLowerCase() || null,
        allow_scoped_role_signal: scopedMode,
      },
    });

    return Response.json({
      status: 'success',
      message_id: whisperMessage.id,
      recipients_count: recipientUserIds.length,
      targets: recipientNames,
      scope: text(scope).toLowerCase() || null,
      role_token: text(roleToken).toLowerCase() || null,
    });
  } catch (error: any) {
    console.error('Whisper error:', error);
    return Response.json(
      {
        status: 'error',
        error: error?.message || 'Whisper failed',
      },
      { status: 500 }
    );
  }
});
