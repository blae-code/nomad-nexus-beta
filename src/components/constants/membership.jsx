
/**
 * Membership Constants
 * Maps canonical membership tiers
 */
export const MEMBERSHIP = {
  GUEST: 'GUEST',
  VAGRANT: 'VAGRANT', // Note: VAGRANT rank, but distinct membership
  MEMBER: 'MEMBER',
  AFFILIATE: 'AFFILIATE',
  PARTNER: 'PARTNER',
};

/**
 * Membership list for dropdowns
 */
export const MEMBERSHIP_LIST = Object.values(MEMBERSHIP);

/**
 * Check if membership grants restricted access (Focused comms, etc)
 * Accepts both PROSPECT and VAGRANT for compatibility (these will not grant focused access)
 */
export const grantsFocusedAccess = (membership) => {
  const FOCUSED_TIERS = [
    MEMBERSHIP.MEMBER,
    MEMBERSHIP.AFFILIATE,
    MEMBERSHIP.PARTNER,
  ];
  return FOCUSED_TIERS.includes(membership);
};

/**
 * Default membership mapping from rank (for access keys / new profiles)
 */
export const getDefaultMembershipForRank = (rank) => {
  const normalized = (rank || '').toString().toUpperCase();
  switch (normalized) {
    case 'SCOUT':
      return MEMBERSHIP.MEMBER;
    case 'VOYAGER':
      return MEMBERSHIP.AFFILIATE;
    case 'FOUNDER':
    case 'PIONEER':
      return MEMBERSHIP.PARTNER;
    case 'VAGRANT':
      return MEMBERSHIP.VAGRANT;
    default:
      return MEMBERSHIP.GUEST;
  }
};
