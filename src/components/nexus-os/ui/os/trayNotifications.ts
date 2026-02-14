import { useCallback, useMemo, useState } from 'react';

export type NexusTrayNotificationLevel = 'info' | 'success' | 'warning' | 'critical';

export interface NexusTrayNotification {
  id: string;
  title: string;
  detail?: string;
  source?: string;
  level: NexusTrayNotificationLevel;
  createdAt: string;
  read: boolean;
}

export interface NexusTrayNotificationInput {
  id?: string;
  title: string;
  detail?: string;
  source?: string;
  level?: NexusTrayNotificationLevel;
  createdAt?: string;
}

function createNotificationId(prefix = 'nx_notice'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeNotification(input: NexusTrayNotificationInput): NexusTrayNotification {
  return {
    id: input.id || createNotificationId(),
    title: input.title,
    detail: input.detail,
    source: input.source,
    level: input.level || 'info',
    createdAt: input.createdAt || new Date().toISOString(),
    read: false,
  };
}

export function useNexusTrayNotifications(options: { maxItems?: number } = {}) {
  const maxItems = Math.max(8, options.maxItems || 32);
  const [notifications, setNotifications] = useState<NexusTrayNotification[]>([]);

  const pushNotification = useCallback(
    (input: NexusTrayNotificationInput) => {
      const next = normalizeNotification(input);
      setNotifications((prev) => {
        const withoutExisting = prev.filter((entry) => entry.id !== next.id);
        return [next, ...withoutExisting].slice(0, maxItems);
      });
      return next.id;
    },
    [maxItems]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, read: true } : entry))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((entry) => ({ ...entry, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = useMemo(
    () => notifications.reduce((count, entry) => count + (entry.read ? 0 : 1), 0),
    [notifications]
  );

  return {
    notifications,
    unreadCount,
    pushNotification,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearNotifications,
  };
}
