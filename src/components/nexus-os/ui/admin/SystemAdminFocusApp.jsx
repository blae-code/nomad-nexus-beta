import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ClipboardList,
  Copy,
  Database,
  ExternalLink,
  Key,
  Lock,
  RefreshCcw,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';
import { getMembershipLabel } from '@/components/constants/labels';
import { navigateToPage } from '@/utils';
import RolePermissionManager from '@/components/admin/RolePermissionManager';
import AccessKeyAuditLog from '@/components/admin/AccessKeyAuditLog';
import AdminExpandDrawer from './AdminExpandDrawer';
import useAdminFocusRuntime from './useAdminFocusRuntime';

function Pager({ page, pageCount, onPrev, onNext }) {
  if (pageCount <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <NexusButton intent="subtle" onClick={onPrev} disabled={page <= 0}>Prev</NexusButton>
      <NexusBadge tone="neutral">{page + 1}/{pageCount}</NexusBadge>
      <NexusButton intent="subtle" onClick={onNext} disabled={page >= pageCount - 1}>Next</NexusButton>
    </div>
  );
}

function actionTone(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'FAILED' || normalized === 'BLOCKED') return 'danger';
  if (normalized === 'QUEUED' || normalized === 'UNAVAILABLE') return 'warning';
  return 'ok';
}

