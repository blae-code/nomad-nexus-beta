import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';

const VALUE_TONE = {
  neutral: 'text-zinc-300',
  active: 'text-orange-300',
  ok: 'text-green-300',
  warning: 'text-amber-300',
  danger: 'text-red-300',
};

/**
 * NexusMetricCell - compact metric cell for panel footers.
 */
export default function NexusMetricCell({ label, value, tone = 'active', token = null, className = '', ariaLabel }) {
  const valueTone = VALUE_TONE[tone] || VALUE_TONE.active;
  return (
    <div className={`px-1.5 py-1 flex flex-col items-center justify-center ${className}`.trim()} aria-label={ariaLabel || `${label} ${value}`}>
      <span className="inline-flex items-center gap-1 text-[8px] text-zinc-300 uppercase tracking-[0.14em] font-semibold leading-none">
        {token ? <NexusTokenIcon {...token} size={token.size || 'sm'} className="shrink-0" /> : null}
        {label}
      </span>
      <span className={`mt-0.5 text-[10px] font-mono font-bold tracking-[0.15em] leading-none ${valueTone}`}>{value}</span>
    </div>
  );
}

