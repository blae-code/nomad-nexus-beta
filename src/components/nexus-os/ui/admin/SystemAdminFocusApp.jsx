import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Compass,
  Copy,
  Key,
  Lock,
  Radio,
  RefreshCcw,
  Rocket,
  ShieldCheck,
  Trash2,
  Wrench,
} from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { getDefaultMembershipForRank, MEMBERSHIP_LIST } from '@/components/constants/membership';
import { getMembershipLabel } from '@/components/constants/labels';
import {
  countAllDomains,
  repairAll,
  seedImmersive,
  validateAll,
  wipeAll,
  wipeSeededOnly,
} from '@/components/services/dataRegistry';

/**
 * @typedef {'SYSTEM_ADMIN' | 'PIONEER'} PersonaMode
 * @typedef {'neutral' | 'ok' | 'warning' | 'danger'} LogTone
 */

const PERSONA_STORAGE_KEY = 'nexus.admin.focus.persona';
const DOMAIN_PAGE_SIZE = 6;
const LOG_PAGE_SIZE = 5;
const PROTECTED_DOMAIN_KEYS = ['memberProfiles', 'accessKeys'];
const IDENTITY_USER_PAGE_SIZE = 5;
const IDENTITY_KEY_PAGE_SIZE = 6;
const RANK_OPTIONS = ['VAGRANT', 'SCOUT', 'VOYAGER', 'PIONEER', 'FOUNDER'];
const RANK_GRANTS_CONFIG = {
  VAGRANT: ['read_only'],
  SCOUT: ['read_only', 'comms_access'],
  VOYAGER: ['read_only', 'comms_access', 'event_creation'],
  PIONEER: ['read_only', 'comms_access', 'event_creation', 'fleet_management', 'voice_net_control'],
  FOUNDER: ['admin_access'],
};

function normalizeUsername(input) {
  return String(
    input?.display_callsign ||
      input?.callsign ||
      input?.username ||
      input?.full_name ||
      input?.email ||
      input?.id ||
      'Unknown'
  ).trim();
}

function normalizeDirectoryUsers(raw) {
  const mapped = (Array.isArray(raw) ? raw : []).map((entry) => ({
    id: String(entry?.id || '').trim(),
    username: normalizeUsername(entry),
    callsign: String(entry?.callsign || entry?.display_callsign || entry?.username || '').trim(),
    rank: String(entry?.rank || 'VAGRANT').toUpperCase(),
    membership: String(entry?.membership || getDefaultMembershipForRank(entry?.rank || 'VAGRANT')).toUpperCase(),
  }));
  return mapped.filter((entry) => Boolean(entry.id));
}

function normalizeAccessKeys(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((entry) => ({
      id: String(entry?.id || '').trim(),
      code: String(entry?.code || '').trim(),
      status: String(entry?.status || 'UNKNOWN').toUpperCase(),
      grants_rank: String(entry?.grants_rank || entry?.grantsRank || 'VAGRANT').toUpperCase(),
      grants_membership: String(
        entry?.grants_membership || entry?.grantsMembership || getDefaultMembershipForRank(entry?.grants_rank || entry?.grantsRank || 'VAGRANT')
      ).toUpperCase(),
      grants_roles: Array.isArray(entry?.grants_roles || entry?.grantsPermissions)
        ? [...(entry?.grants_roles || entry?.grantsPermissions)]
        : [],
      redeemed_by_member_profile_ids: Array.isArray(entry?.redeemed_by_member_profile_ids)
        ? [...entry.redeemed_by_member_profile_ids]
        : [],
      created_date: entry?.created_date || entry?.createdAt || '',
    }))
    .filter((entry) => Boolean(entry.id) && Boolean(entry.code));
}

function accessKeyTone(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'ACTIVE') return 'ok';
  if (normalized === 'REDEEMED') return 'active';
  if (normalized === 'REVOKED') return 'danger';
  if (normalized === 'EXPIRED') return 'warning';
  return 'neutral';
}

function maskKeyCode(code) {
  const normalized = String(code || '').trim();
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

function titleizeDomainKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()).trim();
}

function toneForLog(entry) {
  if (entry === 'ok') return 'ok';
  if (entry === 'warning') return 'warning';
  if (entry === 'danger') return 'danger';
  return 'neutral';
}

