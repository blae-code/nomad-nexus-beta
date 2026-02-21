/**
 * Map Collaboration Service
 * Real-time collaborative drawing and interaction tracking for tactical maps
 */

import { base44 } from '@/components/base44/nexusBase44Client';

/**
 * Create a new map collaboration session
 */
export async function createMapSession(sessionData) {
  const session = await base44.entities.WhiteboardSession.create({
    title: sessionData.title || 'Tactical Map Session',
    operation_id: sessionData.operationId,
    background_image: sessionData.backgroundImage,
    canvas_width: 1920,
    canvas_height: 1080,
    locked: false,
    active_participants: [],
  });
  return session;
}

/**
 * Get or create active map session for an operation
 */
export async function getActiveMapSession(operationId) {
  if (!operationId) return null;
  
  const sessions = await base44.entities.WhiteboardSession.filter({
    operation_id: operationId,
    locked: false,
  }, '-created_date', 1);
  
  if (sessions.length > 0) return sessions[0];
  
  return createMapSession({
    title: `Map Session - ${operationId}`,
    operationId,
  });
}

/**
 * Add a drawn element to the map session
 */
export async function addMapElement(sessionId, elementData, authorId) {
  return base44.entities.WhiteboardElement.create({
    session_id: sessionId,
    element_type: elementData.type,
    data: elementData.data,
    layer: elementData.layer || 0,
    locked: false,
    author_member_profile_id: authorId,
  });
}

/**
 * Update an existing map element
 */
export async function updateMapElement(elementId, updates) {
  return base44.entities.WhiteboardElement.update(elementId, updates);
}

/**
 * Delete a map element
 */
export async function deleteMapElement(elementId) {
  return base44.entities.WhiteboardElement.delete(elementId);
}

/**
 * List all elements for a session
 */
export async function listSessionElements(sessionId) {
  if (!sessionId) return [];
  return base44.entities.WhiteboardElement.filter({
    session_id: sessionId,
  });
}

/**
 * Subscribe to element changes in a session
 */
export function subscribeToSessionElements(sessionId, callback) {
  if (!sessionId) return () => {};
  
  return base44.entities.WhiteboardElement.subscribe((event) => {
    callback(event);
  });
}

/**
 * Update participant cursor position
 */
export async function updateParticipantCursor(sessionId, participantId, x, y, color) {
  const session = await base44.entities.WhiteboardSession.get(sessionId);
  if (!session) return;
  
  const participants = Array.isArray(session.active_participants) 
    ? session.active_participants 
    : [];
  
  const updated = participants.filter(p => p.member_profile_id !== participantId);
  updated.push({
    member_profile_id: participantId,
    cursor_x: x,
    cursor_y: y,
    color: color || '#3b82f6',
    last_active: new Date().toISOString(),
  });
  
  await base44.entities.WhiteboardSession.update(sessionId, {
    active_participants: updated,
  });
}

/**
 * Subscribe to session updates (cursors, participants)
 */
export function subscribeToSession(sessionId, callback) {
  if (!sessionId) return () => {};
  
  return base44.entities.WhiteboardSession.subscribe((event) => {
    if (event.type === 'delete') return;
    if (event.data?.id === sessionId) {
      callback(event.data);
    }
  });
}

/**
 * Export map layout as shareable code
 */
export function exportMapLayout(session, elements) {
  const payload = {
    schema: 'nexus-map-layout',
    version: 1,
    exportedAt: new Date().toISOString(),
    session: {
      title: session.title,
      canvas_width: session.canvas_width,
      canvas_height: session.canvas_height,
      background_image: session.background_image,
    },
    elements: elements.map(el => ({
      type: el.element_type,
      data: el.data,
      layer: el.layer,
    })),
  };
  
  return btoa(JSON.stringify(payload));
}

/**
 * Import map layout from shareable code
 */
export function importMapLayout(code) {
  try {
    const payload = JSON.parse(atob(code));
    if (payload.schema !== 'nexus-map-layout' || payload.version !== 1) {
      throw new Error('Invalid map layout code');
    }
    return payload;
  } catch (error) {
    throw new Error('Failed to import map layout: ' + error.message);
  }
}

/**
 * Generate random participant color
 */
export function generateParticipantColor(participantId) {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
  ];
  
  const hash = participantId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hash) % colors.length];
}
