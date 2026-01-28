/**
 * CANONICAL DATA CONTRACT
 * Single source of truth for enums, field expectations, and validation.
 * Used by UI, seeders, and backend functions to ensure consistency.
 */

// ===== RANK HIERARCHY =====
export const RANKS = {
  PIONEER: 'Pioneer',
  FOUNDER: 'Founder',
  VOYAGER: 'Voyager',
  SCOUT: 'Scout',
  AFFILIATE: 'Affiliate',
  VAGRANT: 'Vagrant'
};

export const RANK_VALUES = {
  [RANKS.PIONEER]: 6,
  [RANKS.FOUNDER]: 5,
  [RANKS.VOYAGER]: 4,
  [RANKS.SCOUT]: 3,
  [RANKS.AFFILIATE]: 2,
  [RANKS.VAGRANT]: 1
};

export const RANK_ORDER = [
  RANKS.PIONEER,
  RANKS.FOUNDER,
  RANKS.VOYAGER,
  RANKS.SCOUT,
  RANKS.AFFILIATE,
  RANKS.VAGRANT
];

// ===== PLAYER STATUS =====
export const PLAYER_STATUS = {
  DISTRESS: 'DISTRESS',
  DOWN: 'DOWN',
  ENGAGED: 'ENGAGED',
  READY: 'READY',
  OFFLINE: 'OFFLINE'
};

export const PLAYER_STATUS_PRIORITY = {
  [PLAYER_STATUS.DISTRESS]: 0,
  [PLAYER_STATUS.DOWN]: 1,
  [PLAYER_STATUS.ENGAGED]: 2,
  [PLAYER_STATUS.READY]: 3,
  [PLAYER_STATUS.OFFLINE]: 4
};

// ===== EVENT TYPE =====
export const EVENT_TYPE = {
  CASUAL: 'casual',
  FOCUSED: 'focused'
};

// ===== INCIDENT SEVERITY =====
export const INCIDENT_SEVERITY = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
};

export const INCIDENT_SEVERITY_ORDER = [
  INCIDENT_SEVERITY.CRITICAL,
  INCIDENT_SEVERITY.HIGH,
  INCIDENT_SEVERITY.MEDIUM,
  INCIDENT_SEVERITY.LOW
];

// ===== INCIDENT STATUS =====
export const INCIDENT_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved'
};

// ===== VOICE NET DISCIPLINE =====
export const NET_DISCIPLINE = {
  CASUAL: 'casual',
  FOCUSED: 'focused'
};

export const NET_TYPE = {
  COMMAND: 'command',
  SQUAD: 'squad',
  SUPPORT: 'support',
  GENERAL: 'general'
};

// ===== VOICE NET STATUS =====
export const NET_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

// ===== FIELD EXPECTATIONS =====
/**
 * Define required and optional fields for critical entities.
 * Used for defensive validation and error diagnostics.
 */
export const ENTITY_SCHEMA = {
  Player: {
    required: ['id', 'user_id', 'rank', 'status'],
    optional: ['coordinates', 'location', 'squad_id', 'role', 'event_id'],
    status: PLAYER_STATUS
  },
  PlayerStatus: {
    required: ['id', 'user_id', 'status', 'event_id'],
    optional: ['role', 'squad_id', 'coordinates', 'location', 'updated_date'],
    status: PLAYER_STATUS,
    coordinates: { lat: 'number', lng: 'number' } // Optional but when present, must have both
  },
  Incident: {
    required: ['id', 'title', 'severity', 'status'],
    optional: ['event_id', 'location', 'coordinates', 'description', 'reported_at'],
    severity: INCIDENT_SEVERITY,
    status: INCIDENT_STATUS,
    coordinates: { lat: 'number', lng: 'number' } // Optional
  },
  Event: {
    required: ['id', 'title', 'start_time', 'event_type', 'status', 'phase'],
    optional: ['description', 'location', 'host_id', 'assigned_user_ids'],
    event_type: EVENT_TYPE
  },
  VoiceNet: {
    required: ['id', 'code', 'label', 'type', 'discipline', 'status'],
    optional: ['event_id', 'linked_squad_id', 'min_rank_to_tx', 'min_rank_to_rx', 'livekit_room_name'],
    type: NET_TYPE,
    discipline: NET_DISCIPLINE,
    status: NET_STATUS
  }
};

// ===== VALIDATION HELPERS =====
export function isValidRank(rank) {
  return Object.values(RANKS).includes(rank);
}

export function isValidPlayerStatus(status) {
  return Object.values(PLAYER_STATUS).includes(status);
}

export function isValidIncidentSeverity(severity) {
  return Object.values(INCIDENT_SEVERITY).includes(severity);
}

export function isValidEventType(type) {
  return Object.values(EVENT_TYPE).includes(type);
}

/**
 * Get diagnostic info for a missing/invalid field
 */
export function getFieldDiagnostics(entityName, fieldName, value) {
  const schema = ENTITY_SCHEMA[entityName];
  if (!schema) return `Unknown entity: ${entityName}`;
  
  if (schema.required?.includes(fieldName)) {
    return `CRITICAL: Required field "${fieldName}" is ${value === undefined ? 'missing' : 'invalid'}`;
  }
  
  if (!value) {
    return `Field "${fieldName}" not set`;
  }
  
  // Check enum validation
  if (schema.status && fieldName === 'status') {
    return `Invalid status. Expected one of: ${Object.values(PLAYER_STATUS).join(', ')}`;
  }
  if (schema.severity && fieldName === 'severity') {
    return `Invalid severity. Expected one of: ${Object.values(INCIDENT_SEVERITY).join(', ')}`;
  }
  
  return `Unexpected value for "${fieldName}": ${value}`;
}