import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { getDefaultMembershipForRank, MEMBERSHIP_LIST } from '@/components/constants/membership';
import {
  countAllDomains,
  repairAll,
  seedImmersive,
  validateAll,
  wipeAll,
  wipeSeededOnly,
} from '@/components/services/dataRegistry';
import { clearPermissionCache } from '../../services/permissionService';

const ADMIN_BYPASS_FLAG_KEY = 'nexus.flags.adminFocusBypass';
const PROTECTED_DOMAIN_KEYS = ['memberProfiles', 'accessKeys'];
const DB_QUERY_ALLOWLIST = ['MemberProfile', 'AccessKey', 'Event', 'Channel', 'Message', 'PanelPermission', 'AuditLog', 'VoiceNet', 'Notification', 'ChannelMute'];
const KEY_STATUSES = new Set(['ACTIVE', 'REDEEMED', 'REVOKED', 'EXPIRED', 'PENDING']);

export const ADMIN_RANK_MODEL = Object.freeze(['VAGRANT', 'SCOUT', 'VOYAGER', 'COMMANDER', 'PIONEER', 'FOUNDER']);
export const ADMIN_PAGE_SIZES = Object.freeze({
  domains: 6,
  users: 5,
  keys: 6,
  logs: 6,
  moderation: 6,
  promotions: 6,
  audits: 6,
});

const RANK_LEVEL = ADMIN_RANK_MODEL.reduce((acc, rank, index) => {
  acc[rank] = index + 1;
  return acc;
}, {});

const DEFAULT_PERMISSION_PANELS = Object.freeze([
  { id: 'map-tactical', title: 'Tactical Map' },
  { id: 'comms-hub', title: 'Communications Hub' },
  { id: 'voice-control', title: 'Voice Control' },
  { id: 'operations', title: 'Operations Dashboard' },
  { id: 'fleet-command', title: 'Fleet Command' },
  { id: 'system-health', title: 'System Health' },
  { id: 'diagnostics', title: 'Diagnostics' },
  { id: 'team-roster', title: 'Team Roster' },
  { id: 'event-manager', title: 'Event Manager' },
]);

