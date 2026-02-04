import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, payload);
    const { incident_id, event_id } = payload;

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!incident_id || !event_id) {
      return Response.json({ error: 'Missing incident_id or event_id' }, { status: 400 });
    }

    // Get incident
    const incident = await base44.entities.Incident.get(incident_id);
    
    // Get event
    const event = await base44.entities.Event.get(event_id);

    // Get wing commander nets (assigned to command staff)
    const nets = await base44.entities.VoiceNet.list();
    const commandNets = nets.filter(n => 
      n.type === 'command' && n.event_id === event_id
    );

    // Create escalation log entry
    const escalationLog = await base44.entities.EventLog.create({
      event_id: event_id,
      type: 'RESCUE',
      severity: 'HIGH',
      summary: `INCIDENT ESCALATED: ${incident.title}`,
      details: {
        incident_id: incident.id,
        incident_type: incident.incident_type,
        severity: incident.severity,
        affected_area: incident.affected_area,
        assigned_net_ids: commandNets.map(n => n.id),
        escalation_time: new Date().toISOString(),
        action_required: true
      }
    });

    // Update incident status to "responding"
    await base44.entities.Incident.update(incident_id, {
      status: 'responding'
    });

    return Response.json({
      success: true,
      escalation_log_id: escalationLog.id,
      command_nets_notified: commandNets.length,
      message: `Incident escalated to ${commandNets.length} command net(s)`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
