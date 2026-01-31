/**
 * useReadReceipts — Track who has read messages
 */

import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export function useReadReceipts() {
  const [readBy, setReadBy] = useState({});

  const markMessageAsRead = useCallback(async (messageId, userId) => {
    try {
      const message = await base44.entities.Message.filter({ id: messageId });
      if (!message[0]) return;

      const currentReadBy = message[0].read_by || [];
      if (currentReadBy.includes(userId)) return;

      await base44.entities.Message.update(messageId, {
        read_by: [...currentReadBy, userId],
      });

      setReadBy((prev) => ({
        ...prev,
        [messageId]: [...currentReadBy, userId],
      }));
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  }, []);

  const getReadUsers = useCallback((messageId) => {
    return readBy[messageId] || [];
  }, [readBy]);

  return { markMessageAsRead, getReadUsers, readBy };
}