/**
 * useUnreadCounts — Track unread message counts per channel & per tab
 * Debounces read-state updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages, getReadState, setReadState, getChannels } from '@/components/services/commsService';
import { CommsChannelDefaults } from '@/components/models/comms';

export function useUnreadCounts(userId) {
  const [channels, setChannels] = useState([]);
  const [unreadByChannel, setUnreadByChannel] = useState({}); // { channelId: count }
  const [unreadByTab, setUnreadByTab] = useState({ comms: 0, polls: 0, riggsy: 0, inbox: 0 });
  const [loading, setLoading] = useState(true);

  // Debounce refs for read state updates
  const markReadTimeoutRef = useRef({});

  /**
   * Calculate unread count for a channel
   */
  const calculateUnread = useCallback(async (channelId) => {
    const messages = await getMessages(channelId);
    const readState = await getReadState(userId, 'CHANNEL', channelId);

    if (!readState) {
      // No read state = all messages unread
      return messages.length;
    }

    const lastReadAt = new Date(readState.lastReadAt).getTime();
    const unread = messages.filter((msg) => new Date(msg.createdAt).getTime() > lastReadAt).length;
    return unread;
  }, [userId]);

  /**
   * Recalculate all unread counts
   */
  const refreshUnreadCounts = useCallback(async () => {
    const allChannels = await getChannels();
    setChannels(allChannels);

    const counts = {};
    for (const channel of allChannels) {
      counts[channel.id] = await calculateUnread(channel.id);
    }

    setUnreadByChannel(counts);

    // Tab-level unread = sum of casual channels
    const casualCount = allChannels
      .filter((ch) => ch.type === CommsChannelDefaults.CASUAL)
      .reduce((sum, ch) => sum + (counts[ch.id] || 0), 0);

    setUnreadByTab((prev) => ({ ...prev, comms: casualCount }));
  }, [calculateUnread]);

  /**
   * Mark a channel as read (debounced)
   */
  const markChannelRead = useCallback(
    (channelId) => {
      // Clear any pending timeout for this channel
      if (markReadTimeoutRef.current[channelId]) {
        clearTimeout(markReadTimeoutRef.current[channelId]);
      }

      // Debounce: wait 500ms before writing
      markReadTimeoutRef.current[channelId] = setTimeout(async () => {
        await setReadState(userId, 'CHANNEL', channelId);

        // Refresh counts after marking read
        const newCount = await calculateUnread(channelId);
        setUnreadByChannel((prev) => ({ ...prev, [channelId]: newCount }));
      }, 500);
    },
    [userId, calculateUnread]
  );

  /**
   * Mark a tab as read (debounced)
   */
  const markTabRead = useCallback(
    (tabId) => {
      if (markReadTimeoutRef.current[tabId]) {
        clearTimeout(markReadTimeoutRef.current[tabId]);
      }

      markReadTimeoutRef.current[tabId] = setTimeout(async () => {
        await setReadState(userId, 'TAB', tabId);
        setUnreadByTab((prev) => ({ ...prev, [tabId]: 0 }));
      }, 500);
    },
    [userId]
  );

  // Initial load
  useEffect(() => {
    setLoading(true);
    refreshUnreadCounts().finally(() => setLoading(false));
  }, [refreshUnreadCounts]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(markReadTimeoutRef.current).forEach((timeout) => clearTimeout(timeout));
    };
  }, []);

  return {
    channels,
    unreadByChannel,
    unreadByTab,
    loading,
    markChannelRead,
    markTabRead,
    refreshUnreadCounts,
  };
}