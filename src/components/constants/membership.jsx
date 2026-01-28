/**
 * MembershipStatus — orthogonal access axis (independent of Rank)
 * Determines org-level access to restricted features (e.g., Focused comms)
 * 
 * Collision Guard:
 * - VAGRANT rank exists in parallel with VAGRANT membership (separate axes)
 * - UI uses RANK_LABELS[VAGRANT] = "Vagrant" for rank
 * - UI uses MEMBERSHIP_LABELS[VAGRANT] = "Prospect" for membership
 * - This prevents ambiguity in UI rendering
 */
export const MEMBERSHIP_STATUS = {
  GUEST: 'GUEST',          // Default; no membership
  PROSPECT: 'PROSPECT',    // Applied trial (limited access) — canonical alias
  VAGRANT: 'VAGRANT',      // Legacy/compatibility alias → renders as "Prospect"
  MEMBER: 'MEMBER',        // Full member (most features)
  AFFILIATE: 'AFFILIATE',  // Partner/allied (most features)
  PARTNER: 'PARTNER',      // Strategic partner (all features)
};

/**
 * Membership list for dropdowns
 */
export const MEMBERSHIP_LIST = Object.values(MEMBERSHIP_STATUS);

/**
 * Check if membership grants restricted access (Focused comms, etc)
 * Accepts both PROSPECT and VAGRANT for compatibility
 */
export const grantsFocusedAccess = (membership) => {
  const FOCUSED_TIERS = [
    MEMBERSHIP_STATUS.MEMBER,
    MEMBERSHIP_STATUS.AFFILIATE,
    MEMBERSHIP_STATUS.PARTNER,
  ];
  return FOCUSED_TIERS.includes(membership);
};