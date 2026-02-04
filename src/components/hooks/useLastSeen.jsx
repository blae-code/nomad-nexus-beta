import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

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
        const presenceRecords = await Promise.all(
          userIds.map(async (uid) => {
            let records = [];
            try {
              records = await base44.entities.UserPresence.filter({ member_profile_id: uid });
            } catch (error) {
              records = [];
            }

            if (!records || records.length === 0) {
              try {
                records = await base44.entities.UserPresence.filter({ user_id: uid });
              } catch (error) {
                records = [];
              }
            }

            return records[0];
          })
        );

        const map = {};
        presenceRecords.forEach((record, idx) => {
          if (record?.last_activity) {
            map[userIds[idx]] = {
              timestamp: record.last_activity,
              formatted: formatLastSeen(record.last_activity),
              isOnline: isRecentlyActive(record.last_activity),
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
