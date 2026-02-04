import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active recurrences
    const recurrences = await base44.entities.EventRecurrence.filter({
      is_active: true
    });

    let generatedCount = 0;
    const now = new Date();

    for (const recurrence of recurrences) {
      // Get the parent event
      const parentEvent = await base44.entities.Event.get(recurrence.event_id);
      if (!parentEvent) continue;

      // Check if we should generate more events
      const shouldStop = checkRecurrenceEnd(recurrence, now);
      if (shouldStop) {
        await base44.entities.EventRecurrence.update(recurrence.id, { is_active: false });
        continue;
      }

      // Generate next occurrence
      const nextDate = calculateNextOccurrence(parentEvent.start_time, recurrence);
      if (!nextDate || nextDate <= now) continue;

      // Create new event instance
      const newEvent = await base44.entities.Event.create({
        ...parentEvent,
        start_time: nextDate.toISOString(),
        end_time: parentEvent.end_time ? 
          new Date(new Date(nextDate).getTime() + (new Date(parentEvent.end_time) - new Date(parentEvent.start_time))).toISOString() 
          : null,
        is_recurring_instance: true,
        parent_recurrence_id: recurrence.id,
        status: 'scheduled'
      });

      // Update recurrence counter
      await base44.entities.EventRecurrence.update(recurrence.id, {
        occurrences_generated: recurrence.occurrences_generated + 1
      });

      generatedCount++;

      // Create notifications for participants
      const assignedIds = parentEvent.assigned_member_profile_ids || parentEvent.assigned_user_ids || [];
      if (assignedIds.length > 0) {
        for (const memberId of assignedIds) {
          await base44.entities.EventNotification.create({
            event_id: newEvent.id,
            member_profile_id: memberId,
            type: 'event_created',
            message: `New recurring event: ${newEvent.title}`
          });
        }
      }
    }

    return Response.json({
      success: true,
      generatedCount,
      message: `Generated ${generatedCount} recurring event instances`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function checkRecurrenceEnd(recurrence, now) {
  if (recurrence.end_type === 'never') return false;
  if (recurrence.end_type === 'after_count' && recurrence.occurrences_generated < recurrence.end_count) return false;
  if (recurrence.end_type === 'on_date' && now < new Date(recurrence.end_date)) return false;
  return true;
}

function calculateNextOccurrence(startTime, recurrence) {
  const start = new Date(startTime);
  let next = new Date(start);
  next.setDate(next.getDate() + 1);

  switch (recurrence.frequency) {
    case 'daily':
      next = new Date(start.getTime() + recurrence.interval * 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      if (recurrence.day_of_week && recurrence.day_of_week.length > 0) {
        while (!recurrence.day_of_week.includes(next.getDay())) {
          next.setDate(next.getDate() + 1);
        }
        next.setDate(next.getDate() + (recurrence.interval - 1) * 7);
      }
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14 * (recurrence.interval - 1));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + recurrence.interval);
      if (recurrence.day_of_month) {
        next.setDate(recurrence.day_of_month);
      }
      break;
  }

  return next;
}
