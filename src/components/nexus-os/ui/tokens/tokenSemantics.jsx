/**
 * Semantic token mappings — status/priority/role → family + color
 * Centralized rules for consistent token usage across UI
 */

export const playerStatusTokens = {
  READY: { family: 'circle', color: 'green', label: 'Ready' },
  IN_QUANTUM: { family: 'circle', color: 'cyan', label: 'Quantum' },
  ENGAGED: { family: 'target-alt', color: 'orange', label: 'Engaged' },
  DOWN: { family: 'triangle', color: 'red', label: 'Down' },
  RTB: { family: 'penta', color: 'yellow', label: 'RTB' },
  OFFLINE: { family: 'circle', color: 'grey', label: 'Offline' },
  DISTRESS: { family: 'triangle', color: 'red', label: 'Distress', animated: true },
};

export const eventPhaseTokens = {
  PLANNING: { family: 'square', color: 'blue', label: 'Planning' },
  BRIEFING: { family: 'square', color: 'cyan', label: 'Briefing' },
  ACTIVE: { family: 'square', color: 'green', label: 'Active' },
  DEBRIEF: { family: 'square', color: 'orange', label: 'Debrief' },
  ARCHIVED: { family: 'square', color: 'grey', label: 'Archived' },
};

export const priorityTokens = {
  CRITICAL: { family: 'target', color: 'red', label: 'Critical' },
  HIGH: { family: 'target', color: 'orange', label: 'High' },
  STANDARD: { family: 'target', color: 'blue', label: 'Standard' },
  LOW: { family: 'target', color: 'green', label: 'Low' },
};

export const roleTokens = {
  PILOT: { family: 'target-alt', color: 'blue', label: 'Pilot' },
  GUNNER: { family: 'target', color: 'orange', label: 'Gunner' },
  MEDIC: { family: 'hospital', color: 'green', label: 'Medic' },
  LOGISTICS: { family: 'fuel', color: 'yellow', label: 'Logistics' },
  SCOUT: { family: 'hex', color: 'cyan', label: 'Scout' },
  MARINE: { family: 'ammunition', color: 'red', label: 'Marine' },
  OTHER: { family: 'circle', color: 'grey', label: 'Operator' },
};

export const assetStatusTokens = {
  OPERATIONAL: { family: 'circle', color: 'green', label: 'Operational' },
  MAINTENANCE: { family: 'mechanics', color: 'yellow', label: 'Maintenance' },
  DESTROYED: { family: 'triangle', color: 'red', label: 'Destroyed' },
  MISSION: { family: 'target-alt', color: 'blue', label: 'On Mission' },
  UNKNOWN: { family: 'circle', color: 'grey', label: 'Unknown' },
};

export const commandStatusTokens = {
  PENDING: { family: 'penta', color: 'orange', label: 'Pending' },
  ACKNOWLEDGED: { family: 'circle', color: 'green', label: 'Acknowledged' },
  EXECUTING: { family: 'target-alt', color: 'blue', label: 'Executing' },
  COMPLETE: { family: 'objective', color: 'green', label: 'Complete' },
  CANCELLED: { family: 'triangle', color: 'grey', label: 'Cancelled' },
};

export function getTokenByStatus(status, mappingTable) {
  const normalized = String(status || '').toUpperCase();
  return mappingTable[normalized] || { family: 'circle', color: 'grey', label: 'Unknown' };
}