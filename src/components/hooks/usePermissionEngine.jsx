import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * usePermissionEngine: Unified permission checks for dual-hatted users
 * Computes capabilities as UNION of roles across scopes
 */
export function usePermissionEngine(userId, eventId) {
  const [roles, setRoles] = useState(null);
  const [capabilities, setCapabilities] = useState({});

  useEffect(() => {
    if (!userId || !eventId) return;

    const fetchRoles = async () => {
      try {
        // Fetch op-level role
        const opParticipants = await base44.entities.OpParticipant.filter({
          event_id: eventId,
          user_id: userId
        });
        const opRole = opParticipants?.[0]?.op_role || 'PARTICIPANT';

        // Fetch squad-level role
        const memberships = await base44.entities.SquadMembership.filter({
          user_id: userId
        });
        const squadRole = memberships?.[0]?.role || 'MEMBER';

        setRoles({ opRole, squadRole, isCommandStaff: opParticipants?.[0]?.is_command_staff });
        setCapabilities(computeCapabilities(opRole, squadRole));
      } catch (err) {
        console.error('[PERMISSION ENGINE] Error fetching roles:', err);
      }
    };

    fetchRoles();
  }, [userId, eventId]);

  return {
    roles,
    capabilities,
    canManagePriority: () => capabilities.managePriority || false,
    canGrantPriority: () => capabilities.grantPriority || false,
    canBroadcast: () => capabilities.broadcast || false,
    canWhisper: (scope) => {
      const scopePerms = capabilities.whisperScopes || [];
      return scopePerms.includes(scope);
    },
    canTacticalCommand: () => capabilities.tacticalCommand || false,
    canCreateSquadWhisper: () => capabilities.squadWhisper || false
  };
}

function computeCapabilities(opRole, squadRole) {
  const caps = {};

  // Command-level capabilities
  if (opRole === 'COMMAND' || opRole === 'WING_LEAD' || opRole === 'COMMS') {
    caps.managePriority = true;
    caps.grantPriority = true;
    caps.broadcast = true;
    caps.tacticalCommand = true;
    caps.whisperScopes = ['FLEET', 'WING', 'SQUAD', 'ROLE', 'ONE'];
  }

  // Squad-level capabilities
  if (squadRole === 'LEADER' || squadRole === 'DEPUTY') {
    caps.squadWhisper = true;
    if (!caps.whisperScopes) {
      caps.whisperScopes = ['SQUAD', 'ROLE', 'ONE'];
    } else {
      // Union: ensure SQUAD is included if not already
      if (!caps.whisperScopes.includes('SQUAD')) {
        caps.whisperScopes.push('SQUAD');
      }
    }
    caps.requestPriority = true;
  }

  // All users can do basic ops
  if (!caps.whisperScopes) {
    caps.whisperScopes = ['ONE'];
  }

  return caps;
}