import { useState, useEffect } from 'react';
import * as presenceService from '@/components/services/presenceService';

/**
 * Hook to fetch and format last seen timestamps for users
 */
export const useLastSeen = (userIds) => {
  const [lastSeenMap, setLastSeenMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setLastSeenMap({});
      setLoading(false);
      return;
    }

    const fetchLastSeen = async () => {
      try {
        const presenceMap = await presenceService.getPresenceForUsers(userIds);

        const map = {};
        userIds.forEach((uid) => {
          const record = presenceMap?.[uid];
          const lastActivity = record?.last_activity || record?.lastSeenAt;
          if (lastActivity) {
            map[uid] = {
              timestamp: lastActivity,
              formatted: formatLastSeen(lastActivity),
              isOnline: isRecentlyActive(lastActivity),
            };
          }
        });

        setLastSeenMap(map);
      } catch (error) {
        console.error('Failed to fetch last seen:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLastSeen();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLastSeen, 30000);
    return () => clearInterval(interval);
  }, [userIds?.join(',')]);

  return { lastSeenMap, loading };
};

function formatLastSeen(timestamp) {
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
}

function isRecentlyActive(timestamp) {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  return new Date(timestamp).getTime() > fiveMinutesAgo;
}
