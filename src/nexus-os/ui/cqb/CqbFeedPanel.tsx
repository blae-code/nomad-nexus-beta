import React, { useMemo, useState } from 'react';
import type { CqbEvent } from '../../schemas/coreSchemas';
import { isStaleAt } from '../../schemas/coreSchemas';
import { NexusBadge, NexusButton, RustPulseIndicator } from '../primitives';
import { getBrevityLabel } from './brevity';
import type { CqbPanelSharedProps, CqbRosterMember } from './cqbTypes';

interface CqbFeedPanelProps extends CqbPanelSharedProps {
  limit?: number;
}

function formatAge(createdAt: string, nowMs: number): string {
  const ageSeconds = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 1000));
  if (ageSeconds < 60) return `${ageSeconds}s`;
  const mins = Math.floor(ageSeconds / 60);
  const secs = ageSeconds % 60;
  return `${mins}m ${secs}s`;
}

function confidenceMeta(confidence: number) {
  if (confidence >= 0.8) return { label: 'HIGH', tone: 'ok' as const };
  if (confidence >= 0.55) return { label: 'MED', tone: 'warning' as const };
  return { label: 'LOW', tone: 'danger' as const };
}

function lookupMember(roster: CqbRosterMember[], authorId: string) {
  return roster.find((entry) => entry.id === authorId);
}

function toChannelLabel(channelId?: string): string {
  if (!channelId) return 'UNSCOPED';
  return channelId
    .split('-')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function formatSitrep(events: CqbEvent[], roster: CqbRosterMember[]): string {
  const ordered = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const lines = ordered.map((event) => {
    const member = lookupMember(roster, event.authorId);
    const callsign = member?.callsign || event.authorId;
    const element = member?.element || 'UNK';
    const scope = toChannelLabel(event.channelId);
    return `${element}/${callsign} ${getBrevityLabel(event.eventType)} (${scope})`;
  });
  return ['KISS: keep transmissions short and unambiguous.', ...lines].join('\n');
}

export default function CqbFeedPanel({
  events,
  roster,
  opId,
  limit = 16,
}: CqbFeedPanelProps) {
  const [copied, setCopied] = useState(false);
  const nowMs = Date.now();

  const visibleEvents = useMemo(() => {
    return events
      .filter((event) => (opId ? event.opId === opId : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }, [events, opId, limit]);

  const copySitrep = async () => {
    const sitrep = formatSitrep(visibleEvents, roster);
    try {
      await navigator.clipboard.writeText(sitrep);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      console.info('[NexusOS][Gameplay] SITREP copy fallback output:\n' + sitrep);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500 uppercase tracking-wide">Latest Loop Events</div>
        <NexusButton size="sm" intent="subtle" onClick={copySitrep} title="Copy KISS-formatted SITREP">
          {copied ? 'Copied' : 'Copy SITREP'}
        </NexusButton>
      </div>

      <div className="flex-1 min-h-0 overflow-auto space-y-2 pr-1">
        {visibleEvents.length === 0 ? (
          <div className="text-xs text-zinc-500 rounded border border-zinc-800 bg-zinc-900/40 p-3">
            No loop events yet. Use MacroPad to emit canonical brevity events.
          </div>
        ) : null}

        {visibleEvents.map((event) => {
          const member = lookupMember(roster, event.authorId);
          const scope = toChannelLabel(event.channelId);
          const age = formatAge(event.createdAt, nowMs);
          const stale = isStaleAt(event.createdAt, event.ttlSeconds, nowMs);
          const remainingSec = Math.max(0, Math.ceil((new Date(event.createdAt).getTime() + event.ttlSeconds * 1000 - nowMs) / 1000));
          const confidence = confidenceMeta(event.confidence);
          const live = nowMs - new Date(event.createdAt).getTime() <= 5000;

          return (
            <div key={event.id} className={`rounded border px-3 py-2 space-y-2 ${stale ? 'border-zinc-800 bg-zinc-950/30 opacity-60' : 'border-zinc-700 bg-zinc-900/55'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <RustPulseIndicator active={live && !stale} />
                  <span className="text-sm font-semibold text-zinc-100 truncate">{getBrevityLabel(event.eventType)}</span>
                  <NexusBadge tone={confidence.tone}>{confidence.label}</NexusBadge>
                  {member?.element ? <NexusBadge tone="active">{member.element}</NexusBadge> : null}
                </div>
                <span className="text-[11px] text-zinc-500 shrink-0">{age}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-zinc-300">{member?.callsign || event.authorId}</span>
                <span className="text-zinc-500">scope:</span>
                <span className={scope === 'UNSCOPED' ? 'text-amber-300' : 'text-zinc-300'}>{scope}</span>
                <span className="text-zinc-500">ttl:</span>
                <span className={remainingSec === 0 ? 'text-zinc-600' : 'text-zinc-400'}>{remainingSec}s</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
