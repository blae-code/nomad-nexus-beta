/**
 * Canonical Comms Policy Rules Engine
 * Authority: Single source of truth for channel permissions & moderation
 */

export const COMMS_POLICY = {
  version: '1.0.0',
  defaults: {
    failClosedOnUnknownRank: true,
    allowReactionsByDefault: true,
    replyPolicyByMode: {
      BROADCAST: 'DISABLED',
      OPS_FEED: 'DISABLED',
      FORUM: 'ENABLED',
      INTEL: 'THREAD_ONLY',
      LOGISTICS: 'ENABLED'
    },
    moderation: {
      VOYAGER: ['PIN', 'LOCK', 'HIDE_POST', 'MOVE_THREAD'],
      FOUNDER: ['PIN', 'LOCK', 'HIDE_POST', 'MOVE_THREAD', 'DELETE_POST', 'EDIT_CHANNEL', 'SUSPEND_POSTING'],
      PIONEER: ['PIN', 'LOCK', 'HIDE_POST', 'MOVE_THREAD', 'DELETE_POST', 'EDIT_CHANNEL', 'SUSPEND_POSTING']
    }
  },

  channels: [
    {
      slug: 'org-announcements',
      name: 'ANNOUNCEMENTS',
      scope: 'ORG',
      mode: 'BROADCAST',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'FOUNDER' }],
        reply: [],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: false,
        replies: 'DISABLED',
        requireTemplate: null,
        rateLimit: { postsPerMinute: 2 }
      }
    },

    {
      slug: 'org-ops-briefings',
      name: 'OPS BRIEFINGS',
      scope: 'ORG',
      mode: 'OPS_FEED',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'SCOUT' }],
        reply: [{ rankAtLeast: 'VAGRANT', threadOnly: true }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'THREAD_ONLY',
        requireTemplate: 'OP_BRIEF',
        rateLimit: { postsPerMinute: 6 }
      }
    },

    {
      slug: 'org-ops-sitrep',
      name: 'OPS SITREP',
      scope: 'ORG',
      mode: 'OPS_FEED',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'SCOUT' }],
        reply: [],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: false,
        replies: 'DISABLED',
        requireTemplate: 'SITREP',
        rateLimit: { postsPerMinute: 10 }
      }
    },

    {
      slug: 'org-distress-dispatch',
      name: 'DISTRESS & DISPATCH',
      scope: 'ORG',
      mode: 'OPS_FEED',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'SCOUT' }, { roleIn: ['RESCUE'] }],
        reply: [{ roleIn: ['RESCUE'], threadOnly: true }, { rankAtLeast: 'VOYAGER', threadOnly: true }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'THREAD_ONLY',
        requireTemplate: 'DISTRESS_TICKET',
        rateLimit: { postsPerMinute: 20 }
      }
    },

    {
      slug: 'org-general-comms',
      name: 'GENERAL COMMS',
      scope: 'ORG',
      mode: 'FORUM',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'VAGRANT' }],
        reply: [{ rankAtLeast: 'VAGRANT' }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'ENABLED',
        requireTemplate: null,
        rateLimit: { postsPerMinute: 12 }
      }
    },

    {
      slug: 'org-intel-ledger',
      name: 'INTEL LEDGER',
      scope: 'ORG',
      mode: 'INTEL',
      permissions: {
        read: [{ rankAtLeast: 'SCOUT' }],
        post: [{ rankAtLeast: 'SCOUT' }],
        reply: [{ rankAtLeast: 'SCOUT', threadOnly: true }],
        react: [{ rankAtLeast: 'SCOUT' }]
      },
      settings: {
        threading: true,
        replies: 'THREAD_ONLY',
        requireTemplate: 'INTEL_SIGHTING',
        rateLimit: { postsPerMinute: 8 }
      }
    },

    {
      slug: 'org-market-logistics',
      name: 'MARKET & LOGISTICS',
      scope: 'ORG',
      mode: 'LOGISTICS',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'SCOUT' }],
        reply: [{ rankAtLeast: 'VAGRANT' }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'ENABLED',
        requireTemplate: null,
        rateLimit: { postsPerMinute: 15 }
      }
    }
  ]
};

/**
 * Permission Evaluation Engine (Deterministic Rules)
 * 
 * 1. Membership first (fail-closed)
 * 2. Permission rules as OR (any match = grant)
 * 3. Rank comparison (ordinal)
 * 4. Unknown rank → VAGRANT (fail-closed)
 * 5. Channel LOCK overrides (except moderators)
 * 6. Reply policy enforced regardless
 * 7. Template validation for structured posts
 */

