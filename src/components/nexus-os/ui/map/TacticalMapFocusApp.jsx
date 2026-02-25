import React from 'react';
import { NexusBadge, NexusButton, NexusTokenLabel } from '../primitives';
import TacticalMapPanel from './TacticalMapPanel';

/**
 * TacticalMapFocusApp (JSX canonical)
 * TSX counterpart is legacy and should not receive new feature work.
 */
export default function TacticalMapFocusApp({
  locationEstimates = [],
  controlSignals = [],
  viewerScope = 'ORG',
  actorId,
  opId,
  operations,
  focusOperationId,
  onClose,
}) {
  return (
    <div className="h-full min-h-0 flex flex-col gap-1.5">
      <section className="rounded border border-zinc-700/40 bg-zinc-950/55 backdrop-blur-sm px-2.5 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-100 leading-none">Tactical Map Focus</h3>
          <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-500 leading-none truncate">
            Doctrine: scoped data only, no fabricated telemetry.
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <NexusTokenLabel token={{ family: 'objective', color: 'yellow' }} label={viewerScope} layout="inline" size="sm" />
          <NexusBadge tone="warning">{viewerScope}</NexusBadge>
          {onClose ? (
            <NexusButton size="sm" intent="subtle" onClick={onClose}>
              Return
            </NexusButton>
          ) : null}
        </div>
      </section>
      <div className="flex-1 min-h-0 overflow-hidden">
        <TacticalMapPanel
          locationEstimates={locationEstimates}
          controlSignals={controlSignals}
          viewerScope={viewerScope}
          actorId={actorId}
          opId={opId}
          operations={operations}
          focusOperationId={focusOperationId}
          compact={false}
        />
      </div>
    </div>
  );
}

