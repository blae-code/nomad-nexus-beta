/**
 * Canonical Comms Dock Channel Taxonomy
 * Enforces structure across ORG, ROLE, SQUAD, and OPERATION scopes
 * Authority: commsPolicyConfig.js is the source of truth for permissions
 */

export const CANONICAL_CHANNELS = {
  // ORG-SCOPED
  ORG: {
    'org-announcements': {
      name: 'Announcements',
      scope: 'ORG',
      type: 'BROADCAST',
      description: 'Official org announcements',
      post_policy: 'FOUNDERS_ONLY',
      reply_policy: 'NO_REPLIES'
    },
    'org-ops-briefings': {
      name: 'Operations Briefings',
      scope: 'ORG',
      type: 'OPS_FEED',
      description: 'Pre-op briefs with threaded discussion',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ALL'
    },
    'org-ops-sitrep': {
      name: 'Operations SITREP',
      scope: 'ORG',
      type: 'OPS_FEED',
      description: 'Real-time situation reports (no threads)',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'NO_REPLIES'
    },
    'org-distress-dispatch': {
      name: 'Distress Dispatch',
      scope: 'ORG',
      type: 'OPS_FEED',
      description: 'Rescue alerts and coordination',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'COMMAND_ONLY'
    },
    'org-general-comms': {
      name: 'General Comms',
      scope: 'ORG',
      type: 'FORUM',
      description: 'Org-wide casual discussion',
      post_policy: 'ALL',
      reply_policy: 'ALL'
    },
    'org-intel-ledger': {
      name: 'Intel Ledger',
      scope: 'ORG',
      type: 'INTEL',
      description: 'Shared intelligence reports',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ROLE_MEMBERS'
    },
    'org-market-logistics': {
      name: 'Market & Logistics',
      scope: 'ORG',
      type: 'FORUM',
      description: 'Industry, trading, supply coordination',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ALL'
    }
  },

  // ROLE-SCOPED (per role)
  ROLE: {
    'dispatch': {
      name: '{role} Dispatch',
      type: 'OPS_FEED',
      description: 'Role-specific operational orders',
      post_policy: 'ROLE_MEMBERS',
      reply_policy: 'NO_REPLIES'
    },
    'forum': {
      name: '{role} Forum',
      type: 'FORUM',
      description: 'Role-specific discussion',
      post_policy: 'ROLE_MEMBERS',
      reply_policy: 'ALL'
    },
    'intel': {
      name: '{role} Intel',
      type: 'INTEL',
      description: 'Role-specific intel sharing',
      post_policy: 'ROLE_MEMBERS',
      reply_policy: 'ROLE_MEMBERS'
    }
  },

  // SQUAD-SCOPED
  SQUAD: {
    'net': {
      name: '{squad} Net',
      type: 'OPS_FEED',
      description: 'Squad operational net',
      post_policy: 'ROLE_MEMBERS',
      reply_policy: 'ALL'
    },
    'forum': {
      name: '{squad} Forum',
      type: 'FORUM',
      description: 'Squad internal discussion',
      post_policy: 'ROLE_MEMBERS',
      reply_policy: 'ALL'
    }
  },

  // OPERATION-SCOPED
  OPERATION: {
    'brief': {
      name: 'Operation Brief',
      type: 'OPS_FEED',
      description: 'Brief + pinned objectives',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ALL'
    },
    'live': {
      name: 'Live TAC',
      type: 'OPS_FEED',
      description: 'Real-time tactical updates',
      post_policy: 'COMMAND_ONLY',
      reply_policy: 'NO_REPLIES'
    },
    'intel': {
      name: 'Intel',
      type: 'INTEL',
      description: 'Combat/target intelligence',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ROLE_MEMBERS'
    },
    'logistics': {
      name: 'Logistics',
      type: 'FORUM',
      description: 'Supply & extraction coordination',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ALL'
    },
    'aar': {
      name: 'After-Action Report',
      type: 'FORUM',
      description: 'Post-op debrief & lessons learned',
      post_policy: 'SCOUTS_PLUS',
      reply_policy: 'ALL'
    }
  }
};

// Permission validation (now sourced from commsPolicyConfig)
import { checkPermission, checkModeration, getChannelPolicy } from './commsPolicyConfig';

export const canPost = (user, channel) => {
  if (channel.is_locked) return false;
  return checkPermission(user, channel, 'post');
};

export const canReply = (user, channel, isThreadReply = false) => {
  if (channel.is_locked) return false;
  // If thread reply, policy may allow even if top-level reply is disabled
  return checkPermission(user, channel, 'reply');
};

export const canModerate = (user, action = 'pin') => {
  return checkModeration(user, action);
};

export const getChannelIcon = (type) => {
  const icons = {
    BROADCAST: '📢',
    OPS_FEED: '📡',
    FORUM: '💬',
    INTEL: '🔍'
  };
  return icons[type] || '💬';
};

export const sortChannels = (channels, user) => {
  // Canonical first, then by unread count, then alphabetically
  return channels.sort((a, b) => {
    if (a.is_canonical !== b.is_canonical) {
      return a.is_canonical ? -1 : 1;
    }
    const aUnread = a.unread_count || 0;
    const bUnread = b.unread_count || 0;
    if (aUnread !== bUnread) return bUnread - aUnread;
    return a.name.localeCompare(b.name);
  });
};