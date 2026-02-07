/**
 * Voice Net Access Policy
 * Canonical rules for who can join which voice nets
 * Reuses membership-based logic from comms policy
 */

import { VOICE_NET_TYPE } from '@/components/constants/voiceNet';
import { MEMBERSHIP } from '@/components/constants/membership';

function normalizeTier(value) {
  return String(value || '').trim().toUpperCase();
}

function normalizeDiscipline(net) {
  const discipline = String(net?.discipline || '').trim().toLowerCase();
  if (discipline === 'focused' || discipline === 'casual') return discipline;
  const type = String(net?.type || '').trim().toLowerCase();
  if (type === String(VOICE_NET_TYPE.FOCUSED).toLowerCase()) return 'focused';
  if (type === String(VOICE_NET_TYPE.CASUAL).toLowerCase()) return 'casual';
  return 'casual';
}

function hasCommandBypass(user) {
  const rank = normalizeTier(user?.rank);
  const roles = Array.isArray(user?.roles) ? user.roles.map((role) => String(role || '').toLowerCase()) : [];
  return rank === 'COMMANDER' || rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
}

/**
 * Check if a user can join a voice net
 * @param {Object} user - { membership, ... }
 * @param {Object} net - { type, isTemporary, ... }
 * @returns {boolean}
 */
export function canJoinVoiceNet(user, net) {
  if (!user || !net) return false;

  const membership = normalizeTier(user?.membership);
  const isTemporary = Boolean(net?.isTemporary || net?.is_temporary || net?.temporary);
  const discipline = normalizeDiscipline(net);
  const type = String(net?.type || '').trim();

  // Casual: always accessible
  if (discipline === 'casual' || String(type).toUpperCase() === String(VOICE_NET_TYPE.CASUAL).toUpperCase()) {
    return true;
  }

  // Focused: check membership + temporary flag
  if (discipline === 'focused' || String(type).toUpperCase() === String(VOICE_NET_TYPE.FOCUSED).toUpperCase()) {
    // Temporary Focused: all users can join
    if (isTemporary) {
      return true;
    }

    if (hasCommandBypass(user)) {
      return true;
    }

    // Standard Focused: Members and above (MEMBER, AFFILIATE, PARTNER)
    const restrictedMemberships = [
      MEMBERSHIP.MEMBER,
      MEMBERSHIP.AFFILIATE,
      MEMBERSHIP.PARTNER,
    ].map((entry) => normalizeTier(entry));
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
  const type = String(net?.type || '');
  const isTemporary = Boolean(net?.isTemporary || net?.is_temporary || net?.temporary);
  const name = net?.name || net?.label || net?.code || 'this net';
  const discipline = normalizeDiscipline(net);

  if ((discipline === 'focused' || String(type).toUpperCase() === String(VOICE_NET_TYPE.FOCUSED).toUpperCase()) && !isTemporary) {
    return `${name} is restricted to Members and above`;
  }

  return `You cannot access ${name}`;
}
