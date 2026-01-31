/**
 * useDesktopNotifications — Request permission and send desktop notifications
 */

import { useEffect, useState } from 'react';

export function useDesktopNotifications() {
  const [permission, setPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Desktop notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }

    return false;
  };

  const sendNotification = (title, options = {}) => {
    if (permission === 'granted' && 'Notification' in window) {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        ...options,
      });
    }
  };

  return { permission, requestPermission, sendNotification };
}