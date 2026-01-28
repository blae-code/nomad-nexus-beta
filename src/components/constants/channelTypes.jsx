/**
 * Comms Channel Discipline Types — determines access/behavior
 */
export const COMMS_CHANNEL_TYPES = {
  CASUAL: 'casual',      // Open to all
  FOCUSED: 'focused',    // Requires higher rank or specific role
};

/**
 * Default minimum rank for Focused channels
 */
export const FOCUSED_MIN_RANK = 'SCOUT';  // Scout+ required for Focused content

/**
 * Determine if a channel type requires gating
 */
export const requiresPermissionGating = (channelType) => {
  return channelType === COMMS_CHANNEL_TYPES.FOCUSED;
};