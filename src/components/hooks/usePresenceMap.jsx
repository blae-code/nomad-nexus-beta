import { useEffect, useMemo, useState } from 'react';
import * as presenceService from '@/components/services/presenceService';

const formatLastSeen = (timestamp) => {
  if (!timestamp) return null;
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

const isRecentlyActive = (timestamp) => {
  if (!timestamp) return false;
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(timestamp).getTime() > fiveMinutesAgo;
};

const getLastActivity = (record) => {
  return record?.last_activity || record?.lastSeenAt || record?.last_activity_at || null;
};

export const usePresenceMap = (userIds = []) => {
  const idsKey = useMemo(() => (userIds || []).filter(Boolean).join('|'), [userIds]);
  const [presenceMap, setPresenceMap] = useState({});
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    if (!userIds || userIds.length === 0) {
      setPresenceMap({});
      setLastSeenMap({});
      setLoading(false);
      return () => {
        isActive = false;
      };
    }

    const fetchPresence = async () => {
      try {
        const map = await presenceService.getPresenceForUsers(userIds);
        if (!isActive) return;

        const nextPresence = map || {};
        const nextLastSeen = {};
        userIds.forEach((uid) => {
          const record = nextPresence?.[uid];
          const lastActivity = getLastActivity(record);
          if (lastActivity) {
            nextLastSeen[uid] = {
              timestamp: lastActivity,
              formatted: formatLastSeen(lastActivity),
              isOnline: isRecentlyActive(lastActivity),
            };
          }
        });

        setPresenceMap(nextPresence);
        setLastSeenMap(nextLastSeen);
      } catch (error) {
        console.error('Failed to fetch presence map:', error);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 30000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [idsKey]);

  return { presenceMap, lastSeenMap, loading };
};
