/**
 * Comms Permission Engine
 * Evaluates read/post/reply/moderate permissions using registry rules
 * Fail-closed: unknown rank → VAGRANT; missing rules → deny
 */

import { COMMS_REGISTRY } from './commsRegistry.js';

const RANK_ORDER = COMMS_REGISTRY.enums.rank;

/**
 * Normalize rank: unknown → VAGRANT (fail-closed)
 */
const normalizeRank = (rank) => {
  return RANK_ORDER.includes(rank) ? rank : 'VAGRANT';
};

/**
 * Check if userRank >= minRank
 */
const rankAtLeast = (userRank, minRank) => {
  const userIdx = RANK_ORDER.indexOf(normalizeRank(userRank));
  const minIdx = RANK_ORDER.indexOf(normalizeRank(minRank));
  return userIdx >= minIdx;
};

/**
 * Evaluate single permission rule (OR logic)
 */
const evaluateRule = (user, rule, context = {}) => {
  // rankAtLeast check
  if (rule.rankAtLeast) {
    return rankAtLeast(user.rank, rule.rankAtLeast);
  }

  // roleIn check
  if (rule.roleIn && user.roles) {
    return rule.roleIn.some(r => user.roles.includes(r));
  }

  // membership checks (scoped)
  if (rule.membership && context.isMember) {
    return context.isMember;
  }

  // opRoleIn check
  if (rule.opRoleIn && context.opRole) {
    return rule.opRoleIn.includes(context.opRole);
  }

  // squadRoleIn check
  if (rule.squadRoleIn && context.squadRole) {
    return rule.squadRoleIn.includes(context.squadRole);
  }

  return false;
};

/**
 * Main permission evaluator
 * 
 * Returns: { allowed: boolean, reasonCode: string, details?: object }
 */
export const canUser = (user, channel, action, context = {}) => {
  // Safety: invalid action
  if (!user || !channel || !action) {
    return { allowed: false, reasonCode: 'MISSING_CONTEXT' };
  }

  // Normalize rank (fail-closed)
  user = { ...user, rank: normalizeRank(user.rank) };

  // 1. MEMBERSHIP CHECK FIRST (fail-closed)
  if (channel.scope !== 'ORG') {
    const isMember = channel.membership?.includes(user.id) || false;
    if (!isMember) {
      return { allowed: false, reasonCode: 'NOT_CHANNEL_MEMBER' };
    }
  }

  // 2. CHANNEL LOCK (overrides POST/REPLY except for moderators)
  if (channel.is_locked && ['post', 'reply'].includes(action)) {
    const canUnlock = hasModerationType(user, 'LOCK', channel, context);
    if (!canUnlock) {
      return { allowed: false, reasonCode: 'CHANNEL_LOCKED' };
    }
  }

  // 3. CHANNEL HIDDEN
  if (channel.is_hidden && action === 'read' && !user.roles?.includes('ADMIN')) {
    return { allowed: false, reasonCode: 'CHANNEL_HIDDEN' };
  }

  // 4. REPLY POLICY ENFORCEMENT
  if (action === 'reply') {
    const replySetting = channel.reply_policy || 'ENABLED';
    if (replySetting === 'DISABLED') {
      return { allowed: false, reasonCode: 'REPLIES_DISABLED' };
    }
    if (replySetting === 'THREAD_ONLY' && !context.isThreadReply) {
      return { allowed: false, reasonCode: 'THREAD_REPLIES_ONLY' };
    }
  }

  // 5. PERMISSION RULES (OR logic: any match = grant)
  const perms = channel.permissions?.[action] || [];
  if (!perms || perms.length === 0) {
    return { allowed: false, reasonCode: 'NO_PERMISSION_RULE' };
  }

  const hasPermission = perms.some(rule => evaluateRule(user, rule, context));
  if (!hasPermission) {
    return { allowed: false, reasonCode: 'INSUFFICIENT_PERMISSION', requiredRank: 'SCOUT' };
  }

  return { allowed: true, reasonCode: 'PERMITTED' };
};

/**
 * Check if user has specific moderation capability
 */
export const hasModerationType = (user, capability, channel, context = {}) => {
  const mods = COMMS_REGISTRY.policyDefaults.moderationCapabilities;
  const userRank = normalizeRank(user.rank);

  for (const rank of ['FOUNDER', 'PIONEER', 'VOYAGER']) {
    if (rankAtLeast(userRank, rank) && mods[rank]?.includes(capability)) {
      return true;
    }
  }

  return false;
};

/**
 * Get permission explanation for UI
 */
export const getPermissionExplanation = (reasonCode) => {
  const explanations = {
    PERMITTED: 'You have permission',
    MISSING_CONTEXT: 'Invalid context',
    NOT_CHANNEL_MEMBER: 'You are not a member of this channel',
    CHANNEL_LOCKED: 'Channel is locked',
    CHANNEL_HIDDEN: 'Channel is hidden',
    REPLIES_DISABLED: 'Replies are disabled on this channel',
    THREAD_REPLIES_ONLY: 'Replies only allowed in threads',
    NO_PERMISSION_RULE: 'No permission rules defined',
    INSUFFICIENT_PERMISSION: 'You do not have sufficient rank or role'
  };

  return explanations[reasonCode] || 'Permission denied';
};

/**
 * Bounded query helper (avoid unbounded list())
 */
export const queryChannelsPaginated = async (base44, query, limit = 20, offset = 0) => {
  return base44.entities.CommsChannel.filter(query, '-updated_date', limit, offset);
};

/**
 * Get all accessible channels for user (scoped + ORG)
 */
export const getUserChannels = async (base44, user, limit = 20) => {
  const channels = [];

  // ORG channels (all visible)
  const orgChannels = await base44.entities.CommsChannel.filter(
    { scope: 'ORG' },
    'slug',
    limit
  );
  channels.push(...orgChannels);

  // Scoped channels (where user is member)
  const scopedChannels = await base44.entities.CommsChannel.filter(
    { membership: user.id },
    '-updated_date',
    limit
  );
  channels.push(...scopedChannels.filter(ch => ch.scope !== 'ORG'));

  return channels;
};