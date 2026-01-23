/**
 * DEFENSIVE GUARDS
 * Components use these guards to safely access fields and provide diagnostics
 * when data is missing or malformed.
 */

import { ENTITY_SCHEMA, getFieldDiagnostics } from './dataContract';

/**
 * Safe field getter with diagnostic fallback
 * Usage: safeGet(incident, 'severity', 'LOW')
 */
export function safeGet(obj, fieldName, defaultValue = undefined) {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  const value = obj[fieldName];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get field or diagnostic message (for admin panels)
 * Returns { value, isDiagnostic, diagnostic }
 */
export function getFieldWithDiagnostic(obj, entityName, fieldName, defaultValue) {
  const schema = ENTITY_SCHEMA[entityName];
  const value = safeGet(obj, fieldName, defaultValue);
  
  if (value === undefined || value === null || value === '') {
    if (schema?.required?.includes(fieldName)) {
      return {
        value: defaultValue,
        isDiagnostic: true,
        diagnostic: getFieldDiagnostics(entityName, fieldName, value)
      };
    }
  }
  
  return {
    value,
    isDiagnostic: false,
    diagnostic: null
  };
}

/**
 * Validate required fields exist
 * Returns { isValid, missing }
 */
export function validateRequired(obj, entityName) {
  const schema = ENTITY_SCHEMA[entityName];
  if (!schema) {
    return { isValid: true, missing: [] };
  }
  
  const missing = schema.required.filter(field => !obj[field]);
  return {
    isValid: missing.length === 0,
    missing
  };
}

/**
 * Create a placeholder/loading skeleton for missing data
 */
export function createPlaceholder(entityType) {
  const placeholders = {
    Incident: {
      id: 'unknown',
      title: 'Unknown Incident',
      severity: 'LOW',
      status: 'open',
      location: 'No location data',
      description: 'Data unavailable'
    },
    PlayerStatus: {
      id: 'unknown',
      user_id: 'unknown',
      status: 'OFFLINE',
      rank: 'Vagrant',
      location: 'No location data'
    },
    Event: {
      id: 'unknown',
      title: 'Unknown Event',
      status: 'scheduled',
      event_type: 'casual',
      start_time: new Date().toISOString()
    }
  };
  
  return placeholders[entityType] || {};
}

/**
 * Safe coordinates accessor
 * Returns { lat, lng } or { lat: 0, lng: 0 } with isDiagnostic flag
 */
export function safeCoordinates(obj, defaultLat = 0, defaultLng = 0) {
  if (!obj) {
    return {
      lat: defaultLat,
      lng: defaultLng,
      isDiagnostic: true,
      diagnostic: 'No location data'
    };
  }
  
  const coords = obj.coordinates;
  if (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number') {
    return {
      lat: coords.lat,
      lng: coords.lng,
      isDiagnostic: false
    };
  }
  
  return {
    lat: defaultLat,
    lng: defaultLng,
    isDiagnostic: true,
    diagnostic: 'Invalid or missing coordinates'
  };
}

/**
 * Safe location string accessor
 * Returns location or fallback
 */
export function safeLocation(obj, fallback = 'Unknown') {
  const location = safeGet(obj, 'location', fallback);
  return String(location).trim() || fallback;
}

/**
 * Admin diagnostic panel - show what's missing/wrong
 * Returns HTML-ready diagnostic info
 */
export function getDiagnosticSummary(obj, entityName) {
  const schema = ENTITY_SCHEMA[entityName];
  if (!schema) return null;
  
  const issues = [];
  
  // Check required fields
  for (const field of schema.required) {
    if (!obj[field]) {
      issues.push({
        level: 'error',
        message: `Required field missing: ${field}`
      });
    }
  }
  
  // Check optional fields with expectations
  if (schema.status && !Object.values(schema.status).includes(obj.status)) {
    issues.push({
      level: 'warn',
      message: `Invalid status: "${obj.status}". Expected: ${Object.values(schema.status).join(', ')}`
    });
  }
  
  if (schema.severity && obj.severity && !Object.values(schema.severity).includes(obj.severity)) {
    issues.push({
      level: 'warn',
      message: `Invalid severity: "${obj.severity}". Expected: ${Object.values(schema.severity).join(', ')}`
    });
  }
  
  // Check coordinates if defined
  if (schema.coordinates && obj.coordinates) {
    if (typeof obj.coordinates.lat !== 'number' || typeof obj.coordinates.lng !== 'number') {
      issues.push({
        level: 'warn',
        message: 'Coordinates present but invalid format'
      });
    }
  }
  
  return issues.length === 0 ? null : issues;
}