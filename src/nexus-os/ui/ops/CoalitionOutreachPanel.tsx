import React, { useEffect, useMemo, useState } from 'react';
import type { Operation } from '../../schemas/opSchemas';
import {
  acknowledgeEmergencyBroadcast,
  canAccessOperationContext,
  createAlliance,
  createEmergencyBroadcast,
  createPublicUpdate,
  createSharedOperationChannel,
  getOrganizationById,
  listAlliancesForOrg,
  listEmergencyBroadcasts,
  listOperationInvites,
  listOrganizations,
  listPublicUpdates,
  listSharedOperationChannels,
  publishPublicUpdate,
  registerOrganization,
  respondAlliance,
  respondOperationInvite,
  sendOperationInvite,
  subscribeCrossOrg,
} from '../../services/crossOrgService';
import { NexusBadge, NexusButton } from '../primitives';
import { DegradedStateCard } from '../primitives';

interface CoalitionOutreachPanelProps {
  op: Operation;
  actorId: string;
}

export default function CoalitionOutreachPanel({ op, actorId }: CoalitionOutreachPanelProps) {
  const [version, setVersion] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgTag, setOrgTag] = useState('');
  const [requesterOrgId, setRequesterOrgId] = useState(op.hostOrgId || '');
  const [partnerOrgId, setPartnerOrgId] = useState('');
  const [allianceName, setAllianceName] = useState('');
  const [inviteTargetOrgId, setInviteTargetOrgId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [channelPartners, setChannelPartners] = useState('');
  const [channelLabel, setChannelLabel] = useState('Joint Ops Net');
  const [outreachTitle, setOutreachTitle] = useState('');
  const [outreachBody, setOutreachBody] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeCrossOrg(() => setVersion((value) => value + 1));
    return unsubscribe;
  }, []);

  const organizations = useMemo(() => listOrganizations(), [version]);
  const hostOrgId = op.hostOrgId || requesterOrgId;
  const alliances = useMemo(
    () => (hostOrgId ? listAlliancesForOrg(hostOrgId, true) : []),
    [version, hostOrgId]
  );
  const invites = useMemo(() => listOperationInvites({ opId: op.id }), [version, op.id]);
  const sharedChannels = useMemo(() => listSharedOperationChannels(op.id), [version, op.id]);
  const publicUpdates = useMemo(() => listPublicUpdates({ opId: op.id }), [version, op.id]);
  const broadcasts = useMemo(() => listEmergencyBroadcasts(hostOrgId), [version, hostOrgId]);

  useEffect(() => {
    if (organizations.length > 0) {
      if (!requesterOrgId) setRequesterOrgId(organizations[0].id);
      if (!inviteTargetOrgId) setInviteTargetOrgId(organizations.find((org) => org.id !== requesterOrgId)?.id || '');
      return;
    }
    if (!requesterOrgId) {
      const seed = registerOrganization({
        name: 'Redscar Nomads',
        shortTag: 'RSC',
        kind: 'PRIMARY',
        visibilityDefault: 'INTERNAL',
      });
      setRequesterOrgId(seed.id);
    }
  }, [organizations, requesterOrgId, inviteTargetOrgId]);

  const runAction = (action: () => void) => {
    try {
      setErrorText('');
      action();
    } catch (error: any) {
      setErrorText(error?.message || 'Action failed');
    }
  };

  const permission = canAccessOperationContext({
    opId: op.id,
    requesterOrgId: requesterOrgId || hostOrgId,
    requesterUserId: actorId,
    requiredClassification: op.classification || 'INTERNAL',
  });

  if (!op?.id) {
    return <DegradedStateCard state="LOCKED" reason="Operation context is required for coalition tools." />;
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
      <section className="xl:col-span-4 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Organizations</h4>
          <NexusBadge tone={permission.allowed ? 'ok' : 'warning'}>
            {permission.allowed ? 'SCOPED' : 'RESTRICTED'}
          </NexusBadge>
        </div>
        <div className="text-[11px] text-zinc-500">
          {permission.reason} Classification: {permission.classification}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            value={orgName}
            onChange={(event) => setOrgName(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Org name"
          />
          <input
            value={orgTag}
            onChange={(event) => setOrgTag(event.target.value)}
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Tag"
          />
        </div>
        <NexusButton
          size="sm"
          intent="primary"
          onClick={() =>
            runAction(() => {
              const created = registerOrganization({
                name: orgName || 'Untitled Org',
                shortTag: orgTag || 'ORG',
                kind: 'ALLY',
                visibilityDefault: 'ALLIED',
              });
              setRequesterOrgId(created.id);
              setOrgName('');
              setOrgTag('');
            })
          }
        >
          Register / Update Org
        </NexusButton>
        <div className="max-h-28 overflow-auto pr-1 space-y-1">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => setRequesterOrgId(org.id)}
              className={`w-full text-left rounded border px-2 py-1 text-[11px] ${
                requesterOrgId === org.id ? 'border-sky-500/60 bg-zinc-900/75' : 'border-zinc-800 bg-zinc-950/55'
              }`}
            >
              <div className="text-zinc-200">
                [{org.shortTag}] {org.name}
              </div>
              <div className="text-zinc-500">{org.kind}</div>
            </button>
          ))}
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Alliance Flow</div>
          <select
            value={partnerOrgId}
            onChange={(event) => setPartnerOrgId(event.target.value)}
            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          >
            <option value="">Select partner org</option>
            {organizations
              .filter((org) => org.id !== requesterOrgId)
              .map((org) => (
                <option key={org.id} value={org.id}>
                  [{org.shortTag}] {org.name}
                </option>
              ))}
          </select>
          <input
            value={allianceName}
            onChange={(event) => setAllianceName(event.target.value)}
            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Alliance name"
          />
          <NexusButton
            size="sm"
            intent="subtle"
            onClick={() =>
              runAction(() =>
                createAlliance({
                  requesterOrgId,
                  partnerOrgId,
                  allianceName: allianceName || `${getOrganizationById(requesterOrgId)?.shortTag || 'ORG'} Coalition`,
                  createdBy: actorId,
                })
              )
            }
          >
            Send Alliance Request
          </NexusButton>
          <div className="max-h-24 overflow-auto pr-1 space-y-1">
            {alliances.map((alliance) => (
              <div key={alliance.id} className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-200 truncate">{alliance.allianceName}</span>
                  <NexusBadge tone={alliance.status === 'ACTIVE' ? 'ok' : 'warning'}>{alliance.status}</NexusBadge>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => respondAlliance(alliance.id, requesterOrgId, 'ACCEPT'))}>
                    Accept
                  </NexusButton>
                  <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => respondAlliance(alliance.id, requesterOrgId, 'SUSPEND'))}>
                    Suspend
                  </NexusButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="xl:col-span-8 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-3 min-h-0">
        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Operation Invite + Shared Channels</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <select
              value={inviteTargetOrgId}
              onChange={(event) => setInviteTargetOrgId(event.target.value)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            >
              <option value="">Select target org</option>
              {organizations
                .filter((org) => org.id !== requesterOrgId)
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    [{org.shortTag}] {org.name}
                  </option>
                ))}
            </select>
            <input
              value={inviteMessage}
              onChange={(event) => setInviteMessage(event.target.value)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              placeholder="Invite message"
            />
            <NexusButton
              size="sm"
              intent="primary"
              onClick={() =>
                runAction(() =>
                  sendOperationInvite({
                    opId: op.id,
                    hostOrgId: requesterOrgId,
                    targetOrgId: inviteTargetOrgId,
                    message: inviteMessage || 'Joint operation request',
                    classification: op.classification || 'ALLIED',
                    createdBy: actorId,
                  })
                )
              }
            >
              Send Invite
            </NexusButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            <input
              value={channelLabel}
              onChange={(event) => setChannelLabel(event.target.value)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              placeholder="Shared channel label"
            />
            <input
              value={channelPartners}
              onChange={(event) => setChannelPartners(event.target.value)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              placeholder="partner org ids, comma separated"
            />
            <NexusButton
              size="sm"
              intent="subtle"
              onClick={() =>
                runAction(() =>
                  createSharedOperationChannel({
                    opId: op.id,
                    hostOrgId: requesterOrgId,
                    partnerOrgIds: channelPartners.split(',').map((entry) => entry.trim()).filter(Boolean),
                    channelLabel: channelLabel || `Joint-${op.name}`,
                    createdBy: actorId,
                  })
                )
              }
            >
              Create Shared Channel
            </NexusButton>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <div className="max-h-28 overflow-auto pr-1 space-y-1">
              {invites.map((invite) => (
                <div key={invite.id} className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-200 truncate">
                      {getOrganizationById(invite.hostOrgId)?.shortTag || invite.hostOrgId}{' -> '}{getOrganizationById(invite.targetOrgId)?.shortTag || invite.targetOrgId}
                    </span>
                    <NexusBadge tone={invite.status === 'ACCEPTED' ? 'ok' : 'warning'}>{invite.status}</NexusBadge>
                  </div>
                  {invite.status === 'PENDING' ? (
                    <div className="mt-1 flex items-center gap-1">
                      <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => respondOperationInvite(invite.id, invite.targetOrgId, 'ACCEPT', actorId))}>
                        Accept
                      </NexusButton>
                      <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => respondOperationInvite(invite.id, invite.targetOrgId, 'DECLINE', actorId))}>
                        Decline
                      </NexusButton>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="max-h-28 overflow-auto pr-1 space-y-1">
              {sharedChannels.map((channel) => (
                <div key={channel.id} className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px]">
                  <div className="text-zinc-200">{channel.channelLabel}</div>
                  <div className="text-zinc-500">{channel.partnerOrgIds.join(', ') || 'No partners'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Outreach (Public Updates)</div>
          <input
            value={outreachTitle}
            onChange={(event) => setOutreachTitle(event.target.value)}
            className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Public update title"
          />
          <textarea
            value={outreachBody}
            onChange={(event) => setOutreachBody(event.target.value)}
            className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            placeholder="Public-safe summary. Sensitive coordinates are auto-redacted."
          />
          <NexusButton
            size="sm"
            intent="primary"
            onClick={() =>
              runAction(() => {
                createPublicUpdate({
                  orgId: requesterOrgId,
                  opId: op.id,
                  title: outreachTitle || `${op.name} Update`,
                  body: outreachBody || 'Joint operation update.',
                  audience: 'PUBLIC',
                  classification: 'PUBLIC',
                  createdBy: actorId,
                  sourceRefs: [{ kind: 'operation', id: op.id }],
                });
                setOutreachTitle('');
                setOutreachBody('');
              })
            }
          >
            Create Public Update
          </NexusButton>
          <div className="max-h-24 overflow-auto pr-1 space-y-1">
            {publicUpdates.map((update) => (
              <div key={update.id} className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-200 truncate">{update.title}</span>
                  <NexusBadge tone={update.publishStatus === 'PUBLISHED' ? 'ok' : 'warning'}>
                    {update.publishStatus}
                  </NexusBadge>
                </div>
                <div className="text-zinc-500 break-all">/public/updates/{update.slug}</div>
                {update.publishStatus !== 'PUBLISHED' ? (
                  <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => publishPublicUpdate(update.id))}>
                    Publish
                  </NexusButton>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-zinc-400">Emergency Coalition Broadcast</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <input
              value={broadcastTitle}
              onChange={(event) => setBroadcastTitle(event.target.value)}
              className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              placeholder="Broadcast title"
            />
            <NexusButton
              size="sm"
              intent="danger"
              onClick={() =>
                runAction(() =>
                  createEmergencyBroadcast({
                    originOrgId: requesterOrgId,
                    opId: op.id,
                    title: broadcastTitle || 'Emergency Assistance Request',
                    message: broadcastMessage || 'Rescue support requested immediately.',
                    createdBy: actorId,
                  })
                )
              }
            >
              Send Broadcast
            </NexusButton>
          </div>
          <textarea
            value={broadcastMessage}
            onChange={(event) => setBroadcastMessage(event.target.value)}
            className="h-14 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
            placeholder="Emergency details"
          />
          <div className="max-h-24 overflow-auto pr-1 space-y-1">
            {broadcasts.map((broadcast) => (
              <div key={broadcast.id} className="rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-200 truncate">{broadcast.title}</span>
                  <NexusBadge tone="danger">{broadcast.targetOrgIds.length} target(s)</NexusBadge>
                </div>
                <div className="text-zinc-500">{broadcast.message}</div>
                <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => acknowledgeEmergencyBroadcast(broadcast.id, requesterOrgId))}>
                  Acknowledge
                </NexusButton>
              </div>
            ))}
          </div>
        </div>

        {errorText ? (
          <div className="rounded border border-red-900/60 bg-red-950/30 px-2 py-1 text-[11px] text-red-300">
            {errorText}
          </div>
        ) : null}
      </section>
    </div>
  );
}
