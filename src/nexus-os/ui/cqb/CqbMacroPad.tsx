import React, { useMemo, useState } from 'react';
import { getCqbVariant } from '../../registries/cqbVariantRegistry';
import { getMacrosForVariant } from '../../registries/macroRegistry';
import { getDefaultTTLSeconds, getTTLProfile } from '../../registries/ttlProfileRegistry';
import { getActiveChannelId } from '../../services/channelContextService';
import { storeCqbEvent } from '../../services/cqbEventService';
import type { CqbEventType } from '../../schemas/coreSchemas';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import { BREVITY_GROUP_BY_EVENT, type MacroGroup } from './brevity';
import type { CqbPanelSharedProps } from './cqbTypes';

const GROUP_ORDER: MacroGroup[] = ['CONTROL', 'ACK', 'MOVEMENT', 'SECURITY', 'WEAPONS', 'SAFETY', 'TACTICAL'];

interface CqbMacroPadProps extends CqbPanelSharedProps {}

export default function CqbMacroPad({
  variantId,
  opId,
  actorId,
  onCreateMacroEvent,
}: CqbMacroPadProps) {
  const [destinationTag, setDestinationTag] = useState('');
  const [crossingDirection, setCrossingDirection] = useState('');
  const [crossingLane, setCrossingLane] = useState('');
  const [setSecurity360, setSetSecurity360] = useState(true);
  const [lastSentMacroId, setLastSentMacroId] = useState<string | null>(null);

  const variant = getCqbVariant(variantId);
  const macros = useMemo(() => getMacrosForVariant(variantId), [variantId]);
  const ttlProfile = variant ? getTTLProfile(variant.defaultTTLProfileId) : null;

  if (!variant || !ttlProfile) {
    return (
      <DegradedStateCard
        state="LOCKED"
        reason={`MacroPad unavailable: missing variant or TTL profile for ${variantId}.`}
      />
    );
  }

  if (!macros || macros.length === 0) {
    return (
      <DegradedStateCard
        state="OFFLINE"
        reason={`No macro set found for ${variantId}. Check MacroRegistry defaults.`}
      />
    );
  }

  const grouped = GROUP_ORDER.reduce((acc, group) => {
    acc[group] = macros.filter((macro) => (BREVITY_GROUP_BY_EVENT[macro.eventType] || 'TACTICAL') === group);
    return acc;
  }, {} as Record<MacroGroup, typeof macros>);

  const emitMacro = (eventType: CqbEventType, payload: Record<string, unknown>) => {
    const channelId = getActiveChannelId({ variantId });
    if (onCreateMacroEvent) {
      onCreateMacroEvent(eventType, { ...payload, channelId });
      return;
    }

    storeCqbEvent({
      variantId,
      opId,
      authorId: actorId || 'dev-operator',
      eventType,
      channelId: channelId || undefined,
      confidence: 0.9,
      ttlSeconds: getDefaultTTLSeconds(variant.defaultTTLProfileId, eventType, 60),
      payload,
    });
  };

  const onMacroClick = (macro: (typeof macros)[number]) => {
    const payload: Record<string, unknown> = { ...macro.payloadTemplate, macroId: macro.id, macroLabel: macro.label };

    if (macro.eventType === 'MOVE_OUT') {
      payload.destinationTag = destinationTag.trim();
    }
    if (macro.eventType === 'CROSSING') {
      payload.direction = crossingDirection.trim();
      payload.lane = crossingLane.trim();
    }
    if (macro.eventType === 'SET_SECURITY') {
      payload.coverage360 = setSecurity360;
    }

    emitMacro(macro.eventType, payload);
    setLastSentMacroId(macro.id);
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="text-xs text-zinc-500 uppercase tracking-wide">Canon MacroPad · {variantId}</div>

      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          Move out destination
          <input
            value={destinationTag}
            onChange={(event) => setDestinationTag(event.target.value)}
            placeholder="zone tag (optional)"
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          />
        </label>
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          Crossing direction
          <input
            value={crossingDirection}
            onChange={(event) => setCrossingDirection(event.target.value)}
            placeholder="left/right/front"
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          />
        </label>
        <label className="text-[11px] text-zinc-500 flex flex-col gap-1">
          Crossing lane
          <input
            value={crossingLane}
            onChange={(event) => setCrossingLane(event.target.value)}
            placeholder="lane (optional)"
            className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-xs text-zinc-400">
        <input type="checkbox" checked={setSecurity360} onChange={(event) => setSetSecurity360(event.target.checked)} />
        Set security defaults to 360 coverage
      </label>

      <div className="flex-1 min-h-0 overflow-auto space-y-3 pr-1">
        {GROUP_ORDER.map((group) => {
          const entries = grouped[group];
          if (!entries || entries.length === 0) return null;

          return (
            <div key={group} className="space-y-2">
              <div className="flex items-center gap-2">
                <NexusBadge tone="neutral">{group}</NexusBadge>
                <span className="text-[11px] text-zinc-500">{entries.length} macros</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {entries.map((macro) => (
                  <NexusButton
                    key={macro.id}
                    size="sm"
                    intent={macro.id === lastSentMacroId ? 'primary' : 'subtle'}
                    className="justify-start normal-case font-semibold tracking-normal text-left"
                    onClick={() => onMacroClick(macro)}
                    title={macro.tooltip || macro.label}
                  >
                    {macro.label}
                  </NexusButton>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
