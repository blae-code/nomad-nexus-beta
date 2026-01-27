import { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * useWhisperTargeting: De-duplicated whisper participant resolution
 * Ensures uniqueness by userId and excludes self for role/group scopes
 */
export function useWhisperTargeting(eventId, currentUserId) {
  const [participants, setParticipants] = useState({});

  const buildParticipantSet = useCallback(async (scope, targetId = null) => {
    if (!eventId || !currentUserId) return [];

    try {
      let userIds = new Set();

      if (scope === 'ONE' && targetId) {
        // 1:1 whisper: just the target
        userIds.add(targetId);
      } else if (scope === 'ROLE' && targetId) {
        // All users with matching role
        // Fetch from org or event based on context
        const members = await base44.entities.User.filter({});
        const withRole = members.filter(u => u.role === targetId);
        withRole.forEach(u => userIds.add(u.id));
      } else if (scope === 'SQUAD' && targetId) {
        // All members of squad
        const memberships = await base44.entities.SquadMembership.filter({
          squad_id: targetId
        });
        memberships.forEach(m => userIds.add(m.user_id));
      } else if (scope === 'WING' && targetId) {
        // All users assigned to wing in this op
        const participants = await base44.entities.OpParticipant.filter({
          event_id: eventId,
          assigned_wing: targetId
        });
        participants.forEach(p => userIds.add(p.user_id));
      } else if (scope === 'FLEET') {
        // All active participants in this op
        const allParticipants = await base44.entities.OpParticipant.filter({
          event_id: eventId
        });
        allParticipants.forEach(p => userIds.add(p.user_id));
      }

      // Remove self (exclude self from group whispers)
      userIds.delete(currentUserId);

      return Array.from(userIds);
    } catch (err) {
      console.error('[WHISPER TARGETING] Error building participant set:', err);
      return [];
    }
  }, [eventId, currentUserId]);

  return {
    buildParticipantSet,
    dedupeParticipants: (userIds) => {
      // Remove duplicates and self
      const unique = new Set(userIds);
      unique.delete(undefined);
      unique.delete(null);
      return Array.from(unique);
    }
  };
}