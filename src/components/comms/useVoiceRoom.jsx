import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { buildRoomName, createCommsDebugInfo, generateSimParticipants } from './commsContract';

/**
 * Hook that manages voice room connection for both SIM and LIVE modes
 */
export function useVoiceRoom(roomName, userIdentity) {
  const [commsMode, setCommsMode] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [participants, setParticipants] = useState([]);
  const [token, setToken] = useState(null);
  const [lastError, setLastError] = useState(null);
  const connectionRef = useRef(null);

  // Fetch comms mode
  const { data: modeData } = useQuery({
    queryKey: ['commsMode'],
    queryFn: async () => {
      const modes = await base44.entities.CommsMode.list();
      return modes[0] || { mode: 'SIM', sim_config: { participant_count_range: [2, 8], activity_variance: 0.3 } };
    },
    refetchInterval: 30000
  });

  useEffect(() => {
    if (modeData) setCommsMode(modeData);
  }, [modeData]);

  // Mint token for LIVE mode
  const mintToken = useCallback(async () => {
    try {
      setLastError(null);
      const response = await base44.functions.invoke('generateLiveKitToken', {
        roomName,
        userIdentity
      });
      // Handle canonical result structure
      if (response.data?.ok) {
        setToken(response.data.data.token);
        return response.data.data.token;
      } else {
        const errMsg = response.data?.message || 'Token mint failed';
        setLastError(errMsg);
        return null;
      }
    } catch (error) {
      const errMsg = error?.response?.data?.message || error.message;
      setLastError(errMsg);
      console.error('Failed to mint token:', error);
      return null;
    }
  }, [roomName, userIdentity]);

  // Join room based on mode
  const joinRoom = useCallback(async () => {
    try {
      setLastError(null);

      if (commsMode?.mode === 'LIVE') {
        if (!token) {
          const newToken = await mintToken();
          if (!newToken) return false;
        }

        // Simulate connection establishment
        setConnectionState('connecting');
        connectionRef.current = { roomName, identity: userIdentity, token, mode: 'LIVE' };
        
        // Real LiveKit connection would happen in consuming component via LiveKitRoom
        setTimeout(() => setConnectionState('connected'), 500);
        return true;
      } else {
        // SIM mode
        setConnectionState('connecting');
        connectionRef.current = { roomName, identity: userIdentity, mode: 'SIM' };

        // Simulate participants using canonical helper
        const config = commsMode?.sim_config || { participant_count_range: [2, 8], activity_variance: 0.3 };
        const [minParticipants, maxParticipants] = config.participant_count_range;
        const count = Math.floor(Math.random() * (maxParticipants - minParticipants + 1)) + minParticipants;
        const simParticipants = generateSimParticipants(count);

        setParticipants(simParticipants);
        setTimeout(() => setConnectionState('connected'), 300);
        return true;
      }
    } catch (error) {
      setLastError(error.message);
      setConnectionState('error');
      return false;
    }
  }, [commsMode, token, roomName, userIdentity, mintToken]);

  // Leave room
  const leaveRoom = useCallback(() => {
    setConnectionState('disconnected');
    setParticipants([]);
    setToken(null);
    connectionRef.current = null;
  }, []);

  return {
    roomName,
    userIdentity,
    token,
    connectionState,
    participants,
    lastError,
    joinRoom,
    leaveRoom,
    isLiveMode: commsMode?.mode === 'LIVE',
    isConnected: connectionState === 'connected',
    debug: createCommsDebugInfo({
      roomName,
      mode: commsMode?.mode || 'SIM',
      identity: userIdentity,
      tokenMinted: !!token,
      connectionState,
      lastError,
      participantCount: participants.length
    })
  };
}