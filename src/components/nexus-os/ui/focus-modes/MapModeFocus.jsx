import React from 'react';
import TacticalMapPanel from '../map/TacticalMapPanel';

export default function MapModeFocus({ 
  locationEstimates = [],
  controlSignals = [],
  viewerScope = 'ORG',
  actorId = 'ce-warden',
  bridgeId,
  opId,
  operations = [],
  focusOperationId,
  ...otherProps
}) {
  return (
    <div className="h-full">
      <TacticalMapPanel
        locationEstimates={locationEstimates}
        controlSignals={controlSignals}
        viewerScope={viewerScope}
        actorId={actorId}
        bridgeId={bridgeId}
        opId={opId}
        operations={operations}
        focusOperationId={focusOperationId}
        compact={false}
        {...otherProps}
      />
    </div>
  );
}