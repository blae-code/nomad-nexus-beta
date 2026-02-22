import React from 'react';
import CommsNetworkConsole from '../comms/CommsNetworkConsole';

export default function CommsModeFocus(props) {
  const sharedProps = {
    variantId: props?.variantId || 'CQB-01',
    roster: Array.isArray(props?.roster) ? props.roster : [],
    actorId: String(props?.actorId || ''),
    events: Array.isArray(props?.events) ? props.events : [],
    ...props,
  };

  return (
    <div className="h-full">
      <CommsNetworkConsole {...sharedProps} />
    </div>
  );
}
