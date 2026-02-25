import React from 'react';

const TONE_CLASSES = {
  neutral: 'border-zinc-700/40 bg-zinc-900/40 text-zinc-300',
  ok: 'border-green-500/40 bg-green-500/10 text-green-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/45 bg-red-500/12 text-red-300',
  active: 'border-orange-500/45 bg-orange-500/12 text-orange-300',
};

const DOT_CLASSES = {
  neutral: 'bg-zinc-400',
  ok: 'bg-green-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  active: 'bg-orange-400',
};

const SIZE_CLASSES = {
  sm: 'px-1.5 py-0.5 text-[8px]',
  md: 'px-2 py-1 text-[10px]',
};

/**
 * NexusStatusPill - compact operational state indicator.
 */
export default function NexusStatusPill({ tone = 'neutral', label = 'UNKNOWN', size = 'sm', className = '', ariaLabel }) {
  const resolvedTone = TONE_CLASSES[tone] ? tone : 'neutral';
  const resolvedSize = SIZE_CLASSES[size] ? size : 'sm';
  return (
    <div
      className={`flex items-center gap-1 rounded border ${SIZE_CLASSES[resolvedSize]} ${TONE_CLASSES[resolvedTone]} ${className}`.trim()}
      aria-label={ariaLabel || `Status ${label}`}
      title={label}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASSES[resolvedTone]}`} />
      <span className="font-mono font-semibold uppercase tracking-[0.14em] leading-none">{label}</span>
    </div>
  );
}

