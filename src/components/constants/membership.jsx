/**
 * MembershipStatus — orthogonal access axis (independent of Rank)
 * Determines org-level access to restricted features (e.g., Focused comms)
 */
export const MEMBERSHIP_STATUS = {
  GUEST: 'GUEST',          // Default; no membership
  VAGRANT: 'VAGRANT',      // Applied trial (limited access)
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
 */
export const grantsFocusedAccess = (membership) => {
  const FOCUSED_TIERS = [
    MEMBERSHIP_STATUS.MEMBER,
    MEMBERSHIP_STATUS.AFFILIATE,
    MEMBERSHIP_STATUS.PARTNER,
  ];
  return FOCUSED_TIERS.includes(membership);
};