function formatClock(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--:--';
  return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function SystemAdminFocusApp({
  actorId,
  opId,
  operations = [],
  focusOperationId,
  onOpenMapFocus,
  onOpenOperationFocus,
  onOpenCommsNetwork,
  onCreateMacroEvent,
}) {
  const [persona, setPersona] = useState('SYSTEM_ADMIN');
  const [busyId, setBusyId] = useState('');
  const [domainCounts, setDomainCounts] = useState({});
  const [domainPage, setDomainPage] = useState(0);
  const [logPage, setLogPage] = useState(0);
  const [preserveSeededOnSafeWipe, setPreserveSeededOnSafeWipe] = useState(false);
  const [safeWipeArmed, setSafeWipeArmed] = useState(false);
  const [integritySnapshot, setIntegritySnapshot] = useState(null);
  const [actionLog, setActionLog] = useState([]);
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [accessKeys, setAccessKeys] = useState([]);
  const [identityUserSearch, setIdentityUserSearch] = useState('');
  const [identityKeySearch, setIdentityKeySearch] = useState('');
  const [identityUserPage, setIdentityUserPage] = useState(0);
  const [identityKeyPage, setIdentityKeyPage] = useState(0);
  const [selectedIdentityUserId, setSelectedIdentityUserId] = useState('');
  const [identityRank, setIdentityRank] = useState('VAGRANT');
  const [identityMembership, setIdentityMembership] = useState(getDefaultMembershipForRank('VAGRANT'));
  const [inviteMessage, setInviteMessage] = useState('');

  const focusOpId = String(focusOperationId || opId || operations[0]?.id || '');

  const pushLog = useCallback((tone, summary, detail) => {
    setActionLog((previous) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tone,
        summary,
        detail,
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ].slice(0, 30));
  }, []);

  const runTask = useCallback(
    async (id, task) => {
      setBusyId(id);
      try {
        await task();
      } catch (error) {
        pushLog('danger', 'Action failed', error?.message || 'Operation did not complete.');
      } finally {
        setBusyId('');
      }
    },
    [pushLog]
  );

  const refreshDomainCounts = useCallback(async () => {
    const counts = await countAllDomains();
    setDomainCounts(counts || {});
    const total = Object.values(counts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    pushLog('ok', 'Domain snapshot refreshed', `${total} total records across ${Object.keys(counts || {}).length} domains.`);
  }, [pushLog]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (stored === 'PIONEER' || stored === 'SYSTEM_ADMIN') {
      setPersona(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(PERSONA_STORAGE_KEY, persona);
  }, [persona]);

  useEffect(() => {
    void runTask('boot-snapshot', refreshDomainCounts);
  }, [runTask, refreshDomainCounts]);

  const sortedDomains = useMemo(() => {
    return Object.entries(domainCounts)
      .map(([key, count]) => ({ key, count: Number(count || 0), label: titleizeDomainKey(key) }))
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return left.label.localeCompare(right.label);
      });
  }, [domainCounts]);

  const domainPageCount = Math.max(1, Math.ceil(sortedDomains.length / DOMAIN_PAGE_SIZE));
  const visibleDomains = useMemo(
    () => sortedDomains.slice(domainPage * DOMAIN_PAGE_SIZE, domainPage * DOMAIN_PAGE_SIZE + DOMAIN_PAGE_SIZE),
    [sortedDomains, domainPage]
  );

  const logPageCount = Math.max(1, Math.ceil(actionLog.length / LOG_PAGE_SIZE));
  const visibleLogs = useMemo(
    () => actionLog.slice(logPage * LOG_PAGE_SIZE, logPage * LOG_PAGE_SIZE + LOG_PAGE_SIZE),
    [actionLog, logPage]
  );

  const totalRecords = useMemo(
    () => sortedDomains.reduce((sum, entry) => sum + entry.count, 0),
    [sortedDomains]
  );
  const nonEmptyDomains = useMemo(
    () => sortedDomains.filter((entry) => entry.count > 0).length,
    [sortedDomains]
  );

  useEffect(() => {
    setDomainPage((current) => Math.min(current, domainPageCount - 1));
  }, [domainPageCount]);

  useEffect(() => {
    setLogPage((current) => Math.min(current, logPageCount - 1));
  }, [logPageCount]);

  const directoryUserById = useMemo(
    () => new Map(directoryUsers.map((entry) => [entry.id, entry])),
    [directoryUsers]
  );

  const selectedDirectoryUser = useMemo(
    () => directoryUserById.get(selectedIdentityUserId) || null,
    [directoryUserById, selectedIdentityUserId]
  );

  const filteredDirectoryUsers = useMemo(() => {
    const query = identityUserSearch.trim().toLowerCase();
    if (!query) return directoryUsers;
    return directoryUsers.filter((entry) =>
      `${entry.username} ${entry.callsign} ${entry.rank} ${entry.membership}`.toLowerCase().includes(query)
    );
  }, [directoryUsers, identityUserSearch]);

  const identityUserPageCount = Math.max(1, Math.ceil(filteredDirectoryUsers.length / IDENTITY_USER_PAGE_SIZE));
  const visibleDirectoryUsers = useMemo(
    () =>
      filteredDirectoryUsers.slice(
        identityUserPage * IDENTITY_USER_PAGE_SIZE,
        identityUserPage * IDENTITY_USER_PAGE_SIZE + IDENTITY_USER_PAGE_SIZE
      ),
    [filteredDirectoryUsers, identityUserPage]
  );

  const keyRows = useMemo(() => {
    return accessKeys
      .map((entry) => {
        const boundMemberId = entry.redeemed_by_member_profile_ids[0] || '';
        const boundUser = boundMemberId ? directoryUserById.get(boundMemberId) : null;
        return {
          ...entry,
          boundMemberId,
          boundUsername: boundUser?.username || 'Unbound',
          boundCallsign: boundUser?.callsign || '--',
          hasBinding: Boolean(boundMemberId),
        };
      })
      .sort((left, right) => {
        const leftTime = Date.parse(String(left.created_date || '')) || 0;
        const rightTime = Date.parse(String(right.created_date || '')) || 0;
        return rightTime - leftTime;
      });
  }, [accessKeys, directoryUserById]);

  const filteredKeyRows = useMemo(() => {
    const query = identityKeySearch.trim().toLowerCase();
    const scoped = selectedIdentityUserId
      ? keyRows.filter((entry) => entry.boundMemberId === selectedIdentityUserId)
      : keyRows;
    if (!query) return scoped;
    return scoped.filter((entry) =>
      `${entry.code} ${entry.grants_rank} ${entry.grants_membership} ${entry.boundUsername} ${entry.boundCallsign} ${entry.status}`
        .toLowerCase()
        .includes(query)
    );
  }, [keyRows, identityKeySearch, selectedIdentityUserId]);

  const activeSelectedUserKeys = useMemo(
    () => filteredKeyRows.filter((entry) => entry.status === 'ACTIVE'),
    [filteredKeyRows]
  );

  const identityKeyPageCount = Math.max(1, Math.ceil(filteredKeyRows.length / IDENTITY_KEY_PAGE_SIZE));
  const visibleKeyRows = useMemo(
    () =>
      filteredKeyRows.slice(
        identityKeyPage * IDENTITY_KEY_PAGE_SIZE,
        identityKeyPage * IDENTITY_KEY_PAGE_SIZE + IDENTITY_KEY_PAGE_SIZE
      ),
    [filteredKeyRows, identityKeyPage]
  );

  useEffect(() => {
    setIdentityUserPage((current) => Math.min(current, identityUserPageCount - 1));
  }, [identityUserPageCount]);

  useEffect(() => {
    setIdentityKeyPage((current) => Math.min(current, identityKeyPageCount - 1));
  }, [identityKeyPageCount]);

  useEffect(() => {
    if (selectedIdentityUserId && directoryUserById.has(selectedIdentityUserId)) return;
    const firstUserId = directoryUsers[0]?.id || '';
    setSelectedIdentityUserId(firstUserId);
  }, [selectedIdentityUserId, directoryUserById, directoryUsers]);

  const parseResponseData = useCallback((response) => response?.data || response || {}, []);

  const refreshIdentityAccess = useCallback(async () => {
    const directoryResponse = await invokeMemberFunction('getUserDirectory', { includeDetails: false });
    const directoryPayload = parseResponseData(directoryResponse);
    const nextUsers = normalizeDirectoryUsers(directoryPayload?.members || []);

    const keyResponse = await invokeMemberFunction('listAccessKeys', { includeRevoked: true, limit: 1000 });
    const keyPayload = parseResponseData(keyResponse);
    const nextKeys = normalizeAccessKeys(keyPayload?.keys || []);

    setDirectoryUsers(nextUsers);
    setAccessKeys(nextKeys);
    pushLog('ok', 'Identity registry refreshed', `${nextUsers.length} users and ${nextKeys.length} access keys loaded.`);
  }, [parseResponseData, pushLog]);

  useEffect(() => {
    void runTask('identity-snapshot', refreshIdentityAccess);
  }, [runTask, refreshIdentityAccess]);

  const generateInviteForKey = useCallback(
    async (keyCode, rank, membership) => {
      const invitationResponse = await invokeMemberFunction('generateDiscordInvitation', {
        accessKeyCode: keyCode,
        accessKeyRank: rank,
        accessKeyMembership: membership,
        appUrl: typeof window !== 'undefined' ? window.location.origin : 'https://nomadnexus.space',
      });
      const payload = parseResponseData(invitationResponse);
      const inviteText = String(payload?.discord?.plainText || payload?.discord?.markdown || '').trim();
      if (inviteText) {
        setInviteMessage(inviteText);
      }
      return inviteText;
    },
    [parseResponseData]
  );

  const issueBoundAccessKey = useCallback(async () => {
    if (!selectedDirectoryUser) {
      pushLog('warning', 'No user selected', 'Select a user before issuing an access key.');
      return;
    }
    await runTask('identity-issue-key', async () => {
      const grantsMembership = String(identityMembership || getDefaultMembershipForRank(identityRank)).toUpperCase();
      const createResponse = await invokeMemberFunction('createAccessKey', {
        grantsRank: identityRank,
        grantsPermissions: RANK_GRANTS_CONFIG[identityRank] || [],
        grantsMembership,
        targetMemberProfileId: selectedDirectoryUser.id,
      });
      const payload = parseResponseData(createResponse);
      const createdKey = payload?.key;
      if (!createdKey?.id || !createdKey?.code) {
        throw new Error('Key generation did not return a valid access key.');
      }

      const inviteText = await generateInviteForKey(createdKey.code, identityRank, grantsMembership);
      await refreshIdentityAccess();
      pushLog(
        'ok',
        'Access key issued',
        `${selectedDirectoryUser.username} -> ${createdKey.code}${inviteText ? ' (invite prepared)' : ''}.`
      );
    });
  }, [
    selectedDirectoryUser,
    runTask,
    identityMembership,
    identityRank,
    parseResponseData,
    generateInviteForKey,
    refreshIdentityAccess,
    pushLog,
  ]);

  const revokeKeyById = useCallback(
    async (keyId, code) => {
      const approved = window.confirm(`Revoke access key ${code}?`);
      if (!approved) return;
      await runTask(`identity-revoke-${keyId}`, async () => {
        await invokeMemberFunction('revokeAccessKey', { keyId });
        await invokeMemberFunction('logAccessKeyAudit', {
          access_key_id: keyId,
          action: 'REVOKE',
          details: { reason: 'Admin focus revoke action' },
        }).catch(() => undefined);
        await refreshIdentityAccess();
        pushLog('warning', 'Access key revoked', `${code} revoked.`);
      });
    },
    [runTask, refreshIdentityAccess, pushLog]
  );

  const revokeAllSelectedUserKeys = useCallback(async () => {
    if (!selectedDirectoryUser) {
      pushLog('warning', 'No user selected', 'Select a user before revoking access.');
      return;
    }
    const allUserKeys = keyRows.filter(
      (entry) => entry.boundMemberId === selectedDirectoryUser.id && entry.status === 'ACTIVE'
    );
    if (!allUserKeys.length) {
      pushLog('warning', 'No active keys', `${selectedDirectoryUser.username} has no active keys to revoke.`);
      return;
    }
    const approved = window.confirm(`Revoke ${allUserKeys.length} active key(s) for ${selectedDirectoryUser.username}?`);
    if (!approved) return;
    await runTask('identity-revoke-user', async () => {
      for (const row of allUserKeys) {
        await invokeMemberFunction('revokeAccessKey', { keyId: row.id });
      }
      await refreshIdentityAccess();
      pushLog('warning', 'User access revoked', `${allUserKeys.length} active key(s) revoked for ${selectedDirectoryUser.username}.`);
    });
  }, [selectedDirectoryUser, keyRows, runTask, refreshIdentityAccess, pushLog]);

  const copyToClipboard = useCallback((value, summary) => {
    if (!value) return;
    void navigator.clipboard.writeText(value).then(() => {
      pushLog('ok', summary, value.length > 64 ? `${value.slice(0, 60)}...` : value);
    });
  }, [pushLog]);

  const invokeQuickOpen = useCallback(
    (label, fn) => {
      if (!fn) {
        pushLog('warning', `${label} unavailable`, 'No handler is registered in this workspace context.');
        return;
      }
      fn();
      pushLog('ok', `${label} opened`, 'Focus switched through admin command surface.');
    },
    [pushLog]
  );

  const runIntegrityValidation = useCallback(async () => {
     await runTask('validate', async () => {
       const report = await validateAll();
      const issueCount = Array.isArray(report?.issues) ? report.issues.length : 0;
      const errorCount = Array.isArray(report?.issues)
        ? report.issues.filter((entry) => String(entry?.severity || '').toLowerCase() === 'error').length
        : 0;
      setIntegritySnapshot({
        at: new Date().toISOString(),
        totalRecords: Number(report?.totalRecords || 0),
        issueCount,
        errorCount,
      });
      pushLog(
        errorCount > 0 ? 'warning' : 'ok',
        'Validation complete',
        `${issueCount} issues flagged, ${errorCount} error-level findings.`
      );
    });
  }, [runTask, pushLog]);

  const runRepair = useCallback(async () => {
     await runTask('repair', async () => {
       const result = await repairAll();
      pushLog('ok', 'Repair routine finished', String(result?.message || 'Repair flow completed.'));
    });
  }, [runTask, pushLog]);

  const runSeed = useCallback(
    async (intensity) => {
       await runTask(`seed-${intensity}`, async () => {
         const result = await seedImmersive({ intensity });
        await refreshDomainCounts();
        pushLog(result?.success ? 'ok' : 'warning', `Seed ${intensity} executed`, String(result?.message || result?.error || 'Seed task finished.'));
      });
    },
    [runTask, refreshDomainCounts, pushLog]
  );

  const runWipeSeeded = useCallback(async () => {
    const approved = window.confirm('Delete seeded demo data only? Non-seeded records stay intact.');
    if (!approved) return;
    await runTask('wipe-seeded', async () => {
        const result = await wipeSeededOnly();
      await refreshDomainCounts();
      pushLog('warning', 'Seeded data purged', `${Number(result?.totalDeleted || 0)} seeded records removed.`);
    });
  }, [runTask, refreshDomainCounts, pushLog]);

  const runSafeWipe = useCallback(async () => {
    if (!safeWipeArmed) {
      pushLog('warning', 'Safe wipe blocked', 'Arm safe wipe before destructive operations.');
      return;
    }
    const approved = window.confirm(
      `Safe wipe deletes app data while preserving ${PROTECTED_DOMAIN_KEYS.join(', ')}. Continue?`
    );
    if (!approved) return;
    await runTask('safe-wipe', async () => {
      const result = await wipeAll({
        preserveSeeded: preserveSeededOnSafeWipe,
        excludeDomainKeys: PROTECTED_DOMAIN_KEYS,
      });
      await refreshDomainCounts();
      setSafeWipeArmed(false);
      pushLog('danger', 'Safe wipe complete', `${Number(result?.totalDeleted || 0)} records deleted.`);
    });
  }, [safeWipeArmed, pushLog, runTask, preserveSeededOnSafeWipe, refreshDomainCounts]);

  const emitControlPulse = useCallback(() => {
    if (!onCreateMacroEvent) {
      pushLog('warning', 'Pulse unavailable', 'Macro event bridge is not available in this context.');
      return;
    }
    const directive = persona === 'PIONEER' ? 'PIONEER_CONTROL_PULSE' : 'ADMIN_CONTROL_PULSE';
    onCreateMacroEvent('SELF_CHECK', {
      directive,
      source: 'system-admin-focus',
      actorId,
      opId: focusOpId || undefined,
      scope: focusOpId ? 'OP' : 'FLEET',
      captureMetadata: {
        allowedSourceMode: 'MANUAL',
        commandSource: 'admin_focus',
      },
    });
    pushLog('ok', 'Control pulse dispatched', `Directive ${directive} emitted to event pipeline.`);
  }, [onCreateMacroEvent, persona, actorId, focusOpId, pushLog]);

  return (
    <div className="h-full min-h-0 overflow-hidden bg-zinc-950/45" data-admin-focus="true">
      <div className="h-full min-h-0 p-2 lg:p-3 grid grid-rows-[auto_minmax(0,1fr)] gap-2">
        <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">System Admin Focus</h3>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Control plane for administrators and pioneer-level operators
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <NexusBadge tone={persona === 'SYSTEM_ADMIN' ? 'active' : 'neutral'}>System Admin</NexusBadge>
              <NexusBadge tone={persona === 'PIONEER' ? 'active' : 'neutral'}>Pioneer</NexusBadge>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1">
            <NexusButton intent={persona === 'SYSTEM_ADMIN' ? 'primary' : 'subtle'} onClick={() => setPersona('SYSTEM_ADMIN')} className="h-7 text-xs px-2">
              <ShieldCheck className="w-3 h-3 mr-0.5" />
              System
            </NexusButton>
            <NexusButton intent={persona === 'PIONEER' ? 'primary' : 'subtle'} onClick={() => setPersona('PIONEER')} className="h-7 text-xs px-2">
              <Rocket className="w-3 h-3 mr-0.5" />
              Pioneer
            </NexusButton>
          </div>
        </section>

        <div className="min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2">
          <div className="min-h-0 lg:col-span-7 grid grid-rows-[auto_auto_auto_minmax(0,1fr)] gap-2">
            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Identity Access Control</h4>
                <div className="flex items-center gap-1.5">
                  <NexusBadge tone="neutral">{directoryUsers.length} users</NexusBadge>
                  <NexusBadge tone="active">{accessKeys.length} keys</NexusBadge>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-2">
                <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wide">User Directory</div>
                    <NexusButton intent="subtle" onClick={() => void runTask('identity-refresh', refreshIdentityAccess)} disabled={Boolean(busyId)}>
                      <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                      Refresh
                    </NexusButton>
                  </div>

                  <input
                    value={identityUserSearch}
                    onChange={(event) => setIdentityUserSearch(event.target.value)}
                    placeholder="Search username/callsign"
                    className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  />

                  <div className="space-y-1">
                    {visibleDirectoryUsers.length ? (
                      visibleDirectoryUsers.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setSelectedIdentityUserId(entry.id);
                            setIdentityRank(entry.rank);
                            setIdentityMembership(entry.membership || getDefaultMembershipForRank(entry.rank));
                          }}
                          className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
                            selectedIdentityUserId === entry.id
                              ? 'border-orange-500/50 bg-orange-500/10'
                              : 'border-zinc-800/70 bg-zinc-950/35 hover:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] text-zinc-100 uppercase tracking-wide truncate">{entry.username}</span>
                            <NexusBadge tone="neutral">{entry.rank}</NexusBadge>
                          </div>
                          <div className="mt-1 text-[10px] text-zinc-500 truncate">
                            {entry.callsign || '--'} · {getMembershipLabel(entry.membership)}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded border border-zinc-800/70 bg-zinc-950/35 px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-wide">
                        No users matched.
                      </div>
                    )}
                  </div>

                  {identityUserPageCount > 1 ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <NexusButton intent="subtle" onClick={() => setIdentityUserPage((page) => Math.max(0, page - 1))} disabled={identityUserPage === 0}>
                        Prev
                      </NexusButton>
                      <NexusBadge tone="neutral">{identityUserPage + 1}/{identityUserPageCount}</NexusBadge>
                      <NexusButton
                        intent="subtle"
                        onClick={() => setIdentityUserPage((page) => Math.min(identityUserPageCount - 1, page + 1))}
                        disabled={identityUserPage >= identityUserPageCount - 1}
                      >
                        Next
                      </NexusButton>
                    </div>
                  ) : null}
                </div>

                <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-2">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Key + Invite Actions</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                    value={identityRank}
                    onChange={(event) => {
                    const nextRank = event.target.value;
                        setIdentityRank(nextRank);
                        setIdentityMembership(getDefaultMembershipForRank(nextRank));
                      }}
                      className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                    >
                      {RANK_OPTIONS.map((rank) => (
                        <option key={rank} value={rank}>
                          {rank}
                        </option>
                      ))}
                    </select>
                    <select
                      value={identityMembership}
                      onChange={(event) => setIdentityMembership(event.target.value)}
                      className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                    >
                      {MEMBERSHIP_LIST.map((entry) => (
                        <option key={entry} value={entry}>
                          {getMembershipLabel(entry)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <NexusButton intent="primary" onClick={() => void issueBoundAccessKey()} disabled={Boolean(busyId) || !selectedIdentityUserId}>
                      <Key className="w-3.5 h-3.5 mr-1" />
                      Issue Key
                    </NexusButton>
                    <NexusButton intent="danger" onClick={() => void revokeAllSelectedUserKeys()} disabled={Boolean(busyId) || !selectedIdentityUserId}>
                      <Lock className="w-3.5 h-3.5 mr-1" />
                      Revoke User Keys
                    </NexusButton>
                    <NexusButton
                      intent="subtle"
                      onClick={() => copyToClipboard(inviteMessage, 'Invitation copied')}
                      disabled={!inviteMessage}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Invite
                    </NexusButton>
                  </div>

                  <input
                    value={identityKeySearch}
                    onChange={(event) => setIdentityKeySearch(event.target.value)}
                    placeholder={selectedDirectoryUser ? `Filter keys for ${selectedDirectoryUser.username}` : 'Filter key list'}
                    className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  />

                  <div className="rounded border border-zinc-800/70 bg-zinc-950/35 p-2 space-y-1">
                    {selectedDirectoryUser ? (
                      <>
                        <div className="text-[11px] text-zinc-100 uppercase tracking-wide truncate">{selectedDirectoryUser.username}</div>
                        <div className="text-[10px] text-zinc-500">
                          Active keys in scope: {activeSelectedUserKeys.length}
                        </div>
                      </>
                    ) : (
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Select a user to bind key actions.</div>
                    )}
                  </div>

                  {inviteMessage ? (
                    <div className="rounded border border-zinc-800/70 bg-zinc-950/35 p-2">
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Latest Invitation</div>
                      <pre className="text-[10px] text-zinc-500 whitespace-pre-wrap line-clamp-4">{inviteMessage}</pre>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Integrity + Lifecycle</h4>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{busyId ? 'Running' : 'Ready'}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 xl:grid-cols-4 gap-1.5">
                <NexusButton intent="subtle" onClick={() => void runTask('refresh-counts', refreshDomainCounts)} disabled={Boolean(busyId)}>
                  <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                  Refresh
                </NexusButton>
                <NexusButton intent="subtle" onClick={() => void runIntegrityValidation()} disabled={Boolean(busyId)}>
                  Validate
                </NexusButton>
                <NexusButton intent="subtle" onClick={() => void runRepair()} disabled={Boolean(busyId)}>
                  <Wrench className="w-3.5 h-3.5 mr-1" />
                  Repair
                </NexusButton>
                <NexusButton intent="subtle" onClick={() => void runWipeSeeded()} disabled={Boolean(busyId)}>
                  Seed Purge
                </NexusButton>
                <NexusButton intent="subtle" onClick={() => void runSeed('light')} disabled={Boolean(busyId)}>
                  Seed Light
                </NexusButton>
                <NexusButton intent="subtle" onClick={() => void runSeed('full')} disabled={Boolean(busyId)}>
                  Seed Full
                </NexusButton>
                <label className="col-span-2 flex items-center gap-2 rounded border border-zinc-700/50 bg-zinc-950/40 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={preserveSeededOnSafeWipe}
                    onChange={(event) => setPreserveSeededOnSafeWipe(event.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Preserve seeded on safe wipe</span>
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-2 rounded border border-red-700/40 bg-red-950/20 px-2 py-1">
                  <input
                    type="checkbox"
                    checked={safeWipeArmed}
                    onChange={(event) => setSafeWipeArmed(event.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[10px] text-red-200 uppercase tracking-wide">Arm safe wipe</span>
                </label>
                <NexusButton intent="danger" onClick={() => void runSafeWipe()} disabled={Boolean(busyId) || !safeWipeArmed}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Safe Wipe
                </NexusButton>
              </div>
            </section>

            <section className="min-h-0 rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Domain Footprint</h4>
                <div className="flex items-center gap-1.5">
                  <NexusBadge tone="neutral">{nonEmptyDomains} active</NexusBadge>
                  <NexusBadge tone="active">{totalRecords} records</NexusBadge>
                </div>
              </div>
              <div className="mt-2 flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_auto] gap-2">
                <div className="space-y-1">
                  {visibleDomains.length ? (
                    visibleDomains.map((entry) => (
                      <div key={entry.key} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-zinc-300 uppercase tracking-wide truncate">{entry.label}</span>
                        <span className="text-[11px] font-mono text-zinc-100">{entry.count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-3 text-[10px] text-zinc-500 uppercase tracking-wide">
                      No domain counts captured yet.
                    </div>
                  )}
                </div>
                {domainPageCount > 1 ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <NexusButton intent="subtle" onClick={() => setDomainPage((page) => Math.max(0, page - 1))} disabled={domainPage === 0}>
                      Prev
                    </NexusButton>
                    <NexusBadge tone="neutral">{domainPage + 1}/{domainPageCount}</NexusBadge>
                    <NexusButton
                      intent="subtle"
                      onClick={() => setDomainPage((page) => Math.min(domainPageCount - 1, page + 1))}
                      disabled={domainPage >= domainPageCount - 1}
                    >
                      Next
                    </NexusButton>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <div className="min-h-0 lg:col-span-5 grid grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
            <section className="min-h-0 rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Auth Key Registry</h4>
                <NexusBadge tone="neutral">{filteredKeyRows.length}</NexusBadge>
              </div>
              <div className="mt-2 flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_auto] gap-2">
                <div className="space-y-1">
                  {visibleKeyRows.length ? (
                    visibleKeyRows.map((row) => (
                      <div key={row.id} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-zinc-100 font-mono truncate">{maskKeyCode(row.code)}</span>
                          <NexusBadge tone={accessKeyTone(row.status)}>{row.status}</NexusBadge>
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500 truncate">
                          {row.boundUsername} · {row.grants_rank}/{getMembershipLabel(row.grants_membership)}
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-1.5">
                          <NexusButton intent="subtle" onClick={() => copyToClipboard(row.code, 'Access key copied')}>
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copy
                          </NexusButton>
                          <NexusButton
                            intent="subtle"
                            onClick={() => void runTask(`identity-invite-${row.id}`, async () => {
                              const invite = await generateInviteForKey(row.code, row.grants_rank, row.grants_membership);
                              pushLog('ok', 'Invitation retrieved', invite ? `Invite generated for ${row.boundUsername}.` : `No invite template for ${row.code}.`);
                            })}
                            disabled={Boolean(busyId)}
                          >
                            Invite
                          </NexusButton>
                          {row.status === 'ACTIVE' ? (
                            <NexusButton
                              intent="danger"
                              onClick={() => void revokeKeyById(row.id, row.code)}
                              disabled={Boolean(busyId)}
                            >
                              Revoke
                            </NexusButton>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-3 text-[10px] text-zinc-500 uppercase tracking-wide">
                      No keys matched the current scope.
                    </div>
                  )}
                </div>
                {identityKeyPageCount > 1 ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <NexusButton intent="subtle" onClick={() => setIdentityKeyPage((page) => Math.max(0, page - 1))} disabled={identityKeyPage === 0}>
                      Prev
                    </NexusButton>
                    <NexusBadge tone="neutral">{identityKeyPage + 1}/{identityKeyPageCount}</NexusBadge>
                    <NexusButton intent="subtle" onClick={() => setIdentityKeyPage((page) => Math.min(identityKeyPageCount - 1, page + 1))} disabled={identityKeyPage >= identityKeyPageCount - 1}>
                      Next
                    </NexusButton>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="min-h-0 rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Action Feed</h4>
                <NexusBadge tone="neutral">{actionLog.length}</NexusBadge>
              </div>
              <div className="mt-2 flex-1 min-h-0 grid grid-rows-[minmax(0,1fr)_auto] gap-2">
                <div className="space-y-1">
                  {visibleLogs.length ? (
                    visibleLogs.map((entry) => (
                      <div key={entry.id} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{entry.summary}</span>
                          <NexusBadge tone={toneForLog(entry.tone)}>{formatClock(entry.createdAt)}</NexusBadge>
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500 truncate">{entry.detail}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-3 text-[10px] text-zinc-500 uppercase tracking-wide">
                      No actions executed yet.
                    </div>
                  )}
                </div>
                {logPageCount > 1 ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <NexusButton intent="subtle" onClick={() => setLogPage((page) => Math.max(0, page - 1))} disabled={logPage === 0}>
                      Prev
                    </NexusButton>
                    <NexusBadge tone="neutral">{logPage + 1}/{logPageCount}</NexusBadge>
                    <NexusButton intent="subtle" onClick={() => setLogPage((page) => Math.min(logPageCount - 1, page + 1))} disabled={logPage >= logPageCount - 1}>
                      Next
                    </NexusButton>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Protection Rails</h4>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {PROTECTED_DOMAIN_KEYS.map((key) => (
                  <NexusBadge key={key} tone="warning" className="justify-center">
                    {titleizeDomainKey(key)}
                  </NexusBadge>
                ))}
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 uppercase tracking-wide">
                Protected domains are excluded from safe wipe workflows.
              </div>
              {integritySnapshot ? (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <NexusBadge tone={integritySnapshot.errorCount > 0 ? 'danger' : 'ok'}>
                    Errors {integritySnapshot.errorCount}
                  </NexusBadge>
                  <NexusBadge tone={integritySnapshot.issueCount > 0 ? 'warning' : 'ok'}>
                    Issues {integritySnapshot.issueCount}
                  </NexusBadge>
                  <NexusBadge tone="neutral">Records {integritySnapshot.totalRecords}</NexusBadge>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
