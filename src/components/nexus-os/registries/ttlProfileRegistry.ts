/**
 * TTL Profile Registry
 *
 * Default TTL values per CQB variant and event type.
 * These are defaults only; downstream systems may override with explicit policy.
 */

import type { CqbEventType } from '../schemas/coreSchemas';
import type { ControlSignalType } from '../schemas/mapSchemas';
import type { IntelStratum, IntelType } from '../schemas/intelSchemas';
import type { OperationPosture, OperationStatus } from '../schemas/opSchemas';

export type TTLProfileId = `TTL-CQB-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;

export interface TTLProfileDefinition {
  id: TTLProfileId;
  variantId: `CQB-0${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  defaultsByEventType: Partial<Record<CqbEventType, number>>;
  notes: string;
}

const CANON_BREVITY_TTL_DEFAULTS: Partial<Record<CqbEventType, number>> = {
  KISS: 120,
  ROGER: 90,
  WILCO: 120,
  STAND_BY: 120,
  SAY_AGAIN: 120,
  CLEAR_COMMS: 180,
  ON_ME: 150,
  MOVE_OUT: 240,
  SET_SECURITY: 240,
  HOLD: 180,
  SET: 180,
  GREEN: 180,
  SELF_CHECK: 600,
  WEAPON_DRY: 600,
  RELOADING: 300,
  CROSSING: 120,
  CEASE_FIRE: 300,
  CHECK_FIRE: 300,
};

export const TTLProfileRegistry: Readonly<TTLProfileDefinition[]> = [
  {
    id: 'TTL-CQB-01',
    variantId: 'CQB-01',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, STACK: 30, ENTRY: 25, CLEAR: 45, CONTACT: 20, HOLD: 180, OBJECTIVE_SECURED: 120, DOWNED: 40, REVIVE: 50 },
    notes: 'Entry-and-clear events decay quickly except secured objective outcomes.',
  },
  {
    id: 'TTL-CQB-02',
    variantId: 'CQB-02',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, BREACH: 20, ENTRY: 20, CONTACT: 15, SUPPRESS: 20, CLEAR: 30, EXTRACT: 45, THREAT_UPDATE: 30, STACK: 20 },
    notes: 'Boarding telemetry is volatile; short-lived truth prevents stale compartment assumptions.',
  },
  {
    id: 'TTL-CQB-03',
    variantId: 'CQB-03',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, CONTACT: 20, HOLD: 240, SUPPRESS: 25, THREAT_UPDATE: 30, DOWNED: 35, REVIVE: 45, RETREAT: 30 },
    notes: 'Defensive holds keep longer persistence than contact spikes.',
  },
  {
    id: 'TTL-CQB-04',
    variantId: 'CQB-04',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, ENTRY: 20, CONTACT: 20, HOLD: 240, EXTRACT: 60, FLANK: 25, DOWNED: 30, REVIVE: 45, OBJECTIVE_SECURED: 120 },
    notes: 'Extraction intents persist long enough for handoff and confirmation loops.',
  },
  {
    id: 'TTL-CQB-05',
    variantId: 'CQB-05',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, STACK: 30, BREACH: 25, ENTRY: 20, CONTACT: 15, INTEL_MARKER: 40, THREAT_UPDATE: 35, HOLD: 180 },
    notes: 'Low-visibility confidence decays quickly; intel markers retain medium persistence.',
  },
  {
    id: 'TTL-CQB-06',
    variantId: 'CQB-06',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, STACK: 25, BREACH: 20, ENTRY: 20, FLANK: 25, SUPPRESS: 20, OBJECTIVE_SECURED: 120, THREAT_UPDATE: 30 },
    notes: 'Synchronized actions use tight TTL to avoid cross-team desync.',
  },
  {
    id: 'TTL-CQB-07',
    variantId: 'CQB-07',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, CONTACT: 15, SUPPRESS: 20, RETREAT: 25, HOLD: 180, ENTRY: 20, CLEAR: 30, EXTRACT: 45, DOWNED: 35 },
    notes: 'Counter-boarding states rotate rapidly during compartment recapture.',
  },
  {
    id: 'TTL-CQB-08',
    variantId: 'CQB-08',
    defaultsByEventType: { ...CANON_BREVITY_TTL_DEFAULTS, STACK: 60, ENTRY: 45, CLEAR: 60, HOLD: 180, THREAT_UPDATE: 40, INTEL_MARKER: 60, OBJECTIVE_SECURED: 180 },
    notes: 'Training lane uses longer TTL for coaching replay and after-action review.',
  },
];

