/**
 * Voice Net Constants & Defaults
 */

import { VOICE_NET_TYPE, createVoiceNet } from '@/components/models/voiceNet';

// Default voice nets (seeded on app init)
export const DEFAULT_VOICE_NETS = [
  createVoiceNet({
    id: 'net-general',
    name: 'General',
    type: VOICE_NET_TYPE.CASUAL,
    description: 'General casual comms',
  }),
  createVoiceNet({
    id: 'net-ops',
    name: 'Ops',
    type: VOICE_NET_TYPE.CASUAL,
    description: 'Operations coordination',
  }),
  createVoiceNet({
    id: 'net-command',
    name: 'Command',
    type: VOICE_NET_TYPE.FOCUSED,
    description: 'Command net (restricted)',
  }),
  createVoiceNet({
    id: 'net-flight',
    name: 'Flight',
    type: VOICE_NET_TYPE.FOCUSED,
    description: 'Flight operations (restricted)',
  }),
  createVoiceNet({
    id: 'net-briefing-temp',
    name: 'Briefing',
    type: VOICE_NET_TYPE.FOCUSED,
    isTemporary: true,
    description: 'Temporary briefing net (open to all)',
  }),
];

// Voice session state machine
export const VOICE_CONNECTION_STATE = {
  IDLE: 'IDLE',
  JOINING: 'JOINING',
  CONNECTED: 'CONNECTED',
  ERROR: 'ERROR',
};

// Session heartbeat config (keep connection alive)
export const VOICE_SESSION_HEARTBEAT_MS = 30000; // 30 seconds
export const VOICE_SESSION_TIMEOUT_MS = 60000;   // 60 seconds (mark inactive)

// Speaking state debounce (avoid spam on PTT toggle)
export const VOICE_SPEAKING_DEBOUNCE_MS = 300;

// Presence integration: activeNetId field
export const VOICE_PRESENCE_FIELD = 'activeNetId';