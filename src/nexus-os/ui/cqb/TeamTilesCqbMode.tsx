import React, { useMemo } from 'react';
import type { CqbEvent } from '../../schemas/coreSchemas';
import { isStaleAt } from '../../schemas/coreSchemas';
import { NexusBadge, RustPulseIndicator } from '../primitives';
import { getBrevityLabel } from './brevity';
import type { CqbPanelSharedProps, CqbRosterMember } from './cqbTypes';

interface TeamTilesCqbModeProps extends CqbPanelSharedProps {
  compact?: boolean;
}

function ageLabel(timestamp: string, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function latestEventFor(memberId: string, events: CqbEvent[]): CqbEvent | null {
  const byMember = events
    .filter((event) => event.authorId === memberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return byMember[0] || null;
}

function deriveStatus(member: CqbRosterMember, events: CqbEvent[], nowMs: number) {
  const memberEvents = events
    .filter((event) => event.authorId === member.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const latestDowned = memberEvents.find((event) => event.eventType === 'DOWNED' && !isStaleAt(event.createdAt, event.ttlSeconds, nowMs));
  const latestRevive = memberEvents.find((event) => event.eventType === 'REVIVE' && !isStaleAt(event.createdAt, event.ttlSeconds, nowMs));
  const latestSelfCheck = memberEvents.find((event) => event.eventType === 'SELF_CHECK' && !isStaleAt(event.createdAt, event.ttlSeconds, nowMs));
  const latestWeaponDry = memberEvents.find((event) => event.eventType === 'WEAPON_DRY' && !isStaleAt(event.createdAt, event.ttlSeconds, nowMs));
  const latestReloading = memberEvents.find((event) => event.eventType === 'RELOADING' && !isStaleAt(event.createdAt, event.ttlSeconds, nowMs));

  let primaryStatus: 'UP' | 'DOWN' | 'WOUNDED' = 'UP';
  if (latestDowned && (!latestRevive || new Date(latestDowned.createdAt).getTime() > new Date(latestRevive.createdAt).getTime())) {
    primaryStatus = 'DOWN';
  } else if (
    latestSelfCheck &&
    typeof latestSelfCheck.payload?.condition === 'string' &&
    latestSelfCheck.payload.condition.toLowerCase().includes('wound')
  ) {
    primaryStatus = 'WOUNDED';
  }

  const subStatus = latestWeaponDry ? 'WEAPON DRY' : latestReloading ? 'RELOADING' : null;
  return { primaryStatus, subStatus };
}

export default function TeamTilesCqbMode({
  roster,
  events,
  opId,
  variantId,
  elementFilter = 'ALL',
  compact = false,
}: TeamTilesCqbModeProps) {
  const nowMs = Date.now();

  const relevantEvents = useMemo(
    () =>
      events.filter((event) => {
        if (opId && event.opId !== opId) return false;
        if (variantId && event.variantId !== variantId) return false;
        return true;
      }),
    [events, opId, variantId]
  );

  const visibleRoster = useMemo(
    () => roster.filter((member) => (elementFilter === 'ALL' ? true : member.element === elementFilter)),
    [roster, elementFilter]
  );

  const tileClass = compact ? 'p-3' : 'p-4';

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">Team Tiles · Loop Mode</div>
      <div className="flex-1 min-h-0 overflow-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
        {visibleRoster.map((member) => {
          const lastEvent = latestEventFor(member.id, relevantEvents);
          const derived = deriveStatus(member, relevantEvents, nowMs);
          const age = lastEvent ? ageLabel(lastEvent.createdAt, nowMs) : 'n/a';
          const livePulse = lastEvent ? nowMs - new Date(lastEvent.createdAt).getTime() <= 5000 : false;

          return (
            <article key={member.id} className={`rounded border border-zinc-700 bg-zinc-900/55 ${tileClass} space-y-2`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-100 truncate">{member.callsign}</div>
                  <div className="text-[11px] text-zinc-500 uppercase tracking-wide">{member.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  <RustPulseIndicator active={livePulse} />
                  <NexusBadge tone="active">{member.element}</NexusBadge>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <NexusBadge tone={derived.primaryStatus === 'UP' ? 'ok' : derived.primaryStatus === 'WOUNDED' ? 'warning' : 'danger'}>
                  {derived.primaryStatus}
                </NexusBadge>
                {derived.subStatus ? <NexusBadge tone="warning">{derived.subStatus}</NexusBadge> : null}
                <span className="text-[11px] text-zinc-500">last event {age}</span>
              </div>

              <div className="text-xs text-zinc-400">
                Last brevity: <span className="text-zinc-200">{lastEvent ? getBrevityLabel(lastEvent.eventType) : 'NONE'}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
