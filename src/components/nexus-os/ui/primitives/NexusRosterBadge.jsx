/**
 * NexusRosterBadge - Composite participant badge with tokens
 * 
 * Renders: number token + callsign + role token + status token.
 * Use for: voice net rosters, squad lists, team displays.
 * 
 * DESIGN COMPLIANCE:
 * - Typography: text-[9px] font-semibold uppercase
 * - Spacing: gap-1 (horizontal), gap-0.5 (compact)
 * - Token sizing: sm (12px) for density
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';
import NexusStatusToken from './NexusStatusToken';

const ROLE_TOKEN_MAP = {
  command: { family: 'target', color: 'orange' },
  commander: { family: 'target', color: 'orange' },
  medical: { family: 'hospital', color: 'green' },
  medic: { family: 'hospital', color: 'green' },
  engineer: { family: 'mechanics', color: 'cyan' },
  mechanics: { family: 'mechanics', color: 'cyan' },
  pilot: { family: 'fuel', color: 'blue' },
  flight: { family: 'fuel', color: 'blue' },
  marine: { family: 'ammunition', color: 'red' },
  gunner: { family: 'ammunition', color: 'red' },
  support: { family: 'square', color: 'cyan' },
  logistics: { family: 'square', color: 'cyan' },
  default: { family: 'square', color: 'cyan' },
};

/**
 * @param {Object} props
 * @param {number} props.number - Roster position (1-13)
 * @param {string} props.callsign - Member callsign
 * @param {string} [props.role] - Role key (command, medical, engineer, pilot, marine, support)
 * @param {string} [props.element] - Element designation (CE, ACE, GCE)
 * @param {string} [props.state='ready'] - Status (ready, active, offline, etc.)
 * @param {string} [props.layout='horizontal'] - Layout mode (horizontal, compact, vertical)
 * @param {string} [props.className] - Additional classes
 */
export default function NexusRosterBadge({
  number,
  callsign,
  role = null,
  element = null,
  state = 'ready',
  layout = 'horizontal',
  className = '',
}) {
  const roleToken = role ? (ROLE_TOKEN_MAP[role.toLowerCase()] || ROLE_TOKEN_MAP.default) : null;
  
  if (layout === 'vertical') {
    return (
      <div className={`flex flex-col items-center gap-0.5 ${className}`}>
        <NexusTokenIcon
          family={`number-${Math.min(13, Math.max(0, number))}`}
          color="blue"
          size="sm"
        />
        <span className="text-[9px] font-semibold uppercase">{callsign}</span>
        <div className="flex items-center gap-0.5">
          {roleToken && (
            <NexusTokenIcon
              family={roleToken.family}
              color={roleToken.color}
              size="sm"
            />
          )}
          <NexusStatusToken status={state} size="sm" showLabel={false} />
        </div>
      </div>
    );
  }
  
  if (layout === 'compact') {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        <NexusTokenIcon
          family={`number-${Math.min(13, Math.max(0, number))}`}
          color="blue"
          size="sm"
        />
        <span className="text-[8px] font-semibold uppercase">{callsign}</span>
        <NexusStatusToken status={state} size="sm" showLabel={false} />
      </div>
    );
  }
  
  // Horizontal (default)
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <NexusTokenIcon
        family={`number-${Math.min(13, Math.max(0, number))}`}
        color="blue"
        size="sm"
      />
      <span className="text-[9px] font-semibold uppercase">{callsign}</span>
      {element && (
        <span className="text-[7px] font-bold text-zinc-400 uppercase">[{element}]</span>
      )}
      {roleToken && (
        <NexusTokenIcon
          family={roleToken.family}
          color={roleToken.color}
          size="sm"
        />
      )}
      <NexusStatusToken status={state} size="sm" showLabel={false} />
    </div>
  );
}