import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';

const TYPING_TIMEOUT = 3000; // 3 seconds
const TYPING_DEBOUNCE = 500; // 0.5 seconds

/**
 * Hook to manage typing indicators for a channel
 */
export const useTypingIndicator = (channelId, userId) => {
  const [typingUsers, setTypingUsers] = useState([]);
  const typingTimeoutRef = useRef(null);
  const lastTypingSignalRef = useRef(0);

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

  // Signal that user is typing
  const signalTyping = useCallback(async () => {
    if (!channelId || !userId) return;

    const now = Date.now();
    if (now - lastTypingSignalRef.current < TYPING_DEBOUNCE) return;

    lastTypingSignalRef.current = now;

    try {
      await invokeMemberFunction('updateUserPresence', {
        status: 'online',
        typingInChannel: channelId,
      });

      // Clear typing indicator after timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        invokeMemberFunction('updateUserPresence', {
          status: 'online',
          typingInChannel: null,
        }).catch(() => {});
      }, TYPING_TIMEOUT);
    } catch (error) {
      // Silently fail - typing indicators are non-critical
    }
  }, [channelId, userId]);

  // Clear typing indicator
  const clearTyping = useCallback(async () => {
    if (!userId) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    try {
      await invokeMemberFunction('updateUserPresence', {
        status: 'online',
        typingInChannel: null,
      });
    } catch (error) {
      // Silently fail
    }
  }, [userId]);

  return {
    typingUsers: typingUsers.map(u => u.user_id),
    signalTyping,
    clearTyping,
  };
};
