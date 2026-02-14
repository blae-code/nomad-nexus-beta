import { useCallback } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { base44 } from '@/api/base44Client';
import { navigateToUrl } from '@/utils';

/**
 * useNotificationActions — Helper hook for common notification workflows
 * Provides: acknowledge, investigate, create event, etc.
 */
export function useNotificationActions() {
  const { addNotification, removeNotification, updateNotification } = useNotification();

  const acknowledgeAlert = useCallback(
    async (alertId, data = {}) => {
      try {
        // Log acknowledgment (you can create an audit trail here)
        console.log('Alert acknowledged:', alertId, data);

        // Update notification in context
        updateNotification(alertId, {
          title: 'Alert Acknowledged ✓',
          actions: [],
          duration: 3000,
        });

        return true;
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to acknowledge alert',
          duration: 3000,
        });
        return false;
      }
    },
    [addNotification, updateNotification]
  );

  const investigateEvent = useCallback(
    (eventId) => {
      // Trigger navigation to event details
      navigateToUrl(`/Events?id=${eventId}`);
    },
    []
  );

  const dismissNotification = useCallback(
    (notifId) => {
      removeNotification(notifId);
    },
    [removeNotification]
  );

  const createEventFromAlert = useCallback(
    async (alertData) => {
      try {
        const event = await base44.entities.Event.create({
          title: alertData.title || 'New Event',
          description: alertData.message || '',
          event_type: 'casual',
          status: 'scheduled',
          priority: alertData.priority || 'STANDARD',
          start_time: new Date().toISOString(),
        });

        addNotification({
          type: 'success',
          title: 'Event Created',
          message: `Event "${event.title}" created successfully`,
          duration: 4000,
        });

        return event;
      } catch (error) {
        addNotification({
          type: 'error',
          title: 'Error',
          message: 'Failed to create event',
          duration: 3000,
        });
        return null;
      }
    },
    [addNotification]
  );

  return {
    acknowledgeAlert,
    investigateEvent,
    dismissNotification,
    createEventFromAlert,
    addNotification,
  };
}
