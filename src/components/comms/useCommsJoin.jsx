/**
 * useCommsJoin: React hook for canonical comms joining
 * 
 * Usage:
 * const { joinComms, leaveComms, state } = useCommsJoin();
 * 
 * // Join a voice net
 * await joinComms({
 *   eventId: 'evt123',
 *   netCode: 'COMMAND',
 *   metadata: { callsign: 'Viper' }
 * });
 * 
 * // Supports any net type
 * await joinComms({
 *   eventId: 'evt123',
 *   netId: 'net456',
 *   netType: 'text' // or 'data'
 * });
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCommsMode } from './useCommsMode';
import {
  resolveCommsJoinPayload,
  updateCommsPresence,
  clearCommsPresence,
  validateNetAccess,
  getRecommendedNet,
  createJoinContext
} from './CommsJoinService';

export function useCommsJoin() {
  const { isLive, isSim } = useCommsMode();
  const [user, setUser] = useState(null);
  const [currentContext, setCurrentContext] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastError, setLastError] = useState(null);
  const cleanupRef = useRef(null);

  // Initialize user on mount
  useEffect(() => {
    base44.auth.me().then(setUser).catch(e => console.error('[COMMS JOIN] Auth failed:', e));
  }, []);

  // Mutation: Resolve join payload
  const resolvePayloadMutation = useMutation({
    mutationFn: async (context) => {
      const validatedContext = createJoinContext({
        ...context,
        userId: user?.id,
        commsMode: isLive ? 'LIVE' : 'SIM'
      });

      // Validate net access
      if (context.netId) {
        const net = await base44.entities.VoiceNet.get(context.netId);
        const hasAccess = await validateNetAccess(user, net);
        if (!hasAccess) {
          throw new Error('Insufficient permissions to join this net');
        }
      }

      return resolveCommsJoinPayload(validatedContext);
    },
    onSuccess: (payload) => {
      setCurrentContext(payload);
      setConnectionState('connected');
      setLastError(null);
    },
    onError: (err) => {
      setLastError(err.message);
      setConnectionState('failed');
    }
  });

  // Mutation: Update presence
  const updatePresenceMutation = useMutation({
    mutationFn: async (context) => {
      return updateCommsPresence({
        userId: user?.id,
        eventId: context.eventId,
        netId: context.netId,
        netCode: context.netCode
      });
    },
    onError: (err) => {
      console.error('[COMMS JOIN] Presence update failed:', err);
    }
  });

  // Main join function
  const joinComms = useCallback(
    async (options = {}) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        setConnectionState('connecting');
        
        // Auto-select net if not specified
        const netId = options.netId || options.netCode;
        if (!netId && options.eventId) {
          const recommendedNet = await getRecommendedNet(user, options.eventId);
          if (!recommendedNet) {
            throw new Error('No accessible comms nets available');
          }
          options.netId = recommendedNet.id;
        }

        // Resolve join payload (LIVE/SIM abstraction)
        await resolvePayloadMutation.mutateAsync(options);

        // Update presence
        await updatePresenceMutation.mutateAsync(options);

      } catch (error) {
        setConnectionState('failed');
        setLastError(error.message);
        throw error;
      }
    },
    [user?.id, resolvePayloadMutation, updatePresenceMutation]
  );

  // Leave function
  const leaveComms = useCallback(async () => {
    try {
      setConnectionState('disconnected');
      
      // Clear presence
      if (user?.id) {
        cleanupRef.current = clearCommsPresence(user.id);
      }

      setCurrentContext(null);
      setLastError(null);
    } catch (error) {
      console.error('[COMMS JOIN] Leave failed:', error);
    }
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current.catch(() => {});
      }
    };
  }, []);

  return {
    // Actions
    joinComms,
    leaveComms,

    // State
    state: {
      connectionState,
      currentContext,
      lastError,
      isConnected: connectionState === 'connected',
      isConnecting: connectionState === 'connecting',
      isFailed: connectionState === 'failed'
    },

    // Meta
    isLoading: resolvePayloadMutation.isPending,
    isLiveMode: isLive,
    isSimMode: isSim,

    // Helpers
    async getRecommendedNet(eventId) {
      return getRecommendedNet(user, eventId);
    },
    
    async validateAccess(netId) {
      if (!user || !netId) return false;
      const net = await base44.entities.VoiceNet.get(netId);
      return validateNetAccess(user, net);
    }
  };
}