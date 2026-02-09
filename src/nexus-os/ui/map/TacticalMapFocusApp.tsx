import React from 'react';
import type { LocationEstimate, VisibilityScope } from '../../schemas/coreSchemas';
import type { ControlSignal } from '../../schemas/mapSchemas';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import { NexusBadge, NexusButton } from '../primitives';
import TacticalMapPanel from './TacticalMapPanel';

interface TacticalMapFocusAppProps extends Partial<CqbPanelSharedProps> {
  locationEstimates?: LocationEstimate[];
  controlSignals?: ControlSignal[];
  viewerScope?: VisibilityScope;
  onClose?: () => void;
}

export default function TacticalMapFocusApp({
  locationEstimates = [],
  controlSignals = [],
  viewerScope = 'ORG',
  actorId,
  opId,
  operations,
  focusOperationId,
  onClose,
}: TacticalMapFocusAppProps) {
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
