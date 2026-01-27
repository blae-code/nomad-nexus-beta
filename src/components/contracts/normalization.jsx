/**
 * NORMALIZATION LAYER
 * Converts messy data at the edges (API responses, seeded data, user input)
 * to canonical forms expected by UI and business logic.
 */

import {
  PLAYER_STATUS,
  INCIDENT_SEVERITY,
  INCIDENT_STATUS,
  RANKS,
  EVENT_TYPE,
  NET_DISCIPLINE,
  NET_TYPE,
  NET_STATUS
} from './dataContract';

// ===== STATUS NORMALIZATION =====
/**
 * Normalize player status: convert casing, map legacy values
 * Input: 'distress', 'DISTRESS', 'down', 'DOWN', etc.
 * Output: 'DISTRESS', 'DOWN', 'ENGAGED', 'READY', 'OFFLINE'
 */
export function normalizePlayerStatus(status) {
  if (!status) return PLAYER_STATUS.OFFLINE;
  
  const upper = String(status).toUpperCase();
  return Object.values(PLAYER_STATUS).includes(upper) ? upper : PLAYER_STATUS.OFFLINE;
}

/**
 * Normalize incident severity: uppercase + map legacy values
 */
export function normalizeIncidentSeverity(severity) {
  if (!severity) return INCIDENT_SEVERITY.LOW;
  
  const upper = String(severity).toUpperCase();
  return Object.values(INCIDENT_SEVERITY).includes(upper) ? upper : INCIDENT_SEVERITY.LOW;
}

/**
 * Normalize incident status: lowercase + map legacy values
 */
export function normalizeIncidentStatus(status) {
  if (!status) return INCIDENT_STATUS.OPEN;
  
  const lower = String(status).toLowerCase();
  return Object.values(INCIDENT_STATUS).includes(lower) ? lower : INCIDENT_STATUS.OPEN;
}

/**
 * Normalize rank: ensure valid rank or fallback to VAGRANT
 */
export function normalizeRank(rank) {
  if (!rank) return RANKS.VAGRANT;
  
  // Check exact match
  if (Object.values(RANKS).includes(rank)) {
    return rank;
  }
  
  // Try case-insensitive
  const normalized = Object.values(RANKS).find(
    r => r.toLowerCase() === String(rank).toLowerCase()
  );
  return normalized || RANKS.VAGRANT;
}

/**
 * Normalize event type: lowercase
 */
export function normalizeEventType(type) {
  if (!type) return EVENT_TYPE.CASUAL;
  
  const lower = String(type).toLowerCase();
  return Object.values(EVENT_TYPE).includes(lower) ? lower : EVENT_TYPE.CASUAL;
}

/**
 * Normalize net discipline
 */
export function normalizeNetDiscipline(discipline) {
  if (!discipline) return NET_DISCIPLINE.CASUAL;
  
  const lower = String(discipline).toLowerCase();
  return Object.values(NET_DISCIPLINE).includes(lower) ? lower : NET_DISCIPLINE.CASUAL;
}

/**
 * Normalize net type
 */
export function normalizeNetType(type) {
  if (!type) return NET_TYPE.GENERAL;
  
  const lower = String(type).toLowerCase();
  return Object.values(NET_TYPE).includes(lower) ? lower : NET_TYPE.GENERAL;
}

/**
 * Normalize net status
 */
export function normalizeNetStatus(status) {
  if (!status) return NET_STATUS.ACTIVE;
  
  const lower = String(status).toLowerCase();
  return Object.values(NET_STATUS).includes(lower) ? lower : NET_STATUS.ACTIVE;
}

// ===== LOCATION NORMALIZATION =====
/**
 * Ensure coordinates object has both lat and lng
 * Input: {lat: X, lng: Y} or {lat: X} or null
 * Output: {lat: number, lng: number} or null
 */
export function normalizeCoordinates(coords) {
  if (!coords) return null;
  
  // Already has both required fields
  if (coords.lat !== undefined && coords.lng !== undefined) {
    return {
      lat: Number(coords.lat) || 0,
      lng: Number(coords.lng) || 0
    };
  }
  
  // Missing one or both - invalid
  return null;
}

/**
 * Normalize location string - trim + fallback
 */
export function normalizeLocation(location) {
  if (!location) return 'Unknown Location';
  
  return String(location).trim() || 'Unknown Location';
}

/**
 * Ensure an entity has location info in a consistent format.
 * Prioritize: coordinates > location string > fallback
 */
export function ensureLocationShape(entity) {
  if (!entity) return {};
  
  const normalized = { ...entity };
  
  // Normalize coordinates if present
  if (entity.coordinates) {
    normalized.coordinates = normalizeCoordinates(entity.coordinates);
  }
  
  // Normalize location string
  if (entity.location) {
    normalized.location = normalizeLocation(entity.location);
  }
  
  // Fallback: if neither coordinates nor location, add placeholder
  if (!normalized.coordinates && !normalized.location) {
    normalized.location = 'No location data';
  }
  
  return normalized;
}

// ===== PLAYER STATUS NORMALIZATION =====
/**
 * Normalize a PlayerStatus record from the database
 * Ensures status is canonical, location is consistent
 */
export function normalizePlayerStatusRecord(record) {
  if (!record) return null;
  
  return {
    ...record,
    status: normalizePlayerStatus(record.status),
    rank: normalizeRank(record.rank),
    ...ensureLocationShape(record)
  };
}

/**
 * Normalize multiple player status records
 */
export function normalizePlayerStatusRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(normalizePlayerStatusRecord).filter(r => r !== null);
}

// ===== INCIDENT NORMALIZATION =====
/**
 * Normalize an Incident record
 */
export function normalizeIncidentRecord(record) {
  if (!record) return null;
  
  return {
    ...record,
    severity: normalizeIncidentSeverity(record.severity),
    status: normalizeIncidentStatus(record.status),
    ...ensureLocationShape(record)
  };
}

/**
 * Normalize multiple incident records
 */
export function normalizeIncidentRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map(normalizeIncidentRecord).filter(r => r !== null);
}

// ===== EVENT NORMALIZATION =====
/**
 * Normalize an Event record
 */
export function normalizeEventRecord(record) {
  if (!record) return null;
  
  return {
    ...record,
    event_type: normalizeEventType(record.event_type),
    status: normalizeEventType(record.status) // Status often uses event_type values
  };
}

// ===== VOICE NET NORMALIZATION =====
/**
 * Normalize a VoiceNet record
 */
export function normalizeVoiceNetRecord(record) {
  if (!record) return null;
  
  return {
    ...record,
    discipline: normalizeNetDiscipline(record.discipline),
    type: normalizeNetType(record.type),
    status: normalizeNetStatus(record.status)
  };
}

// ===== BULK NORMALIZATION =====
/**
 * Smart normalizer: detects entity type and applies appropriate normalization
 */
export function normalizeEntity(entity, entityType) {
  switch (entityType) {
    case 'PlayerStatus':
      return normalizePlayerStatusRecord(entity);
    case 'Incident':
      return normalizeIncidentRecord(entity);
    case 'Event':
      return normalizeEventRecord(entity);
    case 'VoiceNet':
      return normalizeVoiceNetRecord(entity);
    default:
      return entity;
  }
}

/**
 * Normalize a collection of entities
 */
export function normalizeEntityCollection(entities, entityType) {
  if (!Array.isArray(entities)) return [];
  return entities
    .map(e => normalizeEntity(e, entityType))
    .filter(e => e !== null);
}