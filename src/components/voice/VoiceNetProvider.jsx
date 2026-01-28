/**
 * VoiceNetProvider — State machine for voice net connections
 * Manages: activeNet, connectionState, participants, error
 * Provides: joinNet, leaveNet, togglePTT, setMicEnabled
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { DEFAULT_VOICE_NETS, VOICE_CONNECTION_STATE, VOICE_SESSION_HEARTBEAT_MS, VOICE_SPEAKING_DEBOUNCE_MS } from '@/components/constants/voiceNet';
import MockVoiceTransport from './transport/MockVoiceTransport';
import * as voiceService from '@/components/services/voiceService';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';

const VoiceNetContext = createContext(null);

export function VoiceNetProvider({ children }) {
  const [activeNetId, setActiveNetId] = useState(null);
  const [connectionState, setConnectionState] = useState(VOICE_CONNECTION_STATE.IDLE);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [pttActive, setPTTActive] = useState(false);

  const transportRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const sessionIdRef = useRef(null);
  const speakingTimeoutRef = useRef(null);

  // Initialize transport
  useEffect(() => {
    transportRef.current = new MockVoiceTransport();

    // Setup event handlers
    transportRef.current.on('connected', () => {
      setConnectionState(VOICE_CONNECTION_STATE.CONNECTED);
      setError(null);
    });

    transportRef.current.on('disconnected', () => {
      setConnectionState(VOICE_CONNECTION_STATE.IDLE);
      setActiveNetId(null);
      setParticipants([]);
    });

    transportRef.current.on('participant-joined', ({ userId, callsign, clientId }) => {
      setParticipants((prev) => [
        ...prev,
        { userId, callsign, clientId, isSpeaking: false },
      ]);
    });

    transportRef.current.on('participant-left', ({ userId }) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== userId));
    });

    transportRef.current.on('speaking-changed', ({ userId, isSpeaking }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === userId ? { ...p, isSpeaking } : p
        )
      );
    });

    transportRef.current.on('error', ({ message }) => {
      setError(message);
      setConnectionState(VOICE_CONNECTION_STATE.ERROR);
    });

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, []);

  const joinNet = useCallback(async (netId, user) => {
    // Find the net
    const net = DEFAULT_VOICE_NETS.find((n) => n.id === netId);
    if (!net) {
      setError('Net not found');
      return;
    }

    // Check access
    if (!canJoinVoiceNet(user, net)) {
      setError('Access denied: insufficient membership');
      return;
    }

    // Prevent double-join
    if (activeNetId) {
      await leaveNet();
    }

    setConnectionState(VOICE_CONNECTION_STATE.JOINING);
    setError(null);

    try {
      // Connect transport
      await transportRef.current.connect({
        token: 'mock-token', // MockVoiceTransport doesn't use this
        url: 'mock://url',
        netId,
        user,
      });

      setActiveNetId(netId);

      // Create voice session
      const session = await voiceService.addVoiceSession(
        netId,
        user.id,
        user.callsign || 'Unknown',
        `client-${user.id}-${Date.now()}`
      );
      sessionIdRef.current = session.id;

      // Start heartbeat
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = setInterval(async () => {
        if (sessionIdRef.current) {
          await voiceService.updateSessionHeartbeat(sessionIdRef.current);
        }
      }, VOICE_SESSION_HEARTBEAT_MS);

      // Load initial participants
      const sessions = await voiceService.getNetSessions(netId);
      setParticipants(
        sessions.map((s) => ({
          userId: s.userId,
          callsign: s.callsign,
          clientId: s.clientId,
          isSpeaking: s.isSpeaking,
        }))
      );
    } catch (err) {
      setError(err.message);
      setConnectionState(VOICE_CONNECTION_STATE.ERROR);
    }
  }, [activeNetId]);

  const leaveNet = useCallback(async () => {
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);

    if (sessionIdRef.current) {
      await voiceService.removeVoiceSession(sessionIdRef.current);
      sessionIdRef.current = null;
    }

    await transportRef.current.disconnect();
    setConnectionState(VOICE_CONNECTION_STATE.IDLE);
    setActiveNetId(null);
    setParticipants([]);
    setError(null);
    setPTTActive(false);
  }, []);

  const togglePTT = useCallback(() => {
    const newActive = !pttActive;
    setPTTActive(newActive);
    transportRef.current.setPTTActive(newActive);

    // Debounce session update
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    speakingTimeoutRef.current = setTimeout(async () => {
      if (sessionIdRef.current) {
        await voiceService.updateSessionSpeaking(sessionIdRef.current, newActive);
      }
    }, VOICE_SPEAKING_DEBOUNCE_MS);
  }, [pttActive]);

  const handleSetMicEnabled = useCallback((enabled) => {
    setMicEnabled(enabled);
    transportRef.current.setMicEnabled(enabled);
  }, []);

  const value = {
    activeNetId,
    connectionState,
    participants,
    error,
    micEnabled,
    pttActive,
    joinNet,
    leaveNet,
    togglePTT,
    setMicEnabled: handleSetMicEnabled,
    voiceNets: DEFAULT_VOICE_NETS,
  };

  return (
    <VoiceNetContext.Provider value={value}>
      {children}
    </VoiceNetContext.Provider>
  );
}

export function useVoiceNet() {
  const context = useContext(VoiceNetContext);
  if (!context) {
    throw new Error('useVoiceNet must be used within VoiceNetProvider');
  }
  return context;
}