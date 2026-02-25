/**
 * TacticalMapFocusApp - Full-screen tactical map view
 * 
 * DESIGN COMPLIANCE:
 * - Typography: Headers text-sm font-semibold (larger for focus view), body text-xs
 * - Primitives: Uses NexusButton, NexusBadge
 * - Token opportunities: Map markers (objective, target-alt, logistics family)
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
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Tactical Map Focus</h3>
          <p className="text-xs text-zinc-500">
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