export const TTLProfileRegistryById: Readonly<Record<TTLProfileId, TTLProfileDefinition>> = Object.freeze(
  TTLProfileRegistry.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<TTLProfileId, TTLProfileDefinition>)
);

export function getTTLProfile(profileId: string): TTLProfileDefinition | null {
  return TTLProfileRegistryById[profileId as TTLProfileId] || null;
}

export function getDefaultTTLSeconds(profileId: string, eventType: CqbEventType, fallbackSeconds = 60): number {
  const profile = getTTLProfile(profileId);
  if (!profile) return fallbackSeconds;
  return profile.defaultsByEventType[eventType] ?? fallbackSeconds;
}

/**
 * Control-zone TTL defaults are separate from CQB event TTL profiles.
 * They shape decay for probabilistic map influence signals.
 */
export type ControlZoneTTLProfileId = 'TTL-CONTROL-ZONE-DEFAULT';

export interface ControlZoneTTLProfileDefinition {
  id: ControlZoneTTLProfileId;
  defaultsBySignalType: Partial<Record<ControlSignalType, number>>;
  notes: string;
}

export const CONTROL_ZONE_DEFAULT_TTL_PROFILE_ID: ControlZoneTTLProfileId = 'TTL-CONTROL-ZONE-DEFAULT';

export const ControlZoneTTLProfileRegistry: Readonly<Record<ControlZoneTTLProfileId, ControlZoneTTLProfileDefinition>> = {
  'TTL-CONTROL-ZONE-DEFAULT': {
    id: 'TTL-CONTROL-ZONE-DEFAULT',
    defaultsBySignalType: {
      PRESENCE_DECLARED: 360,
      CQB_EVENT: 240,
      LOGISTICS_FLOW: 600,
      INTEL_NOTE: 480,
      COMMAND_ENDORSEMENT: 720,
      OTHER: 300,
    },
    notes: 'Control claims decay by default to prevent stale certainty and omniscient map drift.',
  },
};

export function getControlSignalDefaultTTLSeconds(
  profileId: string,
  signalType: ControlSignalType,
  fallbackSeconds = 240
): number {
  const profile = ControlZoneTTLProfileRegistry[profileId as ControlZoneTTLProfileId];
  if (!profile) return fallbackSeconds;
  return profile.defaultsBySignalType[signalType] ?? fallbackSeconds;
}

/**
 * Intel-object TTL defaults are stratum-aware and type-aware.
 * Higher governance strata hold context longer, but still decay.
 */
export type IntelTTLProfileId =
  | 'TTL-INTEL-PERSONAL'
  | 'TTL-INTEL-SHARED'
  | 'TTL-INTEL-OPERATIONAL'
  | 'TTL-INTEL-COMMAND';

export interface IntelTTLProfileDefinition {
  id: IntelTTLProfileId;
  stratum: IntelStratum;
  defaultsByType: Partial<Record<IntelType, number>>;
  notes: string;
}

