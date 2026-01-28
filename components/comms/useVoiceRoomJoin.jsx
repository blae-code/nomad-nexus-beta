import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCommsMode } from './useCommsMode';
import { generateSimulatedParticipants } from './commsModeSimulator';

export function useVoiceRoomJoin() {
  const { isLive, isSim, simConfig } = useCommsMode();
  const [roomToken, setRoomToken] = useState(null);
  const [roomUrl, setRoomUrl] = useState(null);
  const [roomName, setRoomName] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastError, setLastError] = useState(null);
  const simulationIntervalRef = useRef(null);

  // LIVE mode: Generate actual token from backend
  const joinLiveRoom = useMutation({
    mutationFn: async ({ eventId, netIds }) => {
      const res = await base44.functions.invoke('generateLiveKitToken', {
        eventId,
        netIds
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.tokens && Object.keys(data.tokens).length > 0) {
        const firstNetId = Object.keys(data.tokens)[0];
        const token = data.tokens[firstNetId];
        setRoomToken(token);
        setRoomUrl(data.url);
        setConnectionState('connecting');
        setLastError(null);
      }
    },
    onError: (err) => {
      setLastError(err.message);
      setConnectionState('failed');
    }
  });

  // SIM mode: Generate simulated room experience
  const joinSimRoom = useCallback((netCode) => {
    setConnectionState('connecting');
    setRoomName(`sim-${netCode}`);
    
    // Simulate connection delay
    setTimeout(() => {
      setParticipants(generateSimulatedParticipants(netCode, simConfig));
      setConnectionState('connected');
      setLastError(null);
      
      // Simulate participant changes every 3-8 seconds
      simulationIntervalRef.current = setInterval(() => {
        setParticipants(prev => {
          const updated = [...prev];
          if (Math.random() < 0.3) { // 30% chance of change
            if (Math.random() < 0.5) {
              // Someone leaves
              updated.pop();
            } else if (updated.length < 8) {
              // Someone joins
              updated.push({
                identity: `sim-${netCode}-${Date.now()}`,
                name: `Participant ${updated.length + 1}`,
                joinedAt: new Date(),
                isLocal: false,
                lastActivityAt: new Date(),
                isMuted: Math.random() < 0.2,
                isSpeaking: Math.random() < 0.3
              });
            }
          }
          // Update speaking status
          return updated.map(p => ({
            ...p,
            isSpeaking: Math.random() < 0.3
          }));
        });
      }, 3000 + Math.random() * 5000);
    }, 800); // 800ms simulated connection delay
  }, [simConfig]);

  // Unified join function
  const joinRoom = useCallback(({ eventId, netIds, netCode }) => {
    if (isLive && eventId && netIds?.length > 0) {
      joinLiveRoom.mutate({ eventId, netIds });
    } else if (isSim && netCode) {
      joinSimRoom(netCode);
    }
  }, [isLive, isSim, joinLiveRoom, joinSimRoom]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  const leaveRoom = useCallback(() => {
    setConnectionState('disconnected');
    setRoomToken(null);
    setRoomUrl(null);
    setParticipants([]);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
  }, []);

  return {
    joinRoom,
    leaveRoom,
    roomToken,
    roomUrl,
    roomName,
    participants,
    connectionState, // 'disconnected' | 'connecting' | 'connected' | 'failed'
    lastError,
    isLiveMode: isLive,
    isSimMode: isSim,
    isLoading: joinLiveRoom.isPending
  };
}