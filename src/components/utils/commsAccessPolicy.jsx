/**
 * Canonical Comms Access Policy
 * Single source of truth for channel access rules
 */
import { COMMS_CHANNEL_TYPES } from '../constants/channelTypes';
import { grantsFocusedAccess } from '../constants/membership';

/**
 * Check if user can access a given channel based on canonical policy
 * 
 * @param {Object} user - User object with membership, rank, roles
 * @param {Object} channel - Channel object with { type, isTemporary }
 * @returns {boolean}
 */
export const canAccessFocusedComms = (user, channel = {}) => {
  if (!user) return false;

  const { type = COMMS_CHANNEL_TYPES.CASUAL, isTemporary = false } = channel;

  // Casual: always accessible
  if (type === COMMS_CHANNEL_TYPES.CASUAL) {
    return true;
  }

  // Focused: check membership tier
  if (type === COMMS_CHANNEL_TYPES.FOCUSED) {
    // Temporary Focused: open to all
    if (isTemporary) {
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