export const IntelTTLProfileRegistry: Readonly<Record<IntelTTLProfileId, IntelTTLProfileDefinition>> = {
  'TTL-INTEL-PERSONAL': {
    id: 'TTL-INTEL-PERSONAL',
    stratum: 'PERSONAL',
    defaultsByType: {
      PIN: 900,
      MARKER: 600,
      NOTE: 1200,
    },
    notes: 'Personal hypotheses decay quickly unless promoted.',
  },
  'TTL-INTEL-SHARED': {
    id: 'TTL-INTEL-SHARED',
    stratum: 'SHARED_COMMONS',
    defaultsByType: {
      PIN: 1800,
      MARKER: 1200,
      NOTE: 2400,
    },
    notes: 'Shared commons intel persists moderately for team synchronization.',
  },
  'TTL-INTEL-OPERATIONAL': {
    id: 'TTL-INTEL-OPERATIONAL',
    stratum: 'OPERATIONAL',
    defaultsByType: {
      PIN: 2700,
      MARKER: 1800,
      NOTE: 3600,
    },
    notes: 'Operational intel should outlive short tactical bursts but still decay.',
  },
  'TTL-INTEL-COMMAND': {
    id: 'TTL-INTEL-COMMAND',
    stratum: 'COMMAND_ASSESSED',
    defaultsByType: {
      PIN: 3600,
      MARKER: 2400,
      NOTE: 5400,
    },
    notes: 'Command-assessed intel has the longest default persistence window.',
  },
};

const DEFAULT_INTEL_TTL_PROFILE_BY_STRATUM: Readonly<Record<IntelStratum, IntelTTLProfileId>> = {
  PERSONAL: 'TTL-INTEL-PERSONAL',
  SHARED_COMMONS: 'TTL-INTEL-SHARED',
  OPERATIONAL: 'TTL-INTEL-OPERATIONAL',
  COMMAND_ASSESSED: 'TTL-INTEL-COMMAND',
};

export function getDefaultIntelTTLProfileIdForStratum(stratum: IntelStratum): IntelTTLProfileId {
  return DEFAULT_INTEL_TTL_PROFILE_BY_STRATUM[stratum];
}

export function getDefaultIntelTTLSeconds(
  profileId: string,
  intelType: IntelType,
  fallbackSeconds = 1200
): number {
  const profile = IntelTTLProfileRegistry[profileId as IntelTTLProfileId];
  if (!profile) return fallbackSeconds;
  return profile.defaultsByType[intelType] ?? fallbackSeconds;
}

/**
 * Operation freshness TTL profiles for posture-aware status recency display.
 */
export type OperationTTLProfileId = 'TTL-OP-FOCUSED' | 'TTL-OP-CASUAL';

export interface OperationTTLProfileDefinition {
  id: OperationTTLProfileId;
  posture: OperationPosture;
  defaultsByStatus: Partial<Record<OperationStatus, number>>;
  notes: string;
}

export const OperationTTLProfileRegistry: Readonly<Record<OperationTTLProfileId, OperationTTLProfileDefinition>> = {
  'TTL-OP-FOCUSED': {
    id: 'TTL-OP-FOCUSED',
    posture: 'FOCUSED',
    defaultsByStatus: {
      PLANNING: 1800,
      ACTIVE: 900,
      WRAPPING: 1800,
      ARCHIVED: 3600,
    },
    notes: 'Focused ops require faster freshness checks while active.',
  },
  'TTL-OP-CASUAL': {
    id: 'TTL-OP-CASUAL',
    posture: 'CASUAL',
    defaultsByStatus: {
      PLANNING: 3600,
      ACTIVE: 2400,
      WRAPPING: 3600,
      ARCHIVED: 7200,
    },
    notes: 'Casual ops allow longer recency windows by default.',
  },
};

export function getOperationTTLSeconds(
  profileId: string,
  status: OperationStatus,
  fallbackSeconds = 2400
): number {
  const profile = OperationTTLProfileRegistry[profileId as OperationTTLProfileId];
  if (!profile) return fallbackSeconds;
  return profile.defaultsByStatus[status] ?? fallbackSeconds;
}