export default function SystemAdminFocusApp({
  actorId,
  opId,
  operations = [],
  focusOperationId,
  experienceMode = 'admin-core-v2',
  actorProfile,
  featureFlags,
  onOpenExpandedAdmin,
}) {
  const activeOpId = String(focusOperationId || opId || operations[0]?.id || '');

  const runtime = useAdminFocusRuntime({
    actorProfile: actorProfile || { id: actorId, rank: 'VAGRANT', roles: [], isAdmin: false },
    opId: activeOpId,
    featureFlags,
    onOpenExpandedAdmin,
  });

  const drawerConfig = useMemo(() => {
    const view = runtime.expandedView;
    if (!view) return { title: '', subtitle: '', count: 0 };
    if (view === 'database') return { title: 'Database Explorer', subtitle: 'Allowlisted entity query + export', count: runtime.db.dbQueryRows.length };
    if (view === 'keys') return { title: 'Auth Key Audit', subtitle: 'Access key timeline', count: runtime.identity.keyAuditRows.length };
    if (view === 'moderation') return { title: 'Moderation Timeline', subtitle: 'Voice and text actions', count: runtime.moderation.combinedFeed.length };
    if (view === 'permissions') return { title: 'RBAC Manager', subtitle: 'Role and panel rules', count: runtime.permissions.rules.length };
    if (view === 'promotions') return { title: 'Promotion Audit', subtitle: 'Rank changes and guardrails', count: runtime.promotions.auditRows.length };
    if (view === 'qa') return { title: 'QA Legacy Surface', subtitle: 'Fallback route', count: 0 };
    if (view === 'diagnostics') return { title: 'Diagnostics Legacy Surface', subtitle: 'Fallback route', count: 0 };
    if (view === 'integrations') return { title: 'Integrations Legacy Surface', subtitle: 'Fallback route', count: 0 };
    return { title: 'Expanded View', subtitle: 'Admin detail surface', count: 0 };
  }, [
    runtime.db.dbQueryRows.length,
    runtime.expandedView,
    runtime.identity.keyAuditRows.length,
    runtime.moderation.combinedFeed.length,
    runtime.permissions.rules.length,
    runtime.promotions.auditRows.length,
  ]);

  if (!runtime.hasAdminAccess) {
    return (
      <div className="h-full min-h-0 overflow-hidden bg-zinc-950/45" data-admin-focus="true">
        <div className="h-full min-h-0 p-3 grid place-items-center">
          <div className="w-full max-w-lg rounded-md border border-red-600/40 bg-red-950/20 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-300 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-red-200">Admin Focus Locked</div>
                <p className="mt-1 text-[11px] text-red-100/80">
                  Admin clearance is required to access this command surface.
                </p>
                {runtime.bypassEnabled ? (
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-300">Local bypass flag detected.</p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-hidden bg-zinc-950/45" data-admin-focus="true" data-admin-experience={experienceMode}>
      <div className="h-full min-h-0 p-2 lg:p-3 grid grid-rows-[auto_minmax(0,1fr)] gap-2">
        <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">System Admin Focus</h3>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wide truncate">
                Admin-only core control plane · no-scroll cards + explicit expand drawers
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <NexusBadge tone="active">{runtime.actor.rank}</NexusBadge>
              <NexusBadge tone="neutral">{runtime.featureFlags.progressiveParity ? 'Progressive' : 'Strict'}</NexusBadge>
            </div>
          </div>
        </section>

        <div className="min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-2">
          <div className="min-h-0 xl:col-span-7 grid grid-rows-[auto_auto_minmax(0,1fr)] gap-2">
            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Identity + Auth Keys</h4>
                <div className="flex items-center gap-1.5">
                  <NexusBadge tone="neutral">{runtime.identity.directoryUsers.length} users</NexusBadge>
                  <NexusBadge tone="active">{runtime.identity.keyRows.length} keys</NexusBadge>
                  <NexusButton intent="subtle" onClick={() => runtime.openExpanded('keys')}>Expand</NexusButton>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 2xl:grid-cols-2 gap-2">
                <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Directory</div>
                    <NexusButton intent="subtle" onClick={runtime.identity.refreshIdentityAccess} disabled={Boolean(runtime.busyId)}>
                      <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                      Refresh
                    </NexusButton>
                  </div>
                  <input
                    value={runtime.identity.identityUserSearch}
                    onChange={(event) => runtime.identity.setIdentityUserSearch(event.target.value)}
                    placeholder="Search user/callsign"
                    className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  />
                  <div className="space-y-1">
                    {runtime.identity.userPager.visible.length ? runtime.identity.userPager.visible.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => {
                          runtime.identity.setSelectedIdentityUserId(entry.id);
                          runtime.identity.setIdentityRank(entry.rank);
                          runtime.identity.setIdentityMembership(entry.membership);
                        }}
                        className={`w-full rounded border px-2 py-1.5 text-left transition-colors ${
                          runtime.identity.selectedIdentityUserId === entry.id
                            ? 'border-orange-500/50 bg-orange-500/10'
                            : 'border-zinc-800/70 bg-zinc-950/35 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-zinc-100 uppercase tracking-wide truncate">{entry.username}</span>
                          <NexusBadge tone="neutral">{entry.rank}</NexusBadge>
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500 truncate">{entry.callsign || '--'} · {getMembershipLabel(entry.membership)}</div>
                      </button>
                    )) : (
                      <div className="rounded border border-zinc-800/70 bg-zinc-950/35 px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-wide">
                        No users matched.
                      </div>
                    )}
                  </div>
                  <Pager
                    page={runtime.identity.userPager.page}
                    pageCount={runtime.identity.userPager.pageCount}
                    onPrev={() => runtime.identity.setUserPage((page) => Math.max(0, page - 1))}
                    onNext={() => runtime.identity.setUserPage((page) => Math.min(runtime.identity.userPager.pageCount - 1, page + 1))}
                  />
                </div>

                <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-2">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Key Operations</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={runtime.identity.identityRank}
                      onChange={(event) => {
                        const rank = event.target.value;
                        runtime.identity.setIdentityRank(rank);
                        runtime.identity.setIdentityMembership(runtime.identity.membershipList.includes(rank) ? rank : runtime.identity.identityMembership);
                      }}
                      className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                    >
                      {runtime.identity.rankModel.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
                    </select>
                    <select
                      value={runtime.identity.identityMembership}
                      onChange={(event) => runtime.identity.setIdentityMembership(event.target.value)}
                      className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                    >
                      {runtime.identity.membershipList.map((membership) => (
                        <option key={membership} value={membership}>{getMembershipLabel(membership)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <NexusButton intent="primary" onClick={runtime.identity.issueBoundAccessKey} disabled={Boolean(runtime.busyId) || !runtime.identity.selectedIdentityUserId}>
                      <Key className="w-3.5 h-3.5 mr-1" />Issue
                    </NexusButton>
                    <NexusButton intent="danger" onClick={runtime.identity.revokeAllSelectedUserKeys} disabled={Boolean(runtime.busyId) || !runtime.identity.selectedIdentityUserId}>
                      <Lock className="w-3.5 h-3.5 mr-1" />Revoke
                    </NexusButton>
                    <NexusButton intent="subtle" onClick={() => runtime.identity.copyToClipboard(runtime.identity.inviteMessage, 'Invitation copied')} disabled={!runtime.identity.inviteMessage}>
                      <Copy className="w-3.5 h-3.5 mr-1" />Invite
                    </NexusButton>
                  </div>
                  <input
                    value={runtime.identity.identityKeySearch}
                    onChange={(event) => runtime.identity.setIdentityKeySearch(event.target.value)}
                    placeholder="Filter key rows"
                    className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  />
                  <div className="space-y-1">
                    {runtime.identity.keyPager.visible.length ? runtime.identity.keyPager.visible.map((row) => (
                      <div key={row.id} className="rounded border border-zinc-800/70 bg-zinc-950/35 px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-zinc-100 font-mono truncate">{row.maskedCode}</span>
                          <NexusBadge tone="neutral">{row.status}</NexusBadge>
                        </div>
                        <div className="mt-1 text-[10px] text-zinc-500 truncate">{row.boundUsername} · {row.grants_rank}/{getMembershipLabel(row.grants_membership)}</div>
                      </div>
                    )) : (
                      <div className="rounded border border-zinc-800/70 bg-zinc-950/35 px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-wide">No key rows matched.</div>
                    )}
                  </div>
                  <Pager
                    page={runtime.identity.keyPager.page}
                    pageCount={runtime.identity.keyPager.pageCount}
                    onPrev={() => runtime.identity.setKeyPage((page) => Math.max(0, page - 1))}
                    onNext={() => runtime.identity.setKeyPage((page) => Math.min(runtime.identity.keyPager.pageCount - 1, page + 1))}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Database Health</h4>
                <div className="flex items-center gap-1.5">
                  <NexusBadge tone="neutral">{runtime.db.activeDomainCount} active</NexusBadge>
                  <NexusBadge tone="active">{runtime.db.totalDomainRecords} records</NexusBadge>
                  <NexusButton intent="subtle" onClick={() => runtime.openExpanded('database')}>Expand</NexusButton>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 2xl:grid-cols-4 gap-1.5">
                <NexusButton intent="subtle" onClick={runtime.db.refreshDomainCounts} disabled={Boolean(runtime.busyId)}><RefreshCcw className="w-3.5 h-3.5 mr-1" />Refresh</NexusButton>
                <NexusButton intent="subtle" onClick={runtime.db.runValidation} disabled={Boolean(runtime.busyId)}>Validate</NexusButton>
                <NexusButton intent="subtle" onClick={runtime.db.runRepair} disabled={Boolean(runtime.busyId)}>Repair</NexusButton>
                <NexusButton intent="subtle" onClick={runtime.db.runWipeSeeded} disabled={Boolean(runtime.busyId)}>Seed Purge</NexusButton>
                <NexusButton intent="subtle" onClick={() => runtime.db.runSeed('light')} disabled={Boolean(runtime.busyId)}>Seed Light</NexusButton>
                <NexusButton intent="subtle" onClick={() => runtime.db.runSeed('full')} disabled={Boolean(runtime.busyId)}>Seed Full</NexusButton>
                <label className="col-span-2 flex items-center gap-2 rounded border border-zinc-700/50 bg-zinc-950/40 px-2 py-1">
                  <input type="checkbox" checked={runtime.db.preserveSeededOnSafeWipe} onChange={(event) => runtime.db.setPreserveSeededOnSafeWipe(event.target.checked)} className="h-3.5 w-3.5" />
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Preserve seeded on safe wipe</span>
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-2 rounded border border-red-700/40 bg-red-950/20 px-2 py-1">
                  <input type="checkbox" checked={runtime.db.safeWipeArmed} onChange={(event) => runtime.db.setSafeWipeArmed(event.target.checked)} className="h-3.5 w-3.5" />
                  <span className="text-[10px] text-red-200 uppercase tracking-wide">Arm safe wipe</span>
                </label>
                <NexusButton intent="danger" onClick={runtime.db.runSafeWipe} disabled={Boolean(runtime.busyId) || !runtime.db.safeWipeArmed}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />Safe Wipe
                </NexusButton>
              </div>
              <div className="mt-2 space-y-1">
                {runtime.db.domainPager.visible.length ? runtime.db.domainPager.visible.map((entry) => (
                  <div key={entry.key} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-300 uppercase tracking-wide truncate">{entry.label}</span>
                    <span className="text-[11px] font-mono text-zinc-100">{entry.count}</span>
                  </div>
                )) : (
                  <div className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-wide">No domain counts captured.</div>
                )}
              </div>
              <Pager
                page={runtime.db.domainPager.page}
                pageCount={runtime.db.domainPager.pageCount}
                onPrev={() => runtime.db.setDomainPage((page) => Math.max(0, page - 1))}
                onNext={() => runtime.db.setDomainPage((page) => Math.min(runtime.db.domainPager.pageCount - 1, page + 1))}
              />
            </section>

            <section className="min-h-0 rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Moderation</h4>
                <div className="flex items-center gap-1.5">
                  <NexusBadge tone="neutral">{runtime.moderation.combinedFeed.length}</NexusBadge>
                  <NexusButton intent="subtle" onClick={() => runtime.openExpanded('moderation')}>Expand</NexusButton>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-1 2xl:grid-cols-2 gap-2">
                <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-1.5">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Voice moderation</div>
                  <select
                    value={runtime.moderation.voiceForm.moderationAction}
                    onChange={(event) => runtime.moderation.setVoiceForm((prev) => ({ ...prev, moderationAction: event.target.value }))}
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  >
                    {['MUTE', 'UNMUTE', 'DEAFEN', 'UNDEAFEN', 'KICK', 'LOCK_CHANNEL', 'UNLOCK_CHANNEL'].map((action) => <option key={action} value={action}>{action}</option>)}
                  </select>
                  <select
                    value={runtime.moderation.voiceForm.targetMemberProfileId}
                    onChange={(event) => runtime.moderation.setVoiceForm((prev) => ({ ...prev, targetMemberProfileId: event.target.value }))}
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  >
                    <option value="">Target member...</option>
                    {runtime.identity.directoryUsers.map((member) => <option key={member.id} value={member.id}>{member.username}</option>)}
                  </select>
                  <NexusButton intent="subtle" onClick={runtime.moderation.runVoiceModeration} disabled={Boolean(runtime.busyId)}>Execute Voice Action</NexusButton>
                </div>

                <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-1.5">
                  <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Text moderation</div>
                  <select
                    value={runtime.moderation.textForm.action}
                    onChange={(event) => runtime.moderation.setTextForm((prev) => ({ ...prev, action: event.target.value }))}
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  >
                    <option value="DELETE_MESSAGE">Delete Message</option>
                    <option value="MUTE_CHANNEL_USER">Mute Channel User</option>
                    <option value="UNMUTE_CHANNEL_USER">Unmute Channel User</option>
                  </select>
                  <select
                    value={runtime.moderation.textForm.channelId}
                    onChange={(event) => runtime.moderation.setTextForm((prev) => ({ ...prev, channelId: event.target.value }))}
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  >
                    <option value="">Channel context...</option>
                    {runtime.moderation.channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name || channel.id}</option>)}
                  </select>
                  <select
                    value={runtime.moderation.textForm.messageId}
                    onChange={(event) => runtime.moderation.setTextForm((prev) => ({ ...prev, messageId: event.target.value }))}
                    className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                  >
                    <option value="">Message context...</option>
                    {runtime.moderation.messages.slice(0, 40).map((message) => (
                      <option key={message.id} value={message.id}>{String(message.content || message.text || message.id).slice(0, 42)}</option>
                    ))}
                  </select>
                  <NexusButton intent="subtle" onClick={runtime.moderation.runTextModeration} disabled={Boolean(runtime.busyId)}>Execute Text Action</NexusButton>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {runtime.moderation.pager.visible.length ? runtime.moderation.pager.visible.map((entry) => (
                  <div key={entry.id} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{entry.source} · {entry.action}</span>
                      <NexusBadge tone="neutral">{runtime.action.toClock(entry.createdAt)}</NexusBadge>
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500 truncate">{entry.target} · {entry.channelId} · {entry.reason}</div>
                  </div>
                )) : (
                  <div className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-wide">No moderation actions captured.</div>
                )}
              </div>
            </section>
          </div>

          <div className="min-h-0 xl:col-span-5 grid grid-rows-[auto_auto_minmax(0,1fr)] gap-2">
            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Permissions + Promotions</h4>
                <div className="flex items-center gap-1.5">
                  <NexusBadge tone="neutral">{runtime.permissions.summary.totalRules} rules</NexusBadge>
                  <NexusButton intent="subtle" onClick={() => runtime.openExpanded('permissions')}>Permissions</NexusButton>
                  <NexusButton intent="subtle" onClick={() => runtime.openExpanded('promotions')}>Promotions</NexusButton>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <NexusBadge tone="neutral">Panels {runtime.permissions.summary.panelCount}</NexusBadge>
                <NexusBadge tone="active">Roles {runtime.permissions.summary.roleCount}</NexusBadge>
                <NexusBadge tone="warning">Admin Rules {runtime.permissions.summary.adminRules}</NexusBadge>
                <NexusButton intent="subtle" onClick={runtime.permissions.clearPermissionCache}>Clear Cache</NexusButton>
              </div>

              <div className="mt-2 rounded border border-zinc-800/70 bg-zinc-950/45 p-2 space-y-1.5">
                <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Promotion controls</div>
                <select
                  value={runtime.promotions.selectedProfileId}
                  onChange={(event) => runtime.promotions.setSelectedProfileId(event.target.value)}
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                >
                  <option value="">Select member profile...</option>
                  {runtime.promotions.pager.visible.map((entry) => (
                    <option key={entry.id} value={entry.id}>{entry.callsign || entry.display_callsign || entry.username || entry.id}</option>
                  ))}
                </select>
                <select
                  value={runtime.promotions.targetRank}
                  onChange={(event) => runtime.promotions.setTargetRank(event.target.value)}
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                >
                  {runtime.promotions.rankModel.map((rank) => <option key={rank} value={rank}>{rank}</option>)}
                </select>
                <input
                  value={runtime.promotions.reason}
                  onChange={(event) => runtime.promotions.setReason(event.target.value)}
                  placeholder="Promotion reason (required)"
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                />
                <input
                  value={runtime.promotions.confirmText}
                  onChange={(event) => runtime.promotions.setConfirmText(event.target.value)}
                  placeholder={`Type ${runtime.promotions.selectedProfile ? `PROMOTE ${(runtime.promotions.selectedProfile.callsign || runtime.promotions.selectedProfile.id || '').toUpperCase()}` : 'PROMOTE <CALLSIGN>'}`}
                  className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100"
                />
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Authority: {runtime.promotions.authority.message}</div>
                <NexusButton intent="primary" onClick={runtime.promotions.runPromotion} disabled={Boolean(runtime.busyId) || !runtime.promotions.authority.allowed}>
                  <UserCog className="w-3.5 h-3.5 mr-1" />Apply Rank Change
                </NexusButton>
              </div>
            </section>

            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Action Feed</h4>
                <NexusBadge tone="neutral">{runtime.action.feed.length}</NexusBadge>
              </div>
              <div className="mt-2 space-y-1">
                {runtime.action.pager.visible.length ? runtime.action.pager.visible.map((entry) => (
                  <div key={entry.id} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{entry.summary}</span>
                      <NexusBadge tone={actionTone(entry.status)}>{entry.status}</NexusBadge>
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-500 truncate">{entry.detail}</div>
                  </div>
                )) : (
                  <div className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-2 text-[10px] text-zinc-500 uppercase tracking-wide">No actions executed yet.</div>
                )}
              </div>
              <Pager
                page={runtime.action.pager.page}
                pageCount={runtime.action.pager.pageCount}
                onPrev={() => runtime.action.setPage((page) => Math.max(0, page - 1))}
                onNext={() => runtime.action.setPage((page) => Math.min(runtime.action.pager.pageCount - 1, page + 1))}
              />
            </section>

            <section className="rounded-md border border-zinc-700/60 bg-zinc-900/55 p-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-100">Fallback Surfaces</h4>
                <Shield className="w-3.5 h-3.5 text-zinc-400" />
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <NexusButton intent="subtle" onClick={() => runtime.openExpanded('qa')}><ClipboardList className="w-3.5 h-3.5 mr-1" />QA</NexusButton>
                <NexusButton intent="subtle" onClick={() => runtime.openExpanded('diagnostics')}><Database className="w-3.5 h-3.5 mr-1" />Diagnostics</NexusButton>
                <NexusButton intent="subtle" onClick={() => runtime.openExpanded('integrations')}><ExternalLink className="w-3.5 h-3.5 mr-1" />Legacy</NexusButton>
              </div>
              <div className="mt-2 text-[10px] text-zinc-500 uppercase tracking-wide">Legacy routes remain available for QA fallback only.</div>
            </section>
          </div>
        </div>
      </div>

      <AdminExpandDrawer
        open={Boolean(runtime.expandedView)}
        title={drawerConfig.title}
        subtitle={drawerConfig.subtitle}
        count={drawerConfig.count}
        onClose={runtime.closeExpanded}
      >
        {runtime.expandedView === 'database' ? (
          <div className="space-y-2">
            <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Entity
                <select value={runtime.db.dbQueryEntity} onChange={(event) => runtime.db.setDbQueryEntity(event.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100">
                  {runtime.db.queryAllowlist.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
                </select>
              </label>
              <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
                Limit
                <input type="number" min="1" max="250" value={runtime.db.dbQueryLimit} onChange={(event) => runtime.db.setDbQueryLimit(event.target.value)} className="mt-1 h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-100" />
              </label>
              <NexusButton intent="subtle" onClick={runtime.db.runDbQuery} disabled={Boolean(runtime.busyId)}>Run Query</NexusButton>
              <NexusButton intent="subtle" onClick={runtime.db.exportDbRows} disabled={!runtime.db.dbQueryRows.length}>Export JSON</NexusButton>
            </div>
            {runtime.db.dbQueryError ? <div className="text-[10px] text-amber-300 uppercase tracking-wide">{runtime.db.dbQueryError}</div> : null}
            {runtime.db.dbQueryRows.map((row) => (
              <pre key={row.id || JSON.stringify(row).slice(0, 24)} className="rounded border border-zinc-800/70 bg-zinc-950/45 p-2 text-[10px] text-zinc-300 whitespace-pre-wrap">{JSON.stringify(row, null, 2)}</pre>
            ))}
          </div>
        ) : null}

        {runtime.expandedView === 'keys' ? <AccessKeyAuditLog /> : null}

        {runtime.expandedView === 'moderation' ? (
          <div className="space-y-1">
            {runtime.moderation.combinedFeed.map((entry) => (
              <div key={entry.id} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{entry.source} · {entry.action}</span>
                  <NexusBadge tone="neutral">{runtime.action.toClock(entry.createdAt)}</NexusBadge>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500">{entry.target} · {entry.channelId} · {entry.reason}</div>
              </div>
            ))}
          </div>
        ) : null}

        {runtime.expandedView === 'permissions' ? (
          <RolePermissionManager availablePanels={runtime.permissions.availablePanels} availableRoles={runtime.permissions.availableRoles} />
        ) : null}

        {runtime.expandedView === 'promotions' ? (
          <div className="space-y-1">
            {runtime.promotions.auditRows.length ? runtime.promotions.auditRows.map((entry) => (
              <div key={entry.id} className="rounded border border-zinc-800/70 bg-zinc-950/45 px-2 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-100 uppercase tracking-wide truncate">{entry.action || 'RANK_CHANGE'}</span>
                  <NexusBadge tone="neutral">{runtime.action.toClock(entry.created_date || entry.createdAt)}</NexusBadge>
                </div>
                <div className="mt-1 text-[10px] text-zinc-500 whitespace-pre-wrap">{JSON.stringify(entry.details || {}, null, 2)}</div>
              </div>
            )) : <div className="text-[10px] text-zinc-500 uppercase tracking-wide">No promotion audits captured.</div>}
          </div>
        ) : null}

        {['qa', 'diagnostics', 'integrations'].includes(runtime.expandedView) ? (
          <div className="rounded border border-zinc-800/70 bg-zinc-950/45 p-3 space-y-2">
            <div className="text-[11px] text-zinc-100 uppercase tracking-wide">Legacy fallback surface</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wide">This workflow remains available for QA fallback and will be consolidated into Admin Focus V2.</div>
            <div className="flex items-center gap-2">
              <NexusButton intent="subtle" onClick={() => navigateToPage('Settings')}>Open Settings</NexusButton>
              <NexusButton intent="subtle" onClick={() => navigateToPage('QAConsole')}>Open QA Console</NexusButton>
              <NexusButton intent="subtle" onClick={() => navigateToPage('RoleManagement')}>Open Role Management</NexusButton>
            </div>
          </div>
        ) : null}
      </AdminExpandDrawer>
    </div>
  );
}
