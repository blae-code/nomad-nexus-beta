import { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import crypto from 'crypto';

/**
 * useWhisper: Hook for managing whisper sessions
 * Handles room creation, participant management, and lifecycle
 */
export function useWhisper(operationId, currentUserId) {
  const [whisperSession, setWhisperSession] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [error, setError] = useState(null);

  // Generate deterministic room name
  const generateWhisperRoomName = useCallback((scope, participantIds) => {
    const sorted = [...participantIds].sort();
    const hash = crypto.createHash('md5').update(sorted.join(',')).digest('hex').substring(0, 8);
    return `whisper:${operationId}:${scope}:${hash}`;
  }, [operationId]);

  // Initiate whisper session
  const startWhisper = useCallback(async (targetNodeId, scope, metadata = {}) => {
    try {
      setIsConnecting(true);
      setError(null);

      let participantIds = [currentUserId];

      // Determine participants based on scope and target
      if (scope === 'ONE') {
        participantIds = [currentUserId, targetNodeId];
      } else if (scope === 'ROLE' && metadata.roleId) {
        // Fetch users with this role
        const users = await base44.entities.User.list();
        const roleUsers = users.filter(u => u.role_id === metadata.roleId);
        participantIds = [currentUserId, ...roleUsers.map(u => u.id)];
      } else if (scope === 'SQUAD' && metadata.squadId) {
        // Fetch squad members
        const members = await base44.entities.SquadMembership.filter({
          squad_id: metadata.squadId
        });
        participantIds = [currentUserId, ...members.map(m => m.user_id)];
      }

      const roomName = generateWhisperRoomName(scope, participantIds);

      // Create or get whisper session record
      const existing = await base44.entities.WhisperSession.filter({
        operation_id: operationId,
        livekit_room_name: roomName,
        status: 'ACTIVE'
      });

      let session = existing?.[0];

      if (!session) {
        session = await base44.entities.WhisperSession.create({
          operation_id: operationId,
          scope,
          initiator_user_id: currentUserId,
          participant_user_ids: participantIds,
          livekit_room_name: roomName,
          status: 'ACTIVE',
          metadata: {
            ...metadata,
            created_by: currentUserId,
            created_at: new Date().toISOString()
          }
        });
      }

      setWhisperSession(session);
      setParticipants(
        participantIds.map(id => ({
          id,
          name: `User ${id.substring(0, 4)}` // TODO: fetch real names
        }))
      );

      return session;
    } catch (err) {
      setError(err.message);
      console.error('[WHISPER] Start error:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [currentUserId, operationId, generateWhisperRoomName]);

  // End whisper session
  const endWhisper = useCallback(async () => {
    try {
      if (!whisperSession) return;

      await base44.entities.WhisperSession.update(whisperSession.id, {
        status: 'CLOSED',
        ended_at: new Date().toISOString()
      });

      setWhisperSession(null);
      setParticipants([]);
      setIsMuted(false);
    } catch (err) {
      setError(err.message);
      console.error('[WHISPER] End error:', err);
    }
  }, [whisperSession]);

  // Subscribe to session updates
  useEffect(() => {
    if (!whisperSession) return;

    const unsubscribe = base44.entities.WhisperSession.subscribe((event) => {
      if (event.id === whisperSession.id) {
        if (event.type === 'update' && event.data.status === 'CLOSED') {
          setWhisperSession(null);
        } else {
          setWhisperSession(event.data);
        }
      }
    });

    return () => unsubscribe?.();
  }, [whisperSession?.id]);

  return {
    whisperSession,
    isConnecting,
    isMuted,
    setIsMuted,
    participants,
    error,
    startWhisper,
    endWhisper,
    generateWhisperRoomName
  };
}