import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isSysAdmin = memberProfile?.is_system_administrator === true;

    if (!isAdmin && !isSysAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const now = new Date();
    const events = await base44.entities.Event.list();
    let updated = 0;

    for (const event of events) {
      let newStatus = null;
      let newPhase = null;
      const startTime = new Date(event.start_time);
      const endTime = event.end_time ? new Date(event.end_time) : null;

      // Skip if already completed/archived
      if (['completed', 'cancelled', 'failed', 'aborted'].includes(event.status)) {
        continue;
      }

      // Milestone-based status updates
      // 1. Event has started
      if (now >= startTime && event.status === 'scheduled') {
        newStatus = 'active';
        newPhase = 'ACTIVE';
        
        await base44.entities.EventLog.create({
          event_id: event.id,
          timestamp: now.toISOString(),
          type: 'STATUS',
          severity: 'MEDIUM',
          summary: 'Event auto-activated: start time reached'
        });
      }

      // 2. Event has ended
      if (endTime && now >= endTime && event.status === 'active') {
        newStatus = 'completed';
        newPhase = 'DEBRIEF';
        
        await base44.entities.EventLog.create({
          event_id: event.id,
          timestamp: now.toISOString(),
          type: 'STATUS',
          severity: 'MEDIUM',
          summary: 'Event auto-completed: end time reached'
        });
      }

      // 3. Readiness check passed
      if (
        event.status === 'scheduled' &&
        event.readiness_checklist?.comms_provisioned &&
        event.readiness_checklist?.minimum_attendance_met &&
        event.readiness_checklist?.roles_assigned
      ) {
        newPhase = 'BRIEFING';
        
        await base44.entities.EventLog.create({
          event_id: event.id,
          timestamp: now.toISOString(),
          type: 'STATUS',
          severity: 'LOW',
          summary: 'Event readiness achieved: moved to briefing phase'
        });
      }

      // Apply updates
      if (newStatus || newPhase) {
        const updateData = {};
        if (newStatus) updateData.status = newStatus;
        if (newPhase) {
          updateData.phase = newPhase;
          updateData.phase_transitioned_at = now.toISOString();
        }
        
        await base44.entities.Event.update(event.id, updateData);
        updated++;
      }
    }

    return Response.json({
      success: true,
      checked: events.length,
      updated
    });

  } catch (error) {
    console.error('Error auto-updating events:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
