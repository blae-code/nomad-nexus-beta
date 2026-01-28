/**
 * Rank Hierarchy — canonical source of truth
 * Higher index = higher rank
 */
export const RANKS = {
  VAGRANT: { name: 'Vagrant', tier: 0 },
  SCOUT: { name: 'Scout', tier: 1 },
  VOYAGER: { name: 'Voyager', tier: 2 },
  FOUNDER: { name: 'Founder', tier: 3 },
  PIONEER: { name: 'Pioneer', tier: 4 },
};

/**
 * Rank list for dropdowns/selections
 */
export const RANK_LIST = Object.entries(RANKS).map(([key, val]) => ({
  key,
  ...val,
}));

/**
 * Check if rankA >= rankB (permission inheritance)
 */
export const isRankSufficient = (userRank, requiredRank) => {
  const userTier = RANKS[userRank]?.tier ?? -1;
  const requiredTier = RANKS[requiredRank]?.tier ?? 0;
  return userTier >= requiredTier;
};