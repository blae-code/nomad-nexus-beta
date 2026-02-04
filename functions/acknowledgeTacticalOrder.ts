import { getAuthContext, readJson } from './_shared/memberAuth.ts';

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

    const { commandId } = payload;
    if (!commandId) {
      return Response.json({ error: 'commandId required' }, { status: 400 });
    }

    const command = await base44.entities.TacticalCommand.get(commandId);
    if (!command) {
      return Response.json({ error: 'Command not found' }, { status: 404 });
    }

    const actorId = memberProfile?.id || adminUser?.id;
    if (!actorId) {
      return Response.json({ error: 'Actor not resolved' }, { status: 400 });
    }

    const existing = Array.isArray(command.acknowledged_by_member_profile_ids)
      ? command.acknowledged_by_member_profile_ids
      : [];
    const next = new Set(existing);
    next.add(actorId);

    const targetMembers = Array.isArray(command.target_member_profile_ids)
      ? command.target_member_profile_ids
      : [];

    const status = command.requires_ack && targetMembers.length > 0 && next.size >= targetMembers.length
      ? 'ACKNOWLEDGED'
      : command.status || 'ISSUED';

    const updated = await base44.entities.TacticalCommand.update(commandId, {
      acknowledged_by_member_profile_ids: Array.from(next),
      status,
      last_acknowledged_at: new Date().toISOString(),
    });

    if (command.event_id) {
      await base44.entities.EventLog.create({
        event_id: command.event_id,
        type: 'COMMAND_ACK',
        severity: 'LOW',
        actor_member_profile_id: memberProfile?.id || null,
        summary: `Command acknowledged by ${memberProfile?.display_callsign || memberProfile?.callsign || actorId}`,
        details: { command_id: commandId },
      });
    }

    return Response.json({ success: true, command: updated });
  } catch (error) {
    console.error('[acknowledgeTacticalOrder] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
