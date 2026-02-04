import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_DEBOUNCE = 500; // 0.5 seconds

/**
 * Hook to manage typing indicators for a channel
 */
export const useTypingIndicator = (channelId, userId) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const lastTypingSignalRef = useRef(0);
  const presenceRecordIdRef = useRef(null);

  // Subscribe to typing events
  useEffect(() => {
    if (!channelId) return;

    const channel = `typing:${channelId}`;
    
    // Subscribe to real-time typing events
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      if (event.data?.typing_in_channel === channelId) {
        const typingUserId = event.data.member_profile_id || event.data.user_id;
        
        if (typingUserId !== userId) {
          setTypingUsers(prev => {
            if (!prev.find(u => u.user_id === typingUserId)) {
              return [...prev, { user_id: typingUserId, timestamp: Date.now() }];
            }
            return prev.map(u => 
              u.user_id === typingUserId 
                ? { ...u, timestamp: Date.now() }
                : u
            );
          });
        }
      }
    });

    // Cleanup expired typing indicators
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => 
        prev.filter(u => now - u.timestamp < TYPING_TIMEOUT)
      );
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [channelId, userId]);

  const resolvePresenceRecordId = useCallback(async () => {
    if (!userId) return null;
    if (presenceRecordIdRef.current) return presenceRecordIdRef.current;

    let records = [];
    try {
      records = await base44.entities.UserPresence.filter({ member_profile_id: userId });
    } catch (error) {
      records = [];
    }

    if (!records || records.length === 0) {
      try {
        records = await base44.entities.UserPresence.filter({ user_id: userId });
      } catch (error) {
        records = [];
      }
    }

    if (records && records.length > 0) {
      presenceRecordIdRef.current = records[0].id;
      return records[0].id;
    }

    return null;
  }, [userId]);

  // Signal that user is typing
  const signalTyping = useCallback(async () => {
    if (!channelId || !userId) return;

    const now = Date.now();
    if (now - lastTypingSignalRef.current < TYPING_DEBOUNCE) return;

    lastTypingSignalRef.current = now;

    try {
      let recordId = await resolvePresenceRecordId();
      if (!recordId) {
        const created = await base44.entities.UserPresence.create({
          member_profile_id: userId,
          typing_in_channel: channelId,
          last_activity: new Date().toISOString(),
        });
        recordId = created?.id || null;
        presenceRecordIdRef.current = recordId;
      } else {
        await base44.entities.UserPresence.update(recordId, {
          typing_in_channel: channelId,
          last_activity: new Date().toISOString(),
        });
      }

      // Clear typing indicator after timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (presenceRecordIdRef.current) {
          base44.entities.UserPresence.update(presenceRecordIdRef.current, {
            typing_in_channel: null,
          });
        }
      }, TYPING_TIMEOUT);
    } catch (error) {
      // Silently fail - typing indicators are non-critical
    }
  }, [channelId, userId, resolvePresenceRecordId]);

  // Clear typing indicator
  const clearTyping = useCallback(async () => {
    if (!userId) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    try {
      const recordId = await resolvePresenceRecordId();
      if (recordId) {
        await base44.entities.UserPresence.update(recordId, {
          typing_in_channel: null,
        });
      }
    } catch (error) {
      // Silently fail
    }
  }, [userId, resolvePresenceRecordId]);

  return {
    typingUsers: typingUsers.map(u => u.user_id),
    signalTyping,
    clearTyping,
  };
};
