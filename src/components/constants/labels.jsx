/**
 * Canonical UI Label Maps
 * Centralizes all user-facing text to prevent drift & collisions
 */

/**
 * Rank display labels (human-friendly, title-cased)
 */
export const RANK_LABELS = {
  VAGRANT: 'Vagrant',
  SCOUT: 'Scout',
  VOYAGER: 'Voyager',
  FOUNDER: 'Founder',
  PIONEER: 'The Pioneer',
};

/**
 * Get display label for a rank
 */
export const getRankLabel = (rank) => {
  return RANK_LABELS[rank] || rank;
};

/**
 * Membership display labels (distinct from rank language)
 * Prevents collision: VAGRANT rank ≠ VAGRANT membership
 */
export const MEMBERSHIP_LABELS = {
  GUEST: 'Guest',
  PROSPECT: 'Prospect',      // ← alias for VAGRANT membership (collision guard)
  VAGRANT: 'Prospect',        // ← keep for compatibility, but render as "Prospect"
  MEMBER: 'Member',
  AFFILIATE: 'Affiliate',
  PARTNER: 'Partner',
};

/**
 * Get display label for membership status
 * Safely maps VAGRANT membership → "Prospect" to avoid rank collision
 */
export const getMembershipLabel = (status) => {
  return MEMBERSHIP_LABELS[status] || status;
};

/**
 * Role display labels (human-friendly, capitalize first letter)
 */
export const ROLE_LABELS = {
  SHAMANS: 'Shamans',
  RANGERS: 'Rangers',
  INDUSTRY: 'Industry',
  RACING: 'Racing',
  RESCUE: 'Rescue',
  TRAINING: 'Training',
  COMBAT: 'Combat',
};

/**
 * Get display label for a role
 */
export const getRoleLabel = (role) => {
  return ROLE_LABELS[role] || role;
};