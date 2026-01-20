import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Get all unsent notifications that are due
    const notifications = await base44.asServiceRole.entities.EventNotification.filter({
      is_sent: false
    });

    let sentCount = 0;

    for (const notification of notifications) {
      const event = await base44.asServiceRole.entities.Event.get(notification.event_id);
      if (!event) continue;

      const scheduledTime = calculateNotificationTime(event.start_time, notification);
      
      if (scheduledTime && scheduledTime <= now && !notification.is_sent) {
        // Mark as sent
        await base44.asServiceRole.entities.EventNotification.update(notification.id, {
          is_sent: true,
          sent_at: now.toISOString()
        });

        // Create in-app notification
        const notifMessage = notification.message || generateDefaultMessage(notification, event);
        await base44.asServiceRole.entities.Notification.create({
          user_id: notification.user_id,
          type: notification.type,
          title: `Event: ${event.title}`,
          message: notifMessage,
          related_entity_type: 'message',
          related_entity_id: notification.event_id,
          action_url: `/events?id=${notification.event_id}`,
          is_read: false
        });

        sentCount++;
      }
    }

    return Response.json({
      success: true,
      sentCount,
      message: `Processed ${sentCount} event notifications`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateNotificationTime(eventStartTime, notification) {
  const start = new Date(eventStartTime);
  
  switch (notification.trigger_type) {
    case 'minutes_before':
      return new Date(start.getTime() - notification.trigger_value * 60 * 1000);
    case 'hours_before':
      return new Date(start.getTime() - notification.trigger_value * 60 * 60 * 1000);
    case 'days_before':
      return new Date(start.getTime() - notification.trigger_value * 24 * 60 * 60 * 1000);
    case 'at_time':
      return start;
    default:
      return null;
  }
}

function generateDefaultMessage(notification, event) {
  switch (notification.type) {
    case 'reminder':
      return `Reminder: ${event.title} is starting soon`;
    case 'event_created':
      return `New event created: ${event.title}`;
    case 'event_updated':
      return `Event updated: ${event.title}`;
    case 'event_cancelled':
      return `Event cancelled: ${event.title}`;
    case 'status_change':
      return `Status changed for ${event.title}`;
    default:
      return `Update for event: ${event.title}`;
  }
}