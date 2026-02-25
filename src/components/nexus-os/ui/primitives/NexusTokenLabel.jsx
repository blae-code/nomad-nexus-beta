import React from 'react';
import NexusTokenIcon from './NexusTokenIcon';

/**
 * NexusTokenLabel - paired token and text with inline/stacked layouts.
 */
export default function NexusTokenLabel({ token = {}, label = '', layout = 'inline', size = 'md', className = '' }) {
  const inline = layout !== 'stacked';
  return (
    <span className={`${inline ? 'inline-flex items-center gap-1.5' : 'inline-flex flex-col items-center gap-1'} ${className}`.trim()}>
      <NexusTokenIcon {...token} size={size} alt={token.alt || `${label} token`} />
      <span className={inline ? 'text-[10px] font-semibold uppercase tracking-[0.12em] leading-none text-zinc-200' : 'text-[8px] font-semibold uppercase tracking-[0.14em] leading-none text-zinc-300'}>
        {label}
      </span>
    </span>
  );
}

