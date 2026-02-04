/**
 * useUnreadCounts — Track unread message counts per channel & per tab
 * Debounces read-state updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const unreadByChannel = {};

export function useUnreadCounts(userId) {
  const [channels, setChannels] = useState([]);
  const [unreadByChannelState, setUnreadByChannelState] = useState({}); // { channelId: count }
  const [unreadByTab, setUnreadByTab] = useState({ comms: 0, polls: 0, riggsy: 0, inbox: 0 });
  const [loading, setLoading] = useState(true);

  // Debounce refs for read state updates
  const markReadTimeoutRef = useRef({});

  /**
   * Calculate unread count for a channel
   */
  const calculateUnread = useCallback(async (channelId) => {
    try {
      const messages = await base44.entities.Message.filter({ channel_id: channelId });
      let readStates = [];
      try {
        readStates = await base44.entities.CommsReadState.filter({
          member_profile_id: userId,
          scope_type: 'CHANNEL',
          scope_id: channelId,
        });
      } catch {
        readStates = [];
      }

      if (!readStates || readStates.length === 0) {
        try {
          readStates = await base44.entities.CommsReadState.filter({
            user_id: userId,
            scope_type: 'CHANNEL',
            scope_id: channelId,
          });
        } catch {
          readStates = [];
        }
      }
      const readState = readStates[0];

      if (!readState) {
        // No read state = all messages unread
        return messages.length;
      }

      const lastReadAt = new Date(readState.last_read_at).getTime();
      const unread = messages.filter((msg) => new Date(msg.created_date).getTime() > lastReadAt).length;
      return unread;
    } catch (error) {
      console.error('Error calculating unread:', error);
      return 0;
    }
  }, [userId]);

  /**
   * Recalculate all unread counts
   */
  const refreshUnreadCounts = useCallback(async () => {
    try {
      const allChannels = await base44.entities.Channel.list();
      setChannels(allChannels);

      const counts = {};
      for (const channel of allChannels) {
        counts[channel.id] = await calculateUnread(channel.id);
      }

      setUnreadByChannelState(counts);

      // Also update exported object
      Object.keys(counts).forEach(key => {
        unreadByChannel[key] = counts[key];
      });

      // Tab-level unread = sum of casual channels
      const casualCount = allChannels
        .filter((ch) => ch.category === 'casual')
        .reduce((sum, ch) => sum + (counts[ch.id] || 0), 0);

      setUnreadByTab((prev) => ({ ...prev, comms: casualCount }));
    } catch (error) {
      console.error('Error refreshing unread counts:', error);
    }
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
        try {
          // Check if read state exists
          let existing = [];
          try {
            existing = await base44.entities.CommsReadState.filter({
              member_profile_id: userId,
              scope_type: 'CHANNEL',
              scope_id: channelId,
            });
          } catch {
            existing = [];
          }

          if (!existing || existing.length === 0) {
            try {
              existing = await base44.entities.CommsReadState.filter({
                user_id: userId,
                scope_type: 'CHANNEL',
                scope_id: channelId,
              });
            } catch {
              existing = [];
            }
          }

          if (existing[0]) {
            await base44.entities.CommsReadState.update(existing[0].id, {
              last_read_at: new Date().toISOString(),
            });
          } else {
            try {
              await base44.entities.CommsReadState.create({
                member_profile_id: userId,
                user_id: userId,
                scope_type: 'CHANNEL',
                scope_id: channelId,
                last_read_at: new Date().toISOString(),
              });
            } catch {
              await base44.entities.CommsReadState.create({
                user_id: userId,
                scope_type: 'CHANNEL',
                scope_id: channelId,
                last_read_at: new Date().toISOString(),
              });
            }
          }

          // Refresh counts after marking read
          const newCount = await calculateUnread(channelId);
          setUnreadByChannelState((prev) => ({ ...prev, [channelId]: newCount }));
          unreadByChannel[channelId] = newCount;
        } catch (error) {
          console.error('Error marking channel as read:', error);
        }
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
        try {
          let existing = [];
          try {
            existing = await base44.entities.CommsReadState.filter({
              member_profile_id: userId,
              scope_type: 'TAB',
              scope_id: tabId,
            });
          } catch {
            existing = [];
          }

          if (!existing || existing.length === 0) {
            try {
              existing = await base44.entities.CommsReadState.filter({
                user_id: userId,
                scope_type: 'TAB',
                scope_id: tabId,
              });
            } catch {
              existing = [];
            }
          }

          if (existing[0]) {
            await base44.entities.CommsReadState.update(existing[0].id, {
              last_read_at: new Date().toISOString(),
            });
          } else {
            try {
              await base44.entities.CommsReadState.create({
                member_profile_id: userId,
                user_id: userId,
                scope_type: 'TAB',
                scope_id: tabId,
                last_read_at: new Date().toISOString(),
              });
            } catch {
              await base44.entities.CommsReadState.create({
                user_id: userId,
                scope_type: 'TAB',
                scope_id: tabId,
                last_read_at: new Date().toISOString(),
              });
            }
          }
          
          setUnreadByTab((prev) => ({ ...prev, [tabId]: 0 }));
        } catch (error) {
          console.error('Error marking tab as read:', error);
        }
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
    unreadByChannel: unreadByChannelState,
    unreadByTab,
    loading,
    markChannelRead,
    markTabRead,
    refreshUnreadCounts,
  };
}
