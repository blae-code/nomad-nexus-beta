/**
 * Voice Directory Service
 * Single source of truth for joinable voice rooms with smart recommendations
 */
import { buildRoomName } from './commsContract';

/**
 * Build list of joinable rooms for a user
 */
export async function getVoiceDirectory(user, options = {}) {
  const { includeAllOrg = false, includeInactive = false } = options;

  // Start with ORG-scoped nets
  const directory = [];

  // ORG COMMAND (always available, recommended for leadership)
  directory.push({
    roomName: buildRoomName({ scope: 'ORG', net: 'COMMAND' }),
    scope: 'ORG',
    label: 'Command Net',
    description: 'Founder/leadership coordination',
    allowed: true,
    reason: 'org-access',
    recommended: user?.rank === 'Founder' || user?.role === 'admin',
    discipline: 'focused'
  });

  // ORG THEATER (general ops)
  directory.push({
    roomName: buildRoomName({ scope: 'ORG', net: 'THEATER' }),
    scope: 'ORG',
    label: 'Theater Net',
    description: 'Organization-wide operations',
    allowed: true,
    reason: 'org-access',
    recommended: false,
    discipline: 'casual'
  });

  // ORG DISTRESS (rescue-focused)
  directory.push({
    roomName: buildRoomName({ scope: 'ORG', net: 'DISTRESS' }),
    scope: 'ORG',
    label: 'Distress Dispatch',
    description: 'Emergency/rescue coordination',
    allowed: true,
    reason: 'org-access',
    recommended: user?.specialization === 'RESCUE',
    discipline: 'focused'
  });

  return directory;
}

/**
 * Get user's active operation context
 */
export async function getUserActiveOp(userId, base44) {
  try {
    const assignments = await base44.entities.EventDutyAssignment.filter(
      { user_id: userId },
      '-created_date',
      1
    );

    if (assignments?.length > 0) {
      const event = await base44.entities.Event.list(`${assignments[0].event_id}`);
      return event?.[0] || null;
    }
  } catch (err) {
    console.warn('[voiceDirectory] Failed to fetch active op:', err);
  }
  return null;
}

/**
 * Add OP-scoped nets if user is in an active operation
 */
export async function enrichWithOpNets(directory, user, event, options = {}) {
  if (!event || event.status !== 'active') return directory;

  const opNets = [
    {
      roomName: buildRoomName({ scope: 'OP', opId: event.id, net: 'COMMAND' }),
      scope: 'OP',
      label: `Op ${event.id.slice(0, 6)}: Command`,
      description: 'Operation command net',
      allowed: true,
      reason: 'op-participant',
      recommended: true,
      discipline: 'focused'
    },
    {
      roomName: buildRoomName({ scope: 'OP', opId: event.id, net: 'THEATER' }),
      scope: 'OP',
      label: `Op ${event.id.slice(0, 6)}: Theater`,
      description: 'Operation tactical net',
      allowed: true,
      reason: 'op-participant',
      recommended: true,
      discipline: 'casual'
    }
  ];

  return [...directory, ...opNets];
}

/**
 * Add SQUAD-scoped nets if user is in squads
 */
export async function enrichWithSquadNets(directory, user, base44) {
  if (!user?.id) return directory;

  try {
    const memberships = await base44.entities.SquadMembership.filter(
      { user_id: user.id },
      '-created_date',
      10
    );

    const squadNets = memberships.map(m => ({
      roomName: buildRoomName({ scope: 'SQUAD', squadSlug: m.squad_id, net: 'SQUAD' }),
      scope: 'SQUAD',
      label: `Squad Net`,
      description: `Squad coordination`,
      allowed: true,
      reason: 'squad-member',
      recommended: false,
      discipline: 'casual',
      squadId: m.squad_id
    }));

    return [...directory, ...squadNets];
  } catch (err) {
    console.warn('[voiceDirectory] Failed to fetch squad nets:', err);
    return directory;
  }
}

/**
 * Get recommended nets for user (for quick-join)
 */
export function getRecommendedNets(directory) {
  return directory.filter(room => room.recommended).slice(0, 3);
}

/**
 * Format directory for UI (grouped by scope)
 */
export function groupDirectoryByScope(directory) {
  const grouped = {
    ORG: [],
    SQUAD: [],
    OP: []
  };

  directory.forEach(room => {
    if (grouped[room.scope]) {
      grouped[room.scope].push(room);
    }
  });

  return grouped;
}