function toText(value, fallback = '') {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeRank(value, fallback = 'VAGRANT') {
  const rank = toText(value, fallback).toUpperCase();
  return ADMIN_RANK_MODEL.includes(rank) ? rank : fallback;
}

function normalizeMembership(rank, value) {
  const fallback = getDefaultMembershipForRank(rank);
  const normalized = toText(value || fallback, fallback).toUpperCase();
  return MEMBERSHIP_LIST.includes(normalized) ? normalized : fallback;
}

function normalizeRoles(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => toText(entry).toLowerCase()).filter(Boolean);
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function paginateList(list, page, pageSize) {
  const items = Array.isArray(list) ? list : [];
  const size = Math.max(1, Number(pageSize || 1));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const nextPage = Math.min(Math.max(0, Number(page || 0)), pageCount - 1);
  return {
    page: nextPage,
    pageCount,
    visible: items.slice(nextPage * size, nextPage * size + size),
  };
}

function readBypassFlag() {
  if (typeof window === 'undefined') return false;
  try {
    const raw = String(window.localStorage.getItem(ADMIN_BYPASS_FLAG_KEY) || '').toLowerCase();
    return ['1', 'true', 'on', 'yes'].includes(raw);
  } catch {
    return false;
  }
}

function normalizeActor(actorProfile) {
  const actor = actorProfile || {};
  const rank = normalizeRank(actor.rank || 'VAGRANT');
  return {
    id: toText(actor.id),
    rank,
    membership: normalizeMembership(rank, actor.membership),
    roles: normalizeRoles(actor.roles),
    isAdmin: Boolean(actor.isAdmin),
  };
}

function hasAdminClearance(actorProfile) {
  const actor = normalizeActor(actorProfile);
  if (actor.isAdmin) return true;
  const roles = new Set(actor.roles);
  if (roles.has('admin') || roles.has('system_admin') || roles.has('owner')) return true;
  if ((actor.rank === 'PIONEER' || actor.rank === 'FOUNDER') && (roles.has('command') || roles.has('officer'))) {
    return true;
  }
  return false;
}

export function validateRankChangePermission(actorProfile, currentRank, targetRank) {
  const actor = normalizeActor(actorProfile);
  const sourceRank = normalizeRank(currentRank || 'VAGRANT');
  const destinationRank = normalizeRank(targetRank || 'VAGRANT');

  if (sourceRank === destinationRank) {
    return { allowed: false, reason: 'no_change', message: 'Target rank matches current rank.' };
  }

  const privilegedRole = actor.isAdmin || actor.roles.includes('admin') || actor.roles.includes('system_admin') || actor.roles.includes('owner');
  const actorLevel = Number(RANK_LEVEL[actor.rank] || 0);
  const sourceLevel = Number(RANK_LEVEL[sourceRank] || 0);
  const destinationLevel = Number(RANK_LEVEL[destinationRank] || 0);

  if (!privilegedRole && actorLevel < RANK_LEVEL.COMMANDER) {
    return { allowed: false, reason: 'insufficient_rank', message: 'Commander rank or higher is required.' };
  }
  if (!privilegedRole && destinationLevel > actorLevel) {
    return { allowed: false, reason: 'cannot_promote_above_self', message: 'Cannot grant rank above your own authority.' };
  }
  if (!privilegedRole && destinationLevel > sourceLevel + 1 && actorLevel < RANK_LEVEL.PIONEER) {
    return { allowed: false, reason: 'promotion_skip_blocked', message: 'Promotion skips require Pioneer authority.' };
  }
  if (!privilegedRole && destinationRank === 'FOUNDER') {
    return { allowed: false, reason: 'founder_protected', message: 'Founder promotions require full admin clearance.' };
  }

  return { allowed: true, reason: 'ok', message: 'Rank change permitted.' };
}

export function validatePioneerUniqueness(memberProfiles, targetProfileId, targetRank) {
  if (normalizeRank(targetRank) !== 'PIONEER') {
    return { allowed: true, reason: 'skip', message: 'Pioneer uniqueness not applicable.' };
  }

  const rows = Array.isArray(memberProfiles) ? memberProfiles : [];
  const targetId = toText(targetProfileId);
  const otherPioneers = rows
    .filter((entry) => normalizeRank(entry?.rank || 'VAGRANT') === 'PIONEER')
    .map((entry) => toText(entry?.id))
    .filter((id) => id && id !== targetId);

  if (otherPioneers.length > 0) {
    return {
      allowed: false,
      reason: 'pioneer_uniqueness',
      message: 'A Pioneer already exists; demote current Pioneer before promoting a new one.',
      conflictIds: Array.from(new Set(otherPioneers)),
    };
  }

  return { allowed: true, reason: 'ok', message: 'Pioneer uniqueness check passed.' };
}

function normalizeUsername(entry) {
  return toText(entry?.display_callsign || entry?.callsign || entry?.username || entry?.full_name || entry?.email || entry?.id, 'Unknown');
}

function normalizeDirectoryUsers(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((entry) => {
      const rank = normalizeRank(entry?.rank || 'VAGRANT');
      return {
        id: toText(entry?.id),
        username: normalizeUsername(entry),
        callsign: toText(entry?.callsign || entry?.display_callsign || entry?.username, '--'),
        rank,
        membership: normalizeMembership(rank, entry?.membership),
        roles: normalizeRoles(entry?.roles),
      };
    })
    .filter((entry) => Boolean(entry.id));
}

function normalizeAccessKeys(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((entry) => {
      const rank = normalizeRank(entry?.grants_rank || entry?.grantsRank || 'VAGRANT');
      return {
        id: toText(entry?.id),
        code: toText(entry?.code),
        status: KEY_STATUSES.has(toText(entry?.status, 'UNKNOWN').toUpperCase())
          ? toText(entry?.status, 'UNKNOWN').toUpperCase()
          : 'UNKNOWN',
        grants_rank: rank,
        grants_membership: normalizeMembership(rank, entry?.grants_membership || entry?.grantsMembership),
        grants_roles: Array.isArray(entry?.grants_roles || entry?.grantsPermissions)
          ? [...(entry?.grants_roles || entry?.grantsPermissions)]
          : [],
        redeemed_by_member_profile_ids: Array.isArray(entry?.redeemed_by_member_profile_ids)
          ? [...entry.redeemed_by_member_profile_ids]
          : [],
        created_date: entry?.created_date || entry?.createdAt || '',
      };
    })
    .filter((entry) => Boolean(entry.id) && Boolean(entry.code));
}

function maskKeyCode(code) {
  const normalized = toText(code);
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function extractData(response) {
  return response?.data || response || {};
}

async function safeList(entityName, sort = '-created_date', limit = 200) {
  try {
    const entity = base44?.entities?.[entityName];
    if (!entity?.list) return [];
    const rows = await entity.list(sort, limit);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function rankToNext(rank) {
  const source = normalizeRank(rank || 'VAGRANT');
  const index = ADMIN_RANK_MODEL.indexOf(source);
  if (index < 0 || index >= ADMIN_RANK_MODEL.length - 1) return source;
  return ADMIN_RANK_MODEL[index + 1];
}

function toClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function titleizeDomainKey(key) {
  return toText(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
    .trim();
}

export default function useAdminFocusRuntime({ actorProfile, opId, featureFlags, onOpenExpandedAdmin }) {
  const actor = useMemo(() => normalizeActor(actorProfile), [actorProfile]);
  const bypassEnabled = useMemo(() => readBypassFlag(), []);
  const hasAdminAccess = useMemo(() => bypassEnabled || hasAdminClearance(actor), [actor, bypassEnabled]);

  const [busyId, setBusyId] = useState('');
  const [expandedView, setExpandedView] = useState('');

  const [actionFeed, setActionFeed] = useState([]);
  const [actionPage, setActionPage] = useState(0);

  const [domainCounts, setDomainCounts] = useState({});
  const [domainPage, setDomainPage] = useState(0);
  const [integritySnapshot, setIntegritySnapshot] = useState(null);
  const [dbQueryEntity, setDbQueryEntity] = useState(DB_QUERY_ALLOWLIST[0]);
  const [dbQueryLimit, setDbQueryLimit] = useState(30);
  const [dbQueryRows, setDbQueryRows] = useState([]);
  const [dbQueryError, setDbQueryError] = useState('');
  const [safeWipeArmed, setSafeWipeArmed] = useState(false);
  const [preserveSeededOnSafeWipe, setPreserveSeededOnSafeWipe] = useState(false);

  const pushAction = useCallback((tone, summary, detail, status = 'PERSISTED') => {
    setActionFeed((previous) => [
      {
        id: createId(),
        tone,
        summary: toText(summary, 'Admin action'),
        detail: toText(detail, '--'),
        status: toText(status, 'PERSISTED').toUpperCase(),
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ].slice(0, 60));
  }, []);

  const runTask = useCallback(async (id, task) => {
    setBusyId(id);
    try {
      await task();
    } catch (error) {
      pushAction('danger', 'Action failed', toText(error?.message, 'Operation did not complete.'), 'FAILED');
    } finally {
      setBusyId('');
    }
  }, [pushAction]);

  const openExpanded = useCallback((view) => {
    setExpandedView(view);
    if (typeof onOpenExpandedAdmin === 'function') {
      onOpenExpandedAdmin(view);
    }
  }, [onOpenExpandedAdmin]);

  const closeExpanded = useCallback(() => setExpandedView(''), []);

  const domainRows = useMemo(() => Object.entries(domainCounts)
    .map(([key, count]) => ({ key, count: Number(count || 0), label: titleizeDomainKey(key) }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.label.localeCompare(right.label);
    }), [domainCounts]);

  const domainPager = useMemo(() => paginateList(domainRows, domainPage, ADMIN_PAGE_SIZES.domains), [domainRows, domainPage]);
  useEffect(() => setDomainPage(domainPager.page), [domainPager.page]);

  const totalDomainRecords = useMemo(() => domainRows.reduce((sum, entry) => sum + Number(entry.count || 0), 0), [domainRows]);
  const activeDomainCount = useMemo(() => domainRows.filter((entry) => entry.count > 0).length, [domainRows]);

  const refreshDomainCounts = useCallback(async () => {
    const counts = await countAllDomains();
    setDomainCounts(counts || {});
    const total = Object.values(counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    pushAction('ok', 'Database counts refreshed', `${total} records across ${Object.keys(counts || {}).length} domains.`);
  }, [pushAction]);

  const runValidation = useCallback(async () => {
    await runTask('validate-db', async () => {
      const report = await validateAll();
      const issues = Array.isArray(report?.issues) ? report.issues : [];
      const errorCount = issues.filter((issue) => toText(issue?.severity).toLowerCase() === 'error').length;
      const warningCount = issues.filter((issue) => toText(issue?.severity).toLowerCase() === 'warning').length;
      setIntegritySnapshot({
        at: new Date().toISOString(),
        totalRecords: Number(report?.totalRecords || 0),
        issueCount: issues.length,
        errorCount,
        warningCount,
      });
      pushAction(errorCount > 0 ? 'warning' : 'ok', 'Validation complete', `${issues.length} findings (${errorCount} errors, ${warningCount} warnings).`);
    });
  }, [pushAction, runTask]);

  const runRepair = useCallback(async () => {
    await runTask('repair-db', async () => {
      const result = await repairAll();
      pushAction(Number(result?.repairedCount || 0) > 0 ? 'ok' : 'neutral', 'Repair complete', toText(result?.message, 'Repair flow completed.'));
      await refreshDomainCounts();
    });
  }, [pushAction, refreshDomainCounts, runTask]);

  const runSeed = useCallback(async (intensity) => {
    await runTask(`seed-${intensity}`, async () => {
      if (featureFlags?.enableEntityMutations === false) {
        pushAction('warning', 'Seed unavailable', 'Entity mutations are disabled by feature flag.', 'BLOCKED');
        return;
      }
      const result = await seedImmersive({ intensity });
      pushAction(result?.success ? 'ok' : 'warning', `Seed ${intensity} finished`, toText(result?.message || result?.error, 'Seed flow completed.'));
      await refreshDomainCounts();
    });
  }, [featureFlags?.enableEntityMutations, pushAction, refreshDomainCounts, runTask]);

  const runWipeSeeded = useCallback(async () => {
    await runTask('wipe-seeded', async () => {
      if (featureFlags?.enableEntityMutations === false) {
        pushAction('warning', 'Seed purge unavailable', 'Entity mutations are disabled by feature flag.', 'BLOCKED');
        return;
      }
      const result = await wipeSeededOnly();
      pushAction('warning', 'Seeded data purged', `${Number(result?.totalDeleted || 0)} seeded records removed.`);
      await refreshDomainCounts();
    });
  }, [featureFlags?.enableEntityMutations, pushAction, refreshDomainCounts, runTask]);

  const runSafeWipe = useCallback(async () => {
    await runTask('safe-wipe', async () => {
      if (!safeWipeArmed) {
        pushAction('warning', 'Safe wipe blocked', 'Arm safe wipe before destructive operations.', 'BLOCKED');
        return;
      }
      if (featureFlags?.enableEntityMutations === false) {
        pushAction('warning', 'Safe wipe unavailable', 'Entity mutations are disabled by feature flag.', 'BLOCKED');
        return;
      }
      const result = await wipeAll({
        preserveSeeded: preserveSeededOnSafeWipe,
        excludeDomainKeys: PROTECTED_DOMAIN_KEYS,
      });
      setSafeWipeArmed(false);
      pushAction('danger', 'Safe wipe complete', `${Number(result?.totalDeleted || 0)} records deleted.`);
      await refreshDomainCounts();
    });
  }, [featureFlags?.enableEntityMutations, preserveSeededOnSafeWipe, pushAction, refreshDomainCounts, runTask, safeWipeArmed]);

  const runDbQuery = useCallback(async () => {
    await runTask('db-query', async () => {
      if (!DB_QUERY_ALLOWLIST.includes(dbQueryEntity)) {
        setDbQueryRows([]);
        setDbQueryError('Entity is not allowlisted for debug query.');
        pushAction('warning', 'DB query blocked', `${dbQueryEntity} is not in the allowlist.`, 'BLOCKED');
        return;
      }
      const entity = base44?.entities?.[dbQueryEntity];
      if (!entity?.list) {
        setDbQueryRows([]);
        setDbQueryError('Entity unavailable in runtime context.');
        pushAction('warning', 'DB query unavailable', `${dbQueryEntity} cannot be queried in this environment.`, 'UNAVAILABLE');
        return;
      }
      const limit = Math.max(1, Math.min(250, Number(dbQueryLimit || 30)));
      const rows = await entity.list('-created_date', limit).catch(async () => {
        const fallback = await entity.list();
        return Array.isArray(fallback) ? fallback.slice(0, limit) : [];
      });
      const normalized = Array.isArray(rows) ? rows : [];
      setDbQueryRows(normalized);
      setDbQueryError('');
      pushAction('ok', 'DB query complete', `${normalized.length} ${dbQueryEntity} row(s) loaded.`);
    });
  }, [dbQueryEntity, dbQueryLimit, pushAction, runTask]);

  const exportDbRows = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (!dbQueryRows.length) {
      pushAction('warning', 'Export skipped', 'Run query before exporting rows.', 'BLOCKED');
      return;
    }
    const payload = JSON.stringify(dbQueryRows, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `admin-db-query-${toText(dbQueryEntity, 'entity').toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    pushAction('ok', 'Export complete', `${dbQueryRows.length} rows exported.`);
  }, [dbQueryEntity, dbQueryRows, pushAction]);

  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [accessKeys, setAccessKeys] = useState([]);
  const [keyAuditRows, setKeyAuditRows] = useState([]);
  const [identityUserSearch, setIdentityUserSearch] = useState('');
  const [identityKeySearch, setIdentityKeySearch] = useState('');
  const [identityUserPage, setIdentityUserPage] = useState(0);
  const [identityKeyPage, setIdentityKeyPage] = useState(0);
  const [selectedIdentityUserId, setSelectedIdentityUserId] = useState('');
  const [identityRank, setIdentityRank] = useState('VAGRANT');
  const [identityMembership, setIdentityMembership] = useState(getDefaultMembershipForRank('VAGRANT'));
  const [inviteMessage, setInviteMessage] = useState('');

  const directoryById = useMemo(() => new Map(directoryUsers.map((entry) => [entry.id, entry])), [directoryUsers]);
  const selectedDirectoryUser = useMemo(() => directoryById.get(selectedIdentityUserId) || null, [directoryById, selectedIdentityUserId]);

  const keyRows = useMemo(() => accessKeys
    .map((entry) => {
      const boundMemberId = entry.redeemed_by_member_profile_ids[0] || '';
      const boundUser = boundMemberId ? directoryById.get(boundMemberId) : null;
      return {
        ...entry,
        boundMemberId,
        boundUsername: boundUser?.username || 'Unbound',
        boundCallsign: boundUser?.callsign || '--',
        hasBinding: Boolean(boundMemberId),
        maskedCode: maskKeyCode(entry.code),
      };
    })
    .sort((left, right) => (Date.parse(toText(right.created_date)) || 0) - (Date.parse(toText(left.created_date)) || 0)), [accessKeys, directoryById]);

  const filteredDirectoryUsers = useMemo(() => {
    const query = toText(identityUserSearch).toLowerCase();
    if (!query) return directoryUsers;
    return directoryUsers.filter((entry) => `${entry.username} ${entry.callsign} ${entry.rank} ${entry.membership}`.toLowerCase().includes(query));
  }, [directoryUsers, identityUserSearch]);

  const filteredKeyRows = useMemo(() => {
    const query = toText(identityKeySearch).toLowerCase();
    const scoped = selectedIdentityUserId
      ? keyRows.filter((entry) => entry.boundMemberId === selectedIdentityUserId)
      : keyRows;
    if (!query) return scoped;
    return scoped.filter((entry) => `${entry.code} ${entry.grants_rank} ${entry.grants_membership} ${entry.boundUsername} ${entry.boundCallsign} ${entry.status}`.toLowerCase().includes(query));
  }, [identityKeySearch, keyRows, selectedIdentityUserId]);

  const activeSelectedUserKeys = useMemo(() => filteredKeyRows.filter((entry) => entry.status === 'ACTIVE'), [filteredKeyRows]);
  const userPager = useMemo(() => paginateList(filteredDirectoryUsers, identityUserPage, ADMIN_PAGE_SIZES.users), [filteredDirectoryUsers, identityUserPage]);
  const keyPager = useMemo(() => paginateList(filteredKeyRows, identityKeyPage, ADMIN_PAGE_SIZES.keys), [filteredKeyRows, identityKeyPage]);
  const keyAuditPager = useMemo(() => paginateList(keyAuditRows, 0, ADMIN_PAGE_SIZES.audits), [keyAuditRows]);

  useEffect(() => setIdentityUserPage(userPager.page), [userPager.page]);
  useEffect(() => setIdentityKeyPage(keyPager.page), [keyPager.page]);

  useEffect(() => {
    if (selectedIdentityUserId && directoryById.has(selectedIdentityUserId)) return;
    const first = directoryUsers[0] || null;
    setSelectedIdentityUserId(first?.id || '');
    if (first) {
      setIdentityRank(normalizeRank(first.rank));
      setIdentityMembership(normalizeMembership(first.rank, first.membership));
    }
  }, [directoryById, directoryUsers, selectedIdentityUserId]);

  const refreshIdentityAccess = useCallback(async () => {
    const [directoryResponse, keyResponse, auditRows] = await Promise.all([
      invokeMemberFunction('getUserDirectory', { includeDetails: false }),
      invokeMemberFunction('listAccessKeys', { includeRevoked: true, limit: 1000 }),
      safeList('AccessKeyAudit', '-timestamp', 200),
    ]);
    const directoryPayload = extractData(directoryResponse);
    const keyPayload = extractData(keyResponse);
    const nextUsers = normalizeDirectoryUsers(directoryPayload?.members || []);
    const nextKeys = normalizeAccessKeys(keyPayload?.keys || []);
    setDirectoryUsers(nextUsers);
    setAccessKeys(nextKeys);
    setKeyAuditRows(auditRows || []);
    pushAction('ok', 'Identity registry refreshed', `${nextUsers.length} users and ${nextKeys.length} keys loaded.`);
  }, [pushAction]);

  const generateInviteForKey = useCallback(async (keyCode, rank, membership) => {
    const inviteResponse = await invokeMemberFunction('generateDiscordInvitation', {
      accessKeyCode: keyCode,
      accessKeyRank: rank,
      accessKeyMembership: membership,
      appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://nomadnexus.space',
    });
    const payload = extractData(inviteResponse);
    const inviteText = toText(payload?.discord?.plainText || payload?.discord?.markdown);
    if (inviteText) setInviteMessage(inviteText);
    return inviteText;
  }, []);

  const issueBoundAccessKey = useCallback(async () => {
    await runTask('issue-access-key', async () => {
      if (!selectedDirectoryUser) {
        pushAction('warning', 'Issue blocked', 'Select a user before issuing access keys.', 'BLOCKED');
        return;
      }
      const rank = normalizeRank(identityRank);
      const membership = normalizeMembership(rank, identityMembership);
      const createResponse = await invokeMemberFunction('createAccessKey', {
        grantsRank: rank,
        grantsPermissions: [],
        grantsMembership: membership,
        targetMemberProfileId: selectedDirectoryUser.id,
      });
      const payload = extractData(createResponse);
      const createdKey = payload?.key;
      if (!createdKey?.id || !createdKey?.code) {
        throw new Error('Access key creation did not return a usable key.');
      }
      await generateInviteForKey(createdKey.code, rank, membership).catch(() => '');
      await refreshIdentityAccess();
      pushAction('ok', 'Access key issued', `${selectedDirectoryUser.username} -> ${createdKey.code}`);
    });
  }, [generateInviteForKey, identityMembership, identityRank, pushAction, refreshIdentityAccess, runTask, selectedDirectoryUser]);

  const revokeKeyById = useCallback(async (keyId, code) => {
    await runTask(`revoke-key-${keyId}`, async () => {
      await invokeMemberFunction('revokeAccessKey', { keyId });
      await invokeMemberFunction('logAccessKeyAudit', {
        access_key_id: keyId,
        action: 'REVOKE',
        details: { source: 'admin-focus-v2', actorId: actor.id || null, opId: opId || null },
      }).catch(() => undefined);
      await refreshIdentityAccess();
      pushAction('warning', 'Access key revoked', `${code} revoked.`);
    });
  }, [actor.id, opId, pushAction, refreshIdentityAccess, runTask]);

  const revokeAllSelectedUserKeys = useCallback(async () => {
    await runTask('revoke-selected-user-keys', async () => {
      if (!selectedDirectoryUser) {
        pushAction('warning', 'Revoke blocked', 'Select a user before revoking keys.', 'BLOCKED');
        return;
      }
      const rows = keyRows.filter((entry) => entry.boundMemberId === selectedDirectoryUser.id && entry.status === 'ACTIVE');
      if (!rows.length) {
        pushAction('warning', 'No active keys', `${selectedDirectoryUser.username} has no active keys.`, 'BLOCKED');
        return;
      }
      for (const row of rows) {
        await invokeMemberFunction('revokeAccessKey', { keyId: row.id });
      }
      await refreshIdentityAccess();
      pushAction('warning', 'User keys revoked', `${rows.length} key(s) revoked for ${selectedDirectoryUser.username}.`);
    });
  }, [keyRows, pushAction, refreshIdentityAccess, runTask, selectedDirectoryUser]);

  const copyToClipboard = useCallback((value, summary) => {
    const target = toText(value);
    if (!target || !navigator?.clipboard?.writeText) return;
    void navigator.clipboard.writeText(target).then(() => {
      pushAction('ok', summary || 'Copied to clipboard', target.length > 72 ? `${target.slice(0, 69)}...` : target);
    });
  }, [pushAction]);

  const [moderationChannels, setModerationChannels] = useState([]);
  const [moderationMessages, setModerationMessages] = useState([]);
  const [voiceModerationFeed, setVoiceModerationFeed] = useState([]);
  const [textModerationFeed, setTextModerationFeed] = useState([]);
  const [moderationPage, setModerationPage] = useState(0);
  const [voiceForm, setVoiceForm] = useState({
    targetMemberProfileId: '',
    moderationAction: 'MUTE',
    channelId: '',
    reason: '',
    durationSeconds: 300,
  });
  const [textForm, setTextForm] = useState({
    action: 'DELETE_MESSAGE',
    channelId: '',
    targetMemberProfileId: '',
    messageId: '',
    reason: '',
    durationMinutes: 60,
  });

  const refreshModerationSignals = useCallback(async () => {
    const [channels, messages, voiceResponse, mutes] = await Promise.all([
      safeList('Channel', '-created_date', 100),
      safeList('Message', '-created_date', 120),
      invokeMemberFunction('updateCommsConsole', { action: 'list_voice_moderation' }).catch(() => null),
      safeList('ChannelMute', '-created_date', 120),
    ]);
    const voicePayload = extractData(voiceResponse);
    setModerationChannels(channels || []);
    setModerationMessages(messages || []);
    setVoiceModerationFeed(Array.isArray(voicePayload?.moderation) ? voicePayload.moderation : []);
    setTextModerationFeed((Array.isArray(mutes) ? mutes : []).map((entry) => ({
      id: toText(entry?.id),
      moderation_action: entry?.is_active ? 'MUTE' : 'UNMUTE',
      target_member_profile_id: toText(entry?.member_profile_id || entry?.user_id),
      channel_id: toText(entry?.channel_id),
      reason: toText(entry?.reason, '--'),
      created_date: entry?.created_date || new Date().toISOString(),
    })));
  }, []);

  const runVoiceModeration = useCallback(async () => {
    await runTask('voice-moderation', async () => {
      const needsTarget = !['LOCK_CHANNEL', 'UNLOCK_CHANNEL'].includes(toText(voiceForm.moderationAction).toUpperCase());
      if (needsTarget && !toText(voiceForm.targetMemberProfileId)) {
        pushAction('warning', 'Voice moderation unavailable', 'Select a target member first.', 'UNAVAILABLE');
        return;
      }
      const payload = {
        action: 'moderate_voice_user',
        targetMemberProfileId: toText(voiceForm.targetMemberProfileId) || undefined,
        moderationAction: toText(voiceForm.moderationAction, 'MUTE').toUpperCase(),
        channelId: toText(voiceForm.channelId) || undefined,
        reason: toText(voiceForm.reason, 'Admin action'),
        durationSeconds: Math.max(0, Number(voiceForm.durationSeconds || 0)),
      };
      await invokeMemberFunction('updateCommsConsole', payload);
      await refreshModerationSignals();
      pushAction('ok', 'Voice moderation queued', `${payload.moderationAction} ${payload.targetMemberProfileId || payload.channelId || ''}`, 'QUEUED');
    });
  }, [pushAction, refreshModerationSignals, runTask, voiceForm]);

  const runTextModeration = useCallback(async () => {
    await runTask('text-moderation', async () => {
      const action = toText(textForm.action, 'DELETE_MESSAGE').toUpperCase();
      const channelId = toText(textForm.channelId);
      const targetMemberProfileId = toText(textForm.targetMemberProfileId);
      const messageId = toText(textForm.messageId);

      if (action === 'DELETE_MESSAGE') {
        if (!messageId) {
          pushAction('warning', 'Text moderation unavailable', 'Select a message before deleting.', 'UNAVAILABLE');
          return;
        }
        const messageEntity = base44?.entities?.Message;
        if (!messageEntity?.update) {
          pushAction('warning', 'Delete unavailable', 'Message entity is unavailable in this environment.', 'UNAVAILABLE');
          return;
        }
        await messageEntity.update(messageId, {
          is_deleted: true,
          deleted_by: actor.id || undefined,
          deleted_at: new Date().toISOString(),
          moderation_reason: toText(textForm.reason, 'Admin moderation action'),
        });
        pushAction('ok', 'Message moderated', `Deleted ${messageId}.`);
      }

      if (action === 'MUTE_CHANNEL_USER') {
        if (!channelId || !targetMemberProfileId) {
          pushAction('warning', 'Mute unavailable', 'Select channel and target member to apply a mute.', 'UNAVAILABLE');
          return;
        }
        const muteEntity = base44?.entities?.ChannelMute;
        if (!muteEntity?.create) {
          pushAction('warning', 'Mute unavailable', 'Channel mute entity is unavailable.', 'UNAVAILABLE');
          return;
        }
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + Math.max(1, Number(textForm.durationMinutes || 60)));
        await muteEntity.create({
          channel_id: channelId,
          member_profile_id: targetMemberProfileId,
          user_id: targetMemberProfileId,
          muted_by_member_profile_id: actor.id || undefined,
          muted_by: actor.id || undefined,
          reason: toText(textForm.reason, 'Admin text moderation action'),
          expires_at: expiresAt.toISOString(),
          is_active: true,
        });
        pushAction('warning', 'Channel mute applied', `${targetMemberProfileId} muted in ${channelId}.`);
      }

      if (action === 'UNMUTE_CHANNEL_USER') {
        if (!channelId || !targetMemberProfileId) {
          pushAction('warning', 'Unmute unavailable', 'Select channel and target member to remove mute.', 'UNAVAILABLE');
          return;
        }
        const muteEntity = base44?.entities?.ChannelMute;
        if (!muteEntity?.filter || !muteEntity?.update) {
          pushAction('warning', 'Unmute unavailable', 'Channel mute entity is unavailable.', 'UNAVAILABLE');
          return;
        }
        const rows = await muteEntity.filter({ channel_id: channelId, member_profile_id: targetMemberProfileId, is_active: true });
        if (!Array.isArray(rows) || rows.length === 0) {
          pushAction('neutral', 'Unmute skipped', 'No active mute found for selected target.', 'UNAVAILABLE');
          return;
        }
        await muteEntity.update(rows[0].id, { is_active: false });
        pushAction('ok', 'Channel mute removed', `${targetMemberProfileId} unmuted in ${channelId}.`);
      }

      await refreshModerationSignals();
    });
  }, [actor.id, pushAction, refreshModerationSignals, runTask, textForm]);

  const combinedModerationFeed = useMemo(() => {
    const voiceRows = (Array.isArray(voiceModerationFeed) ? voiceModerationFeed : []).map((entry) => ({
      id: toText(entry?.id, createId()),
      source: 'voice',
      action: toText(entry?.moderation_action || entry?.moderationAction, 'ACTION'),
      target: toText(entry?.target_member_profile_id || entry?.targetMemberProfileId, '--'),
      channelId: toText(entry?.channel_id || entry?.channelId, '--'),
      reason: toText(entry?.reason, '--'),
      createdAt: entry?.created_date || entry?.createdAt || new Date().toISOString(),
    }));
    const textRows = (Array.isArray(textModerationFeed) ? textModerationFeed : []).map((entry) => ({
      id: toText(entry?.id, createId()),
      source: 'text',
      action: toText(entry?.moderation_action, 'ACTION'),
      target: toText(entry?.target_member_profile_id, '--'),
      channelId: toText(entry?.channel_id, '--'),
      reason: toText(entry?.reason, '--'),
      createdAt: entry?.created_date || new Date().toISOString(),
    }));
    return [...voiceRows, ...textRows].sort((left, right) => (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0));
  }, [textModerationFeed, voiceModerationFeed]);

  const moderationPager = useMemo(() => paginateList(combinedModerationFeed, moderationPage, ADMIN_PAGE_SIZES.moderation), [combinedModerationFeed, moderationPage]);
  useEffect(() => setModerationPage(moderationPager.page), [moderationPager.page]);

  const [permissionRules, setPermissionRules] = useState([]);
  const refreshPermissions = useCallback(async () => {
    const rows = await safeList('PanelPermission', '-created_date', 800);
    setPermissionRules(rows || []);
    pushAction('ok', 'Permissions refreshed', `${rows.length} panel permission rule(s) loaded.`);
  }, [pushAction]);

  const permissionSummary = useMemo(() => {
    const rows = Array.isArray(permissionRules) ? permissionRules : [];
    const roles = new Set();
    const panels = new Set();
    let activeRules = 0;
    let adminRules = 0;
    rows.forEach((row) => {
      roles.add(toText(row?.role_name));
      panels.add(toText(row?.panel_id));
      if (row?.is_active !== false) activeRules += 1;
      if (toText(row?.access_level).toLowerCase() === 'admin') adminRules += 1;
    });
    return {
      totalRules: rows.length,
      activeRules,
      adminRules,
      panelCount: Array.from(panels).filter(Boolean).length,
      roleCount: Array.from(roles).filter(Boolean).length,
    };
  }, [permissionRules]);

  const clearPermissionCacheAction = useCallback(() => {
    clearPermissionCache();
    pushAction('ok', 'Permission cache cleared', 'RBAC cache invalidated.');
  }, [pushAction]);

  const availableRoles = useMemo(() => {
    const defaults = ['admin', 'moderator', 'user', 'pilot', 'medic', 'logistics', 'scout'];
    const fromRules = permissionRules.map((entry) => toText(entry?.role_name)).filter(Boolean);
    const fromRanks = ADMIN_RANK_MODEL.map((rank) => `rank:${rank.toLowerCase()}`);
    return Array.from(new Set([...defaults, ...fromRules, ...fromRanks, ...actor.roles]));
  }, [actor.roles, permissionRules]);

  const [promotionProfiles, setPromotionProfiles] = useState([]);
  const [promotionAuditRows, setPromotionAuditRows] = useState([]);
  const [promotionPage, setPromotionPage] = useState(0);
  const [promotionSearch, setPromotionSearch] = useState('');
  const [selectedPromotionProfileId, setSelectedPromotionProfileId] = useState('');
  const [promotionTargetRank, setPromotionTargetRank] = useState('SCOUT');
  const [promotionReason, setPromotionReason] = useState('');
  const [promotionConfirmText, setPromotionConfirmText] = useState('');

  const refreshPromotions = useCallback(async () => {
    const [profiles, audits] = await Promise.all([
      safeList('MemberProfile', '-created_date', 600),
      safeList('AuditLog', '-created_date', 400),
    ]);
    setPromotionProfiles(profiles || []);
    setPromotionAuditRows((Array.isArray(audits) ? audits : []).filter((entry) => {
      const category = toText(entry?.category).toLowerCase();
      const action = toText(entry?.action).toLowerCase();
      return category.includes('promotion') || action.includes('rank');
    }));
    pushAction('ok', 'Promotion roster refreshed', `${profiles.length} member profile(s) loaded.`);
  }, [pushAction]);

  const filteredPromotionProfiles = useMemo(() => {
    const query = toText(promotionSearch).toLowerCase();
    if (!query) return promotionProfiles;
    return promotionProfiles.filter((entry) => {
      const haystack = `${entry?.callsign || ''} ${entry?.display_callsign || ''} ${entry?.username || ''} ${entry?.id || ''} ${normalizeRank(entry?.rank || 'VAGRANT')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [promotionProfiles, promotionSearch]);

  const promotionPager = useMemo(() => paginateList(filteredPromotionProfiles, promotionPage, ADMIN_PAGE_SIZES.promotions), [filteredPromotionProfiles, promotionPage]);
  const promotionAuditPager = useMemo(() => paginateList(promotionAuditRows, 0, ADMIN_PAGE_SIZES.audits), [promotionAuditRows]);
  useEffect(() => setPromotionPage(promotionPager.page), [promotionPager.page]);

  const selectedPromotionProfile = useMemo(() => promotionProfiles.find((entry) => toText(entry?.id) === toText(selectedPromotionProfileId)) || null, [promotionProfiles, selectedPromotionProfileId]);

  useEffect(() => {
    if (selectedPromotionProfileId && selectedPromotionProfile) return;
    const next = promotionProfiles[0] || null;
    setSelectedPromotionProfileId(toText(next?.id));
    setPromotionTargetRank(rankToNext(next?.rank || 'VAGRANT'));
  }, [promotionProfiles, selectedPromotionProfile, selectedPromotionProfileId]);

  const promotionAuthority = useMemo(() => {
    if (!selectedPromotionProfile) {
      return { allowed: false, reason: 'no_target', message: 'Select a member profile.' };
    }
    return validateRankChangePermission(actor, selectedPromotionProfile.rank, promotionTargetRank);
  }, [actor, promotionTargetRank, selectedPromotionProfile]);

  const runPromotion = useCallback(async () => {
    await runTask('promotion-update', async () => {
      if (featureFlags?.enableEntityMutations === false) {
        pushAction('warning', 'Promotion unavailable', 'Entity mutations are disabled by feature flag.', 'BLOCKED');
        return;
      }
      if (!selectedPromotionProfile) {
        pushAction('warning', 'Promotion blocked', 'Select a member before promoting.', 'BLOCKED');
        return;
      }
      if (!toText(promotionReason)) {
        pushAction('warning', 'Promotion blocked', 'A promotion reason is required.', 'BLOCKED');
        return;
      }
      const expectedToken = `PROMOTE ${toText(selectedPromotionProfile.callsign || selectedPromotionProfile.id).toUpperCase()}`;
      if (toText(promotionConfirmText).toUpperCase() !== expectedToken) {
        pushAction('warning', 'Promotion blocked', `Typed confirmation must match: ${expectedToken}`, 'BLOCKED');
        return;
      }

      const permissionCheck = validateRankChangePermission(actor, selectedPromotionProfile.rank, promotionTargetRank);
      if (!permissionCheck.allowed) {
        pushAction('warning', 'Promotion blocked', permissionCheck.message, 'BLOCKED');
        return;
      }

      const uniqueness = validatePioneerUniqueness(promotionProfiles, selectedPromotionProfile.id, promotionTargetRank);
      if (!uniqueness.allowed) {
        pushAction('warning', 'Promotion blocked', uniqueness.message, 'BLOCKED');
        return;
      }

      const memberEntity = base44?.entities?.MemberProfile;
      if (!memberEntity?.update) {
        pushAction('warning', 'Promotion unavailable', 'Member profile entity is unavailable.', 'UNAVAILABLE');
        return;
      }

      const targetRank = normalizeRank(promotionTargetRank);
      const targetMembership = normalizeMembership(targetRank, selectedPromotionProfile.membership);
      const nextRoles = new Set(normalizeRoles(selectedPromotionProfile.roles));
      if (targetRank === 'COMMANDER') nextRoles.add('command');
      if (targetRank === 'PIONEER' || targetRank === 'FOUNDER') nextRoles.add('admin');

      await memberEntity.update(selectedPromotionProfile.id, {
        rank: targetRank,
        membership: targetMembership,
        roles: Array.from(nextRoles),
        last_promotion_reason: promotionReason,
        last_promoted_at: new Date().toISOString(),
      });

      const auditEntity = base44?.entities?.AuditLog;
      if (auditEntity?.create) {
        await auditEntity.create({
          category: 'PROMOTION',
          action: 'RANK_CHANGE',
          details: {
            source: 'admin-focus-v2',
            memberProfileId: selectedPromotionProfile.id,
            previousRank: normalizeRank(selectedPromotionProfile.rank),
            targetRank,
            previousMembership: toText(selectedPromotionProfile.membership),
            targetMembership,
            reason: promotionReason,
            actorId: actor.id || null,
            opId: opId || null,
          },
        }).catch(() => undefined);
      }

      setPromotionReason('');
      setPromotionConfirmText('');
      pushAction('ok', 'Promotion applied', `${toText(selectedPromotionProfile.callsign || selectedPromotionProfile.id)} -> ${targetRank}`);
      await refreshPromotions();
      await refreshIdentityAccess();
    });
  }, [
    actor,
    featureFlags?.enableEntityMutations,
    opId,
    promotionConfirmText,
    promotionProfiles,
    promotionReason,
    promotionTargetRank,
    pushAction,
    refreshIdentityAccess,
    refreshPromotions,
    runTask,
    selectedPromotionProfile,
  ]);

  const actionPager = useMemo(() => paginateList(actionFeed, actionPage, ADMIN_PAGE_SIZES.logs), [actionFeed, actionPage]);
  useEffect(() => setActionPage(actionPager.page), [actionPager.page]);

  const boot = useCallback(async () => {
    if (!hasAdminAccess) return;
    await Promise.all([
      refreshDomainCounts(),
      refreshIdentityAccess(),
      refreshModerationSignals(),
      refreshPermissions(),
      refreshPromotions(),
    ]);
  }, [hasAdminAccess, refreshDomainCounts, refreshIdentityAccess, refreshModerationSignals, refreshPermissions, refreshPromotions]);

  useEffect(() => {
    void boot();
  }, [boot]);

  return {
    actor,
    hasAdminAccess,
    bypassEnabled,
    busyId,
    expandedView,
    openExpanded,
    closeExpanded,
    featureFlags: {
      progressiveParity: featureFlags?.progressiveParity !== false,
      enableQaTools: featureFlags?.enableQaTools !== false,
      enableEntityMutations: featureFlags?.enableEntityMutations !== false,
    },
    action: {
      feed: actionFeed,
      pager: actionPager,
      setPage: setActionPage,
      pushAction,
      toClock,
    },
    db: {
      domainRows,
      domainPager,
      setDomainPage,
      totalDomainRecords,
      activeDomainCount,
      integritySnapshot,
      dbQueryEntity,
      setDbQueryEntity,
      dbQueryLimit,
      setDbQueryLimit,
      dbQueryRows,
      dbQueryError,
      runDbQuery,
      exportDbRows,
      refreshDomainCounts: () => runTask('refresh-domain-counts', refreshDomainCounts),
      runValidation,
      runRepair,
      runSeed,
      runWipeSeeded,
      safeWipeArmed,
      setSafeWipeArmed,
      preserveSeededOnSafeWipe,
      setPreserveSeededOnSafeWipe,
      runSafeWipe,
      protectedDomainKeys: PROTECTED_DOMAIN_KEYS,
      queryAllowlist: DB_QUERY_ALLOWLIST,
    },
    identity: {
      directoryUsers,
      selectedDirectoryUser,
      keyRows,
      keyAuditRows,
      keyAuditPager,
      userPager,
      keyPager,
      setUserPage: setIdentityUserPage,
      setKeyPage: setIdentityKeyPage,
      identityUserSearch,
      setIdentityUserSearch,
      identityKeySearch,
      setIdentityKeySearch,
      selectedIdentityUserId,
      setSelectedIdentityUserId,
      identityRank,
      setIdentityRank,
      identityMembership,
      setIdentityMembership,
      inviteMessage,
      setInviteMessage,
      activeSelectedUserKeys,
      refreshIdentityAccess: () => runTask('refresh-identity', refreshIdentityAccess),
      issueBoundAccessKey,
      revokeKeyById,
      revokeAllSelectedUserKeys,
      generateInviteForKey,
      copyToClipboard,
      maskKeyCode,
      rankModel: ADMIN_RANK_MODEL,
      membershipList: MEMBERSHIP_LIST,
    },
    moderation: {
      channels: moderationChannels,
      messages: moderationMessages,
      combinedFeed: combinedModerationFeed,
      pager: moderationPager,
      setModerationPage,
      voiceForm,
      setVoiceForm,
      textForm,
      setTextForm,
      refreshModerationSignals: () => runTask('refresh-moderation', refreshModerationSignals),
      runVoiceModeration,
      runTextModeration,
    },
    permissions: {
      rules: permissionRules,
      summary: permissionSummary,
      availableRoles,
      availablePanels: DEFAULT_PERMISSION_PANELS,
      refreshPermissions: () => runTask('refresh-permissions', refreshPermissions),
      clearPermissionCache: clearPermissionCacheAction,
      topRules: paginateList(permissionRules, 0, ADMIN_PAGE_SIZES.logs).visible,
    },
    promotions: {
      profiles: promotionProfiles,
      filteredProfiles: filteredPromotionProfiles,
      pager: promotionPager,
      setPromotionPage,
      search: promotionSearch,
      setSearch: setPromotionSearch,
      selectedProfile: selectedPromotionProfile,
      selectedProfileId: selectedPromotionProfileId,
      setSelectedProfileId: setSelectedPromotionProfileId,
      targetRank: promotionTargetRank,
      setTargetRank: setPromotionTargetRank,
      reason: promotionReason,
      setReason: setPromotionReason,
      confirmText: promotionConfirmText,
      setConfirmText: setPromotionConfirmText,
      authority: promotionAuthority,
      auditRows: promotionAuditRows,
      auditPager: promotionAuditPager,
      refreshPromotions: () => runTask('refresh-promotions', refreshPromotions),
      runPromotion,
      rankModel: ADMIN_RANK_MODEL,
    },
  };
}
