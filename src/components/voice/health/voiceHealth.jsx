/**
 * Voice Health Monitoring Module
 * Tracks connection state, reconnects, errors, and latency
 */

import { useState, useEffect, useRef } from 'react';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

/**
 * Hook to track voice connection health
 */
export function useVoiceHealth(voiceNet, latency) {
  const [healthState, setHealthState] = useState({
    connectionState: VOICE_CONNECTION_STATE.IDLE,
    lastConnectedAt: null,
    reconnectCount: 0,
    lastError: null,
    latencyMs: 0,
    jitter: null,
    packetLoss: null,
  });

  const reconnectCountRef = useRef(0);
  const lastStateRef = useRef(VOICE_CONNECTION_STATE.IDLE);

  useEffect(() => {
    const currentState = voiceNet.connectionState;
    const lastState = lastStateRef.current;

    // Track successful connections
    if (currentState === VOICE_CONNECTION_STATE.CONNECTED && lastState !== VOICE_CONNECTION_STATE.CONNECTED) {
      setHealthState((prev) => ({
        ...prev,
        connectionState: currentState,
        lastConnectedAt: new Date().toISOString(),
        lastError: null,
      }));
    }
    // Track reconnection attempts
    else if (currentState === VOICE_CONNECTION_STATE.RECONNECTING && lastState === VOICE_CONNECTION_STATE.CONNECTED) {
      reconnectCountRef.current += 1;
      setHealthState((prev) => ({
        ...prev,
        connectionState: currentState,
        reconnectCount: reconnectCountRef.current,
      }));
    }
    // Track other state changes
    else if (currentState !== lastState) {
      setHealthState((prev) => ({
        ...prev,
        connectionState: currentState,
      }));
    }

    // Reset reconnect count on manual disconnect
    if (currentState === VOICE_CONNECTION_STATE.IDLE) {
      reconnectCountRef.current = 0;
      setHealthState((prev) => ({
        ...prev,
        reconnectCount: 0,
        lastError: null,
      }));
    }

    lastStateRef.current = currentState;
  }, [voiceNet.connectionState]);

  // Track errors
  useEffect(() => {
    if (voiceNet.error) {
      setHealthState((prev) => ({
        ...prev,
        lastError: voiceNet.error,
      }));
    }
  }, [voiceNet.error]);

  // Integrate latency
  useEffect(() => {
    if (latency?.latencyMs) {
      setHealthState((prev) => ({
        ...prev,
        latencyMs: latency.latencyMs,
      }));
    }
  }, [latency?.latencyMs]);

  return healthState;
}

/**
 * Format health state for display
 */
export function formatHealthState(state) {
  const labels = {
    [VOICE_CONNECTION_STATE.IDLE]: 'Idle',
    [VOICE_CONNECTION_STATE.JOINING]: 'Joining',
    [VOICE_CONNECTION_STATE.CONNECTED]: 'Connected',
    [VOICE_CONNECTION_STATE.RECONNECTING]: 'Reconnecting',
    [VOICE_CONNECTION_STATE.ERROR]: 'Error',
  };
  return labels[state] || 'Unknown';
}

/**
 * Get color class for health state
 */
export function getHealthColor(state) {
  const colors = {
    [VOICE_CONNECTION_STATE.IDLE]: 'text-zinc-500',
    [VOICE_CONNECTION_STATE.JOINING]: 'text-yellow-500',
    [VOICE_CONNECTION_STATE.CONNECTED]: 'text-green-500',
    [VOICE_CONNECTION_STATE.RECONNECTING]: 'text-orange-500',
    [VOICE_CONNECTION_STATE.ERROR]: 'text-red-500',
  };
  return colors[state] || 'text-zinc-500';
}