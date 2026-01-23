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

// Permission checking helper
export const checkPermission = (user, channel, action) => {
  const chPolicy = COMMS_POLICY.channels.find(ch => ch.slug === channel.slug);
  if (!chPolicy) return false;

  const perms = chPolicy.permissions[action];
  if (!perms || perms.length === 0) return false;

  // Check each permission rule with OR logic
  return perms.some(rule => {
    if (rule.rankAtLeast) {
      const rankOrder = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];
      const userRankIdx = rankOrder.indexOf(user.rank);
      const minRankIdx = rankOrder.indexOf(rule.rankAtLeast);
      if (userRankIdx < minRankIdx) return false;
      if (rule.threadOnly && action === 'reply') return true;
      return true;
    }
    if (rule.roleIn && user.roles) {
      return rule.roleIn.some(r => user.roles.includes(r));
    }
    return false;
  });
};

export const checkModeration = (user, action) => {
  const mods = COMMS_POLICY.defaults.moderation;
  const rankOrder = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];
  const userRankIdx = rankOrder.indexOf(user.rank);

  for (const rank of ['FOUNDER', 'PIONEER', 'VOYAGER']) {
    const minRankIdx = rankOrder.indexOf(rank);
    if (userRankIdx >= minRankIdx && mods[rank]?.includes(action)) {
      return true;
    }
  }

  return false;
};

export const getChannelPolicy = (slug) => {
  return COMMS_POLICY.channels.find(ch => ch.slug === slug);
};