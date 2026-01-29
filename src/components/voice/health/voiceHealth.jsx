/**
 * Voice Health Module — Track connection state, stability, reconnects
 * Provides centralized health metrics for voice net connections.
 */

import { useState, useEffect, useRef } from 'react';

/**
 * useVoiceHealth — Monitor voice connection health
 * Tracks: connectionState, reconnectCount, lastError, latencyMs
 * 
 * @param {Object} voiceNet - Voice net context
 * @param {Object} latency - Latency hook data
 * @returns {Object} health metrics
 */
export function useVoiceHealth(voiceNet, latency) {
  const [health, setHealth] = useState({
    connectionState: 'IDLE',
    lastConnectedAt: null,
    reconnectCount: 0,
    lastError: null,
    latencyMs: 0,
    jitter: null, // Not available yet
    packetLoss: null, // Not available yet
  });

  const reconnectCountRef = useRef(0);
  const lastStateRef = useRef('IDLE');

  useEffect(() => {
    const currentState = voiceNet.connectionState;

    // Track reconnect events
    if (lastStateRef.current === 'CONNECTED' && currentState === 'RECONNECTING') {
      reconnectCountRef.current += 1;
    }

    // Update connection timestamp
    let lastConnectedAt = health.lastConnectedAt;
    if (currentState === 'CONNECTED' && lastStateRef.current !== 'CONNECTED') {
      lastConnectedAt = new Date().toISOString();
    }

    setHealth({
      connectionState: currentState,
      lastConnectedAt,
      reconnectCount: reconnectCountRef.current,
      lastError: voiceNet.error || null,
      latencyMs: latency?.latencyMs || 0,
      jitter: null,
      packetLoss: null,
    });

    lastStateRef.current = currentState;
  }, [voiceNet.connectionState, voiceNet.error, latency?.latencyMs]);

  // Reset reconnect count on manual disconnect
  useEffect(() => {
    if (voiceNet.connectionState === 'IDLE') {
      reconnectCountRef.current = 0;
    }
  }, [voiceNet.connectionState]);

  return health;
}

/**
 * Format health state for display
 */
export function formatHealthState(state) {
  const stateLabels = {
    IDLE: 'Offline',
    JOINING: 'Connecting...',
    CONNECTED: 'Connected',
    RECONNECTING: 'Reconnecting...',
    ERROR: 'Error',
  };
  return stateLabels[state] || state;
}

/**
 * Get health color class for UI
 */
export function getHealthColor(state) {
  const colorMap = {
    IDLE: 'text-zinc-500',
    JOINING: 'text-yellow-500',
    CONNECTED: 'text-green-500',
    RECONNECTING: 'text-orange-500',
    ERROR: 'text-red-500',
  };
  return colorMap[state] || 'text-zinc-500';
}