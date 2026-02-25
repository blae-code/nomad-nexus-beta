import React from 'react';
import NexusStatusToken from './NexusStatusToken';
import NexusTokenIcon from './NexusTokenIcon';

function clampNumber(value) {
  const parsed = Number.parseInt(String(value || '0'), 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(13, parsed));
}

function roleTokenFamily(role) {
  const token = String(role || '').trim().toLowerCase();
  if (token.includes('medic') || token.includes('hospital')) return 'hospital';
  if (token.includes('engineer') || token.includes('repair') || token.includes('mechanic')) return 'mechanics';
  if (token.includes('pilot') || token.includes('fuel') || token.includes('flight')) return 'fuel';
  if (token.includes('ammo') || token.includes('gunner')) return 'ammunition';
  if (token.includes('comms') || token.includes('signal')) return 'hex';
  if (token.includes('command') || token.includes('lead')) return 'target';
  return 'square';
}

function elementLabel(element) {
  const normalized = String(element || '').trim().toUpperCase();
  if (normalized === 'CE' || normalized === 'ACE' || normalized === 'GCE') return normalized;
  return '';
}

/**
 * NexusRosterBadge - compact participant row built from semantic tokens.
 */
export default function NexusRosterBadge({
  number = 0,
  callsign = 'Unknown',
  role = '',
  element = '',
  state = 'offline',
  layout = 'horizontal',
  className = '',
}) {
  const numberFamily = `number-${clampNumber(number)}`;
  const roleFamily = roleTokenFamily(role);
  const showVertical = layout === 'vertical';
  const elementCode = elementLabel(element);
  const rootClass = showVertical ? 'flex flex-col items-start gap-1' : 'flex items-center gap-1';

  return (
    <div className={`${rootClass} ${className}`.trim()} aria-label={`${callsign} ${state}`}>
      <div className="inline-flex items-center gap-1 min-w-0">
        <NexusTokenIcon family={numberFamily} color="blue" size="sm" alt={`Roster ${number}`} />
        <span className="text-[8px] font-semibold uppercase tracking-[0.14em] leading-none text-zinc-200 truncate">{callsign}</span>
        {elementCode ? (
          <span className="px-1 py-0.5 rounded border border-zinc-700/40 bg-zinc-900/50 text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            {elementCode}
          </span>
        ) : null}
      </div>
      <div className="inline-flex items-center gap-1">
        <NexusTokenIcon family={roleFamily} color="cyan" size="sm" alt={`${role || 'role'} token`} />
        <NexusStatusToken status={state} size="sm" showLabel={false} ariaLabel={`${callsign} ${state}`} />
      </div>
    </div>
  );
}

