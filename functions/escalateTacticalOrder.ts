import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const ESCALATION_PRIORITIES = new Set(['HIGH', 'CRITICAL']);
const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

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

    const { commandId, reason = '', priority = 'CRITICAL' } = payload;
    if (!commandId) {
      return Response.json({ error: 'commandId required' }, { status: 400 });
    }

    const command = await base44.entities.TacticalCommand.get(commandId);
    if (!command) {
      return Response.json({ error: 'Command not found' }, { status: 404 });
    }

    const actorMemberId = memberProfile?.id || null;
    const actorAdminId = adminUser?.id || null;
    const actorRank = (memberProfile?.rank || '').toString().toUpperCase();
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isIssuer = actorMemberId && command.issued_by_member_profile_id === actorMemberId;
    const isCommandRank = COMMAND_RANKS.has(actorRank);
    if (!isAdmin && !isIssuer && !isCommandRank) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const nextPriority = ESCALATION_PRIORITIES.has((priority || '').toString().toUpperCase())
      ? (priority || '').toString().toUpperCase()
      : 'CRITICAL';
    const nowIso = new Date().toISOString();
    const escalationHistory = Array.isArray(command.escalation_history)
      ? command.escalation_history
      : [];
    const historyEntry = {
      escalated_at: nowIso,
      escalated_by_member_profile_id: actorMemberId,
      escalated_by_user_id: actorAdminId,
      reason: reason || 'Escalated from command center',
    };

    const updated = await base44.entities.TacticalCommand.update(commandId, {
      status: 'ESCALATED',
      priority: nextPriority,
      escalated_at: nowIso,
      escalated_by_member_profile_id: actorMemberId,
      escalated_by_user_id: actorAdminId,
      escalation_count: Number(command.escalation_count || 0) + 1,
      escalation_reason: reason || null,
      escalation_history: [...escalationHistory, historyEntry],
    });

    let eventLogCreated = false;
    if (command.event_id) {
      try {
        await base44.entities.EventLog.create({
          event_id: command.event_id,
          type: 'COMMAND_ESCALATION',
          severity: 'HIGH',
          actor_member_profile_id: actorMemberId,
          summary: `Escalated command: ${command.message || command.command_type || 'order'}`,
          details: {
            command_id: commandId,
            previous_status: command.status || 'ISSUED',
            new_status: 'ESCALATED',
            escalation_reason: reason || null,
            escalation_priority: nextPriority,
            target_type: command.target_type || null,
            target_ids: command.target_ids || [],
          },
        });
        eventLogCreated = true;
      } catch (error) {
        console.error('[escalateTacticalOrder] EventLog create failed:', error.message);
      }
    }

    const notificationTargets = new Set<string>();
    const targetedMembers = Array.isArray(command.target_member_profile_ids)
      ? command.target_member_profile_ids
      : [];
    targetedMembers.forEach((id) => id && notificationTargets.add(id));

    try {
      const members = await base44.entities.MemberProfile.list('-created_date', 500);
      for (const profile of members || []) {
        const rank = (profile?.rank || '').toString().toUpperCase();
        const roles = Array.isArray(profile?.roles)
          ? profile.roles.map((r: unknown) => r?.toString().toLowerCase())
          : [];
        if (COMMAND_RANKS.has(rank) || roles.includes('admin')) {
          if (profile?.id) notificationTargets.add(profile.id);
        }
      }
    } catch (error) {
      console.error('[escalateTacticalOrder] MemberProfile list failed:', error.message);
    }

    let notificationsSent = 0;
    for (const memberId of notificationTargets) {
      if (!memberId || (actorMemberId && memberId === actorMemberId)) continue;
      try {
        await base44.entities.Notification.create({
          user_id: memberId,
          type: 'alert',
          title: 'Command Escalated',
          message: command.message || 'A tactical command was escalated.',
          related_entity_type: 'tactical_command',
          related_entity_id: commandId,
        });
        notificationsSent += 1;
      } catch (error) {
        console.error('[escalateTacticalOrder] Notification failed:', error.message);
      }
    }

    return Response.json({
      success: true,
      command: updated,
      eventLogCreated,
      notificationsSent,
    });
  } catch (error) {
    console.error('[escalateTacticalOrder] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
