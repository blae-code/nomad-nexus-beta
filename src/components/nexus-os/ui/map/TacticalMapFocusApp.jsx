/**
 * TacticalMapFocusApp - Map-focused workspace view
 * 
 * DESIGN COMPLIANCE:
 * - Typography: headerPrimary (h3), bodySecondary (p)
 * - Spacing: px-3 py-2.5, gap-2/gap-3
 * - Borders: border-zinc-800 (elevated context)
 * - Primitives: NexusBadge, NexusButton
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */
import React from 'react';
import { NexusBadge, NexusButton } from '../primitives';
import TacticalMapPanel from './TacticalMapPanel';

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
    <div className="h-full min-h-0 flex flex-col gap-3">
      <section className="rounded border border-zinc-700/60 bg-zinc-900/55 px-2.5 py-2 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-zinc-100">Tactical Map Focus</h3>
          <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mt-0.5">
            Doctrine: no telemetry fabrication, fading claims only, scope-gated visibility.
          </p>
        </div>
        <div className="flex items-center gap-2">
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