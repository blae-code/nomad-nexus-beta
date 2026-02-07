/**
 * VoiceNetProvider — State machine for voice net connections
 * Manages: activeNet, connectionState, participants, error
 * Provides: joinNet, leaveNet, togglePTT, setMicEnabled
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { DEFAULT_VOICE_NETS, VOICE_CONNECTION_STATE, VOICE_SESSION_HEARTBEAT_MS, VOICE_SPEAKING_DEBOUNCE_MS } from '@/components/constants/voiceNet';
import MockVoiceTransport from './transport/MockVoiceTransport';
import { LiveKitTransport } from './transport/LiveKitTransport';
import * as voiceService from '@/components/services/voiceService';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { useFocusedConfirmation } from '@/components/voice/FocusedNetConfirmation';
import { base44 } from '@/api/base44Client';

const VoiceNetContext = createContext(null);

export function VoiceNetProvider({ children }) {
  const [activeNetId, setActiveNetId] = useState(null);
  const [connectionState, setConnectionState] = useState(VOICE_CONNECTION_STATE.IDLE);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [pttActive, setPTTActive] = useState(false);
  const [voiceNets, setVoiceNets] = useState(DEFAULT_VOICE_NETS);

  const transportRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const sessionIdRef = useRef(null);
  const speakingTimeoutRef = useRef(null);
  const liveKitTokenRef = useRef(null);
  const pendingJoinRef = useRef(null);
  const [useRealTransport, setUseRealTransport] = useState(false);
  
  const focusedConfirmation = useFocusedConfirmation();

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

    transportRef.current.on('reconnecting', () => {
      setConnectionState(VOICE_CONNECTION_STATE.RECONNECTING);
    });

    transportRef.current.on('reconnected', () => {
      setConnectionState(VOICE_CONNECTION_STATE.CONNECTED);
      setError(null);
    });

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const loadVoiceNets = async () => {
      try {
        const nets = await base44.entities.VoiceNet.list('-created_date', 100);
        if (Array.isArray(nets) && nets.length > 0) {
          setVoiceNets(nets);
          return;
        }
      } catch (error) {
        console.debug('[VoiceNetProvider] VoiceNet list failed:', error?.message);
      }
      setVoiceNets(DEFAULT_VOICE_NETS);
    };

    loadVoiceNets();

    if (!base44.entities.VoiceNet?.subscribe) return;
    const unsubscribe = base44.entities.VoiceNet.subscribe((event) => {
      setVoiceNets((prev) => {
        if (event.type === 'create') return [...prev, event.data];
        if (event.type === 'update') return prev.map((n) => (n.id === event.id ? event.data : n));
        if (event.type === 'delete') return prev.filter((n) => n.id !== event.id);
        return prev;
      });
    });

    return () => unsubscribe?.();
  }, []);

  const resolveNet = useCallback((rawNetId) => {
    const match = String(rawNetId || '').trim().toLowerCase();
    if (!match) return null;
    const allNets = [...(Array.isArray(voiceNets) ? voiceNets : []), ...DEFAULT_VOICE_NETS];
    return allNets.find((net) => {
      const id = String(net?.id || '').trim().toLowerCase();
      const code = String(net?.code || '').trim().toLowerCase();
      return id === match || code === match;
    }) || null;
  }, [voiceNets]);

  const joinNet = useCallback(async (netId, user, options = {}) => {
    const { skipConfirmation = false } = options;
    // Find the net
    const net = resolveNet(netId);
    if (!net) {
      setError('Net not found');
      return { success: false, requiresConfirmation: false };
    }

    // Check if focused confirmation needed
    if (!skipConfirmation && focusedConfirmation.checkNeedConfirmation(net)) {
      pendingJoinRef.current = { netId: net.id || net.code || netId, user };
      focusedConfirmation.requestConfirmation(net.id || net.code || netId);
      return { success: false, requiresConfirmation: true }; // Wait for confirmation
    }

    // Check access
    if (!canJoinVoiceNet(user, net)) {
      setError('Access denied: insufficient membership');
      return { success: false, requiresConfirmation: false };
    }

    // Prevent double-join
    if (activeNetId) {
      await leaveNet();
    }

    setConnectionState(VOICE_CONNECTION_STATE.JOINING);
    setError(null);

    try {
      let shouldUseLiveKit = false;
      let liveKitPayload = null;

      // Try to mint LiveKit token; fallback to mock if unavailable
      try {
        const tokenResp = await invokeMemberFunction('mintVoiceToken', {
          netId: net.id || net.code || netId,
          userId: user.id,
          callsign: user.callsign || 'Unknown',
          clientId: `client-${user.id}-${Date.now()}`,
          netType: net.type,
        });

        if (tokenResp?.data?.error === 'VOICE_NOT_CONFIGURED') {
          shouldUseLiveKit = false;
        } else if (tokenResp?.data?.token && tokenResp?.data?.url) {
          liveKitPayload = tokenResp.data;
          liveKitTokenRef.current = tokenResp.data;
          transportRef.current = new LiveKitTransport();
          shouldUseLiveKit = true;
        }
      } catch (tokenErr) {
        console.warn('Token mint failed; using mock:', tokenErr);
        shouldUseLiveKit = false;
      }

      setUseRealTransport(shouldUseLiveKit);

      // Connect transport
      const connectOptions = shouldUseLiveKit && liveKitPayload
        ? {
            token: liveKitPayload.token,
            url: liveKitPayload.url,
            netId: net.id || net.code || netId,
            user,
          }
        : {
            token: 'mock-token',
            url: 'mock://url',
            netId: net.id || net.code || netId,
            user,
          };

      await transportRef.current.connect(connectOptions);
      setActiveNetId(net.id || net.code || netId);

      // Create voice session
      const sessionNetId = net.id || net.code || netId;
      const session = await voiceService.addVoiceSession(
        sessionNetId,
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
      const sessions = await voiceService.getNetSessions(sessionNetId);
      setParticipants(
        sessions.map((s) => ({
          userId: s.userId,
          callsign: s.callsign,
          clientId: s.clientId,
          isSpeaking: s.isSpeaking,
        }))
      );
      pendingJoinRef.current = null;
      return { success: true, requiresConfirmation: false };
    } catch (err) {
      setError(err.message);
      setConnectionState(VOICE_CONNECTION_STATE.ERROR);
      return { success: false, requiresConfirmation: false, error: err.message };
    }
  }, [activeNetId, focusedConfirmation, resolveNet]);

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
    pendingJoinRef.current = null;
  }, []);

  const confirmFocusedJoin = useCallback(async () => {
    const pending = pendingJoinRef.current;
    if (!pending) return { success: false };
    focusedConfirmation.confirm();
    return joinNet(pending.netId, pending.user, { skipConfirmation: true });
  }, [focusedConfirmation, joinNet]);

  const cancelFocusedJoin = useCallback(() => {
    pendingJoinRef.current = null;
    focusedConfirmation.cancel();
  }, [focusedConfirmation]);

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
    confirmFocusedJoin,
    cancelFocusedJoin,
    usingLiveKit: useRealTransport,
    voiceNets,
    focusedConfirmation,
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
