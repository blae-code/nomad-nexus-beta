/**
 * Canonical Comms Access Policy
 * Single source of truth for channel access rules
 */
import { COMMS_CHANNEL_TYPES } from '../constants/channelTypes';
import { grantsFocusedAccess } from '../constants/membership';

const RANK_ORDER = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function hasCommandBypass(user) {
  const rank = String(user?.rank || '').trim().toUpperCase();
  const roles = Array.isArray(user?.roles) ? user.roles.map((role) => normalize(role)) : [];
  return rank === 'COMMANDER' || rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
}

/**
 * Check if user can access a given channel based on canonical policy
 * 
 * @param {Object} user - User object with membership, rank, roles
 * @param {Object} channel - Channel object with { type, isTemporary }
 * @returns {boolean}
 */
export const canAccessFocusedComms = (user, channel = {}) => {
  if (!user) return false;

  const type = normalize(channel?.type || COMMS_CHANNEL_TYPES.CASUAL);
  const isTemporary = Boolean(channel?.isTemporary || channel?.is_temporary || channel?.temporary);
  const focusedType = normalize(COMMS_CHANNEL_TYPES.FOCUSED);
  const casualType = normalize(COMMS_CHANNEL_TYPES.CASUAL);

  // Casual: always accessible
  if (type === casualType) {
    return true;
  }

  // Focused: check membership tier
  if (type === focusedType) {
    // Temporary Focused: open to all
    if (isTemporary) {
      return true;
    }

    if (hasCommandBypass(user)) {
      return true;
    }

    // Standard Focused: members, affiliates, partners only
    return grantsFocusedAccess(user.membership);
  }

  // Unknown type: deny by default
  return false;
};

/**
 * Get human-readable access denial reason
 */
export const getAccessDenialReason = (channel = {}) => {
  const { isTemporary = false } = channel;
  
  if (isTemporary) {
    return null; // Should not be called if isTemporary
  }
  
  return 'Focused channels are for Members, Affiliates, and Partners. Request access to join.';
};

/**
 * Full channel access policy with focused + DM + role/rank checks.
 * Prevents relying on UI hiding alone for scope enforcement.
 */
export const canAccessCommsChannel = (user, channel = {}) => {
  if (!user || !channel) return false;

  const isTemporary = Boolean(channel.isTemporary || channel.is_temporary || channel.temporary);
  const category = normalize(channel.category);
  const type = normalize(channel.type);
  const isFocused = category === 'focused' || type === normalize(COMMS_CHANNEL_TYPES.FOCUSED);
  if (isFocused) {
    const focusedAllowed = canAccessFocusedComms(user, {
      type: COMMS_CHANNEL_TYPES.FOCUSED,
      isTemporary,
    });
    if (!focusedAllowed) return false;
  }

  if (Boolean(channel.is_dm)) {
    if (hasCommandBypass(user)) return true;
    const participants = Array.isArray(channel.dm_participants) ? channel.dm_participants : [];
    if (!participants.includes(user.id)) return false;
  }

  if (Array.isArray(channel.allowed_role_tags) && channel.allowed_role_tags.length > 0) {
    const userRoles = (user?.roles || []).map((role) => normalize(role));
    const allowedRoles = channel.allowed_role_tags.map((role) => normalize(role));
    if (!allowedRoles.some((role) => userRoles.includes(role))) return false;
  }

  if (channel.min_rank_required) {
    const rank = String(user?.rank || '').trim().toUpperCase();
    const minRank = String(channel.min_rank_required || '').trim().toUpperCase();
    if (RANK_ORDER.indexOf(rank) < RANK_ORDER.indexOf(minRank)) return false;
  }

  return true;
};
