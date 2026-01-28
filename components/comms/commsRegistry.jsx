/**
 * COMMS REGISTRY: Single Source of Truth
 * Defines all channels, permissions, templates, and auto-provisioning rules
 * Version: 1.0.0
 */

export const COMMS_REGISTRY = {
  version: '1.0.0',

  // ===== ENUMS =====
  enums: {
    rank: ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'],
    scope: ['ORG', 'ROLE', 'SQUAD', 'OP'],
    mode: ['BROADCAST', 'OPS_FEED', 'FORUM', 'INTEL', 'LOGISTICS'],
    capability: [
      'READ', 'POST', 'REPLY', 'REACT',
      'PIN', 'LOCK', 'HIDE_POST', 'DELETE_POST',
      'EDIT_CHANNEL', 'SUSPEND_POSTING', 'MOVE_THREAD'
    ]
  },

  // ===== POST TEMPLATES =====
  templates: {
    OP_BRIEF: {
      name: 'Operation Briefing',
      requiredFields: ['objective', 'ao', 'timeWindow', 'squads', 'comms', 'risk', 'rally', 'extract'],
      renderHint: 'CARD'
    },
    SITREP: {
      name: 'Situation Report',
      requiredFields: ['status', 'loc', 'contact', 'risk', 'needs', 'eta'],
      renderHint: 'COMPACT'
    },
    DISTRESS_TICKET: {
      name: 'Distress Ticket',
      requiredFields: ['caller', 'ao', 'grid', 'threat', 'injuries', 'comms', 'eta', 'assigned'],
      renderHint: 'URGENT'
    },
    INTEL_SIGHTING: {
      name: 'Intel Sighting',
      requiredFields: ['time', 'loc', 'actor', 'count', 'heading', 'confidence'],
      renderHint: 'COMPACT'
    },
    LOGISTICS_REQUEST: {
      name: 'Logistics Request',
      requiredFields: ['requestType', 'pickup', 'drop', 'window', 'risk', 'capacity'],
      renderHint: 'MANIFEST'
    }
  },

  // ===== POLICY DEFAULTS =====
  policyDefaults: {
    failClosedOnUnknownRank: true,
    allowReactionsByDefault: true,
    replyPolicyByMode: {
      BROADCAST: 'DISABLED',
      OPS_FEED: 'DISABLED',
      FORUM: 'ENABLED',
      INTEL: 'THREAD_ONLY',
      LOGISTICS: 'ENABLED'
    },
    moderationCapabilities: {
      VOYAGER: ['PIN', 'LOCK', 'HIDE_POST', 'MOVE_THREAD'],
      PIONEER: ['PIN', 'LOCK', 'HIDE_POST', 'MOVE_THREAD', 'DELETE_POST', 'EDIT_CHANNEL', 'SUSPEND_POSTING'],
      FOUNDER: ['PIN', 'LOCK', 'HIDE_POST', 'MOVE_THREAD', 'DELETE_POST', 'EDIT_CHANNEL', 'SUSPEND_POSTING']
    }
  },

  // ===== CANONICAL ORG CHANNELS =====
  orgChannels: [
    {
      slug: 'org-announcements',
      name: 'ANNOUNCEMENTS',
      description: 'Founder-authored org-wide announcements',
      type: 'BROADCAST',
      scope: 'ORG',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'FOUNDER' }],
        reply: [],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: false,
        replies: 'DISABLED',
        rateLimit: { postsPerMinute: 2 }
      }
    },
    {
      slug: 'org-ops-briefings',
      name: 'OPS BRIEFINGS',
      description: 'Pre-operation briefings with discussion threads',
      type: 'OPS_FEED',
      scope: 'ORG',
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
      description: 'Real-time situation reports (no replies)',
      type: 'OPS_FEED',
      scope: 'ORG',
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
      description: 'Rescue alerts and coordination',
      type: 'OPS_FEED',
      scope: 'ORG',
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
      description: 'Org-wide casual discussion',
      type: 'FORUM',
      scope: 'ORG',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'VAGRANT' }],
        reply: [{ rankAtLeast: 'VAGRANT' }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'ENABLED',
        rateLimit: { postsPerMinute: 12 }
      }
    },
    {
      slug: 'org-intel-ledger',
      name: 'INTEL LEDGER',
      description: 'Shared intelligence reports',
      type: 'INTEL',
      scope: 'ORG',
      permissions: {
        read: [{ rankAtLeast: 'SCOUT' }],
        post: [{ rankAtLeast: 'SCOUT' }, { roleIn: ['RANGERS'] }],
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
      description: 'Industry & supply coordination',
      type: 'LOGISTICS',
      scope: 'ORG',
      permissions: {
        read: [{ rankAtLeast: 'VAGRANT' }],
        post: [{ rankAtLeast: 'SCOUT' }, { roleIn: ['INDUSTRY'] }],
        reply: [{ rankAtLeast: 'VAGRANT' }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'ENABLED',
        rateLimit: { postsPerMinute: 15 }
      }
    }
  ],

  // ===== DYNAMIC CHANNEL TEMPLATES =====
  dynamicTemplates: [
    {
      kind: 'ROLE',
      slugPattern: '{roleSlug}-dispatch',
      name: '{roleName} Dispatch',
      description: 'Dispatch and coordination for {roleName} personnel',
      type: 'OPS_FEED',
      scope: 'ROLE',
      permissions: {
        read: [{ rankAtLeast: 'SCOUT' }, { roleIn: ['{ROLE}'] }],
        post: [{ rankAtLeast: 'SCOUT' }, { roleIn: ['{ROLE}'] }],
        reply: [{ roleIn: ['{ROLE}'], threadOnly: true }],
        react: [{ rankAtLeast: 'VAGRANT' }]
      },
      settings: {
        threading: true,
        replies: 'THREAD_ONLY'
      }
    },
    {
      kind: 'SQUAD',
      slugPattern: 'squad-{squadSlug}-net',
      name: 'Squad {squadName} Net',
      description: '{squadName} internal communications',
      type: 'OPS_FEED',
      scope: 'SQUAD',
      permissions: {
        read: [{ membership: 'SQUAD_MEMBER' }],
        post: [{ membership: 'SQUAD_MEMBER' }],
        reply: [],
        react: [{ membership: 'SQUAD_MEMBER' }]
      },
      settings: {
        threading: false,
        replies: 'DISABLED'
      }
    },
    {
      kind: 'OP',
      slugPattern: 'op-{opId}-live',
      name: 'Operation {opId} Live',
      description: 'Real-time operation status and coordination',
      type: 'OPS_FEED',
      scope: 'OP',
      permissions: {
        read: [{ membership: 'OP_PARTICIPANT' }],
        post: [{ opRoleIn: ['COMMAND', 'SQUAD_LEADER'] }, { rankAtLeast: 'VOYAGER' }],
        reply: [],
        react: [{ membership: 'OP_PARTICIPANT' }]
      },
      settings: {
        threading: false,
        replies: 'DISABLED',
        requireTemplate: 'SITREP'
      }
    }
  ]
};

/**
 * Get org channel by slug
 */
export const getOrgChannel = (slug) => {
  return COMMS_REGISTRY.orgChannels.find(ch => ch.slug === slug);
};

/**
 * Get all org channel slugs
 */
export const getOrgChannelSlugs = () => {
  return COMMS_REGISTRY.orgChannels.map(ch => ch.slug);
};

/**
 * Get dynamic template by kind
 */
export const getDynamicTemplate = (kind) => {
  return COMMS_REGISTRY.dynamicTemplates.find(t => t.kind === kind);
};

/**
 * Get template definition by name
 */
export const getTemplate = (templateName) => {
  return COMMS_REGISTRY.templates[templateName];
};