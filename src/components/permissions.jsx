/**
 * Redscar Permissions Logic
 * Rank Hierarchy: Pioneer > Founder > Voyager > Scout > Vagrant
 */

const RANK_VALUES = {
  'Pioneer': 6,
  'Founder': 5,
  'Voyager': 4,
  'Scout': 3,
  'Affiliate': 2, // Assigned arbitrary value, but handling explicitly below
  'Vagrant': 1
};

export function getUserRankValue(rank) {
  return RANK_VALUES[rank] || 0;
}

export function hasMinRank(user, minRank) {
  if (!user || !user.rank) return false;
  if (!minRank) return true;
  return getUserRankValue(user.rank) >= getUserRankValue(minRank);
}

export function hasRole(user, roleTag) {
  if (!user || !user.role_tags) return false;
  return user.role_tags.includes(roleTag);
}

// Focused Voice: Scout, Voyager, Founder, Affiliate, Pioneer
export function canAccessFocusedVoice(user) {
  if (!user || !user.rank) return false;
  const allowedRanks = ['Scout', 'Voyager', 'Founder', 'Pioneer', 'Affiliate'];
  return allowedRanks.includes(user.rank);
}

// Edit Armory/Coffer: Pioneer, Shaman
export function canEditResources(user) {
  if (!user) return false;
  if (user.rank === 'Pioneer') return true;
  if (user.is_shaman) return true;
  return false;
}

export function canAccessChannel(user, channel) {
  if (!user) return false;
  
  // Rank check
  if (channel.access_min_rank && !hasMinRank(user, channel.access_min_rank)) {
    return false;
  }

  // Role check (if allowed_role_tags is present and not empty)
  if (channel.allowed_role_tags && channel.allowed_role_tags.length > 0) {
    const hasTag = channel.allowed_role_tags.some(tag => hasRole(user, tag));
    if (!hasTag) return false;
  }

  return true;
}

export function canPostInChannel(user, channel) {
  if (!canAccessChannel(user, channel)) return false;
  if (channel.is_read_only) {
    // Read-only: only Voyager and above can post
    return hasMinRank(user, 'Voyager');
  }
  return true;
}

export function canCreateEvent(user) {
  // Only Scout and above can create events
  return hasMinRank(user, 'Scout');
}

export function canEditEvent(user, event) {
  if (!user) return false;
  // Creator always can
  if (event.created_by === user.id) return true;
  // Founder and above always can
  if (hasMinRank(user, 'Founder')) return true;
  return false;
}