const RANK_ORDER = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];

const normalizeRank = (rank) => {
  // Default unknown ranks to VAGRANT (fail-closed)
  return RANK_ORDER.includes(rank) ? rank : 'VAGRANT';
};

const rankAtLeast = (userRank, minRank) => {
  const userIdx = RANK_ORDER.indexOf(normalizeRank(userRank));
  const minIdx = RANK_ORDER.indexOf(normalizeRank(minRank));
  return userIdx >= minIdx;
};

/**
 * Evaluate single permission rule
 */
const evaluateRule = (user, rule) => {
  // Rule: rankAtLeast
  if (rule.rankAtLeast) {
    if (!rankAtLeast(user.rank, rule.rankAtLeast)) {
      return false;
    }
    // Rank requirement met; check threadOnly constraint
    return !rule.threadOnly; // If threadOnly, caller must handle context
  }

  // Rule: roleIn
  if (rule.roleIn && user.roles) {
    return rule.roleIn.some(r => user.roles.includes(r));
  }

  return false;
};

/**
 * Main Permission Evaluator
 * 
 * Returns { allowed: boolean, reason: string }
 */
export const evaluatePermission = (user, channel, action, context = {}) => {
  // Fail-closed: no policy found
  const chPolicy = COMMS_POLICY.channels.find(ch => ch.slug === channel.slug);
  if (!chPolicy) {
    return { allowed: false, reason: 'Channel policy not found' };
  }

  // 1. Check channel LOCK (overrides POST/REPLY except for moderators)
  if (channel.is_locked && ['post', 'reply'].includes(action)) {
    const canUnlock = checkModeration(user, 'lock');
    if (!canUnlock) {
      return { allowed: false, reason: 'Channel is locked' };
    }
  }

  // 2. Check membership rule (fail-closed first)
  if (chPolicy.membershipRule?.type !== 'ANY') {
    const hasMembership = channel.membership?.includes(user.id);
    if (!hasMembership) {
      return { allowed: false, reason: 'Not a channel member' };
    }
  }

  // 3. Enforce reply policy by channel mode
  if (action === 'reply') {
    const replySetting = chPolicy.settings?.replies || 'ENABLED';
    if (replySetting === 'DISABLED') {
      return { allowed: false, reason: 'Replies disabled on this channel' };
    }
    if (replySetting === 'THREAD_ONLY' && !context.isThreadReply) {
      return { allowed: false, reason: 'Replies only in threads' };
    }
  }

  // 4. Evaluate action permissions (OR logic: any match = grant)
  const perms = chPolicy.permissions[action];
  if (!perms || perms.length === 0) {
    return { allowed: false, reason: `No permissions defined for ${action}` };
  }

  const hasPermission = perms.some(rule => evaluateRule(user, rule));
  if (!hasPermission) {
    return { allowed: false, reason: `Insufficient permissions for ${action}` };
  }

  return { allowed: true, reason: 'Permitted' };
};

/**
 * Validate post against template requirements
 */
export const validatePostTemplate = (channel, postData) => {
  const chPolicy = COMMS_POLICY.channels.find(ch => ch.slug === channel.slug);
  if (!chPolicy) return { valid: true }; // Fail-open on unknown channel

  const requiredTemplate = chPolicy.settings?.requireTemplate;
  if (!requiredTemplate) {
    return { valid: true }; // No template required
  }

  const templateDef = COMMS_POLICY.templates?.[requiredTemplate];
  if (!templateDef) {
    return { valid: false, reason: `Template ${requiredTemplate} not defined` };
  }

  // For structured templates, require specific fields in postData.fields
  if (postData.template_type !== requiredTemplate) {
    return { valid: false, reason: `Post must use template ${requiredTemplate}` };
  }

  return { valid: true, template: templateDef };
};

/**
 * Legacy helpers (backward compat)
 */
export const checkPermission = (user, channel, action) => {
  const result = evaluatePermission(user, channel, action);
  return result.allowed;
};

export const checkModeration = (user, action) => {
  const mods = COMMS_POLICY.defaults.moderation;
  const userRank = normalizeRank(user.rank);
  const userRankIdx = RANK_ORDER.indexOf(userRank);

  for (const rank of ['FOUNDER', 'PIONEER', 'VOYAGER']) {
    const minRankIdx = RANK_ORDER.indexOf(rank);
    if (userRankIdx >= minRankIdx && mods[rank]?.includes(action)) {
      return true;
    }
  }

  return false;
};

export const getChannelPolicy = (slug) => {
  return COMMS_POLICY.channels.find(ch => ch.slug === slug);
};