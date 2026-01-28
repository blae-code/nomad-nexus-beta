/**
 * Voice Net Access Policy
 * Canonical rules for who can join which voice nets
 * Reuses membership-based logic from comms policy
 */

import { VOICE_NET_TYPE } from '@/components/constants/voiceNet';
import { MEMBERSHIP } from '@/components/constants/membership';

/**
 * Check if a user can join a voice net
 * @param {Object} user - { membership, ... }
 * @param {Object} net - { type, isTemporary, ... }
 * @returns {boolean}
 */
export function canJoinVoiceNet(user, net) {
  if (!user || !net) return false;

  const { membership } = user;
  const { type, isTemporary } = net;

  // Casual: always accessible
  if (type === VOICE_NET_TYPE.CASUAL) {
    return true;
  }

  // Focused: check membership + temporary flag
  if (type === VOICE_NET_TYPE.FOCUSED) {
    // Temporary Focused: all users can join
    if (isTemporary) {
      return true;
    }

    // Standard Focused: Members and above (MEMBER, AFFILIATE, PARTNER)
    const restrictedMemberships = [
      MEMBERSHIP.MEMBER,
      MEMBERSHIP.AFFILIATE,
      MEMBERSHIP.PARTNER,
    ];
    return restrictedMemberships.includes(membership);
  }

  return false;
}

/**
 * Get a human-readable reason for access denial
 * @param {Object} net - { type, isTemporary, name, ... }
 * @returns {string}
 */
export function getAccessDenialReason(net) {
  const { type, isTemporary, name } = net;

  if (type === VOICE_NET_TYPE.FOCUSED && !isTemporary) {
    return `${name} is restricted to Members and above`;
  }

  return `You cannot access ${name}`;
}