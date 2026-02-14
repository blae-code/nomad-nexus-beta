import { useCallback } from 'react';
import { useNotification } from '@/components/providers/NotificationContext';
import { useNotificationActions } from './useNotificationActions';
import { navigateToPage } from '@/utils';

/**
 * useAlertSimulator — Simulate different alert types for testing
 * Remove or use for development/testing only
 */
export function useAlertSimulator() {
  const { addNotification } = useNotification();
  const { acknowledgeAlert, investigateEvent, createEventFromAlert } = useNotificationActions();

  const triggerEventAlert = useCallback(() => {
    const alertId = addNotification({
      type: 'alert',
      title: 'New Event Scheduled',
      message: 'Squadron training exercise starting in 30 minutes at Stanton',
      duration: null,
      actions: [
        {
          label: 'View Event',
          variant: 'primary',
          onClick: () => investigateEvent('event-123'),
        },
        {
          label: 'Acknowledge',
          variant: 'secondary',
          onClick: () => acknowledgeAlert(alertId),
        },
      ],
    });
  }, [addNotification, acknowledgeAlert, investigateEvent]);

  const triggerSystemAlert = useCallback(() => {
    const alertId = addNotification({
      type: 'warning',
      title: 'System Status Change',
      message: 'Comms net COMMAND-01 is experiencing latency issues',
      duration: null,
      actions: [
        {
          label: 'Investigate',
          variant: 'primary',
          onClick: () => {
            navigateToPage('CommsConsole');
          },
        },
        {
          label: 'Acknowledge',
          onClick: () => acknowledgeAlert(alertId),
        },
      ],
    });
  }, [addNotification, acknowledgeAlert]);

  const triggerSuccessNotif = useCallback(() => {
    addNotification({
      type: 'success',
      title: 'Success',
      message: 'Fleet asset status updated successfully',
      duration: 4000,
    });
  }, [addNotification]);

  const triggerErrorNotif = useCallback(() => {
    addNotification({
      type: 'error',
      title: 'Error',
      message: 'Failed to update member profile. Please try again.',
      duration: 5000,
    });
  }, [addNotification]);

  return {
    triggerEventAlert,
    triggerSystemAlert,
    triggerSuccessNotif,
    triggerErrorNotif,
  };
}
