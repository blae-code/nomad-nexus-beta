/**
 * Presence Roster Hook
 * Fetches and maintains online user roster
 */

import { useState, useEffect } from 'react';
import * as presenceService from '@/components/services/presenceService';

const ROSTER_POLL_INTERVAL_MS = 15000; // 15 seconds
const ONLINE_RECENCY_WINDOW_MS = 90000; // 90 seconds

/**
 * usePresenceRoster
 * Polls presence data and derives online roster
 * @param {Object} [config] - { pollIntervalMs, recencyWindowMs, enabled }
 * @returns {Object} - { onlineUsers, onlineCount, loading, error }
 */
export function usePresenceRoster(config = {}) {
  const {
    pollIntervalMs = ROSTER_POLL_INTERVAL_MS,
    recencyWindowMs = ONLINE_RECENCY_WINDOW_MS,
    enabled = true,
  } = config;

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchRoster = async () => {
      try {
        setLoading(true);
        setError(null);
        const users = await presenceService.getOnlineUsers(recencyWindowMs);
        setOnlineUsers(users);
      } catch (err) {
        console.error('[usePresenceRoster] Fetch failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchRoster();

    // Poll on interval
    const pollInterval = setInterval(fetchRoster, pollIntervalMs);

    // Pause polling when tab hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(pollInterval);
      } else {
        fetchRoster();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, pollIntervalMs, recencyWindowMs]);

  return {
    onlineUsers,
    onlineCount: onlineUsers.length,
    loading,
    error,
  };
}

export default usePresenceRoster;