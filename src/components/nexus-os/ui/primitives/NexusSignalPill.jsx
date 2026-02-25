import React from 'react';

const TONE_CLASSES = {
  neutral: 'border-zinc-700/40 bg-zinc-900/40 text-zinc-300',
  ok: 'border-green-500/40 bg-green-500/10 text-green-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  danger: 'border-red-500/45 bg-red-500/12 text-red-300',
  active: 'border-orange-500/45 bg-orange-500/12 text-orange-300',
};

/**
 * NexusSignalPill - telemetry/value pill for compact rails and headers.
 */
export default function NexusSignalPill({
  tone = 'neutral',
  value = '--',
  icon: Icon = null,
  unit = '',
  className = '',
  ariaLabel,
}) {
  const resolvedTone = TONE_CLASSES[tone] ? tone : 'neutral';
  const renderedValue = `${value}${unit}`;
  return (
    <div
      className={`flex items-center gap-0.5 rounded border px-1.5 py-0.5 ${TONE_CLASSES[resolvedTone]} ${className}`.trim()}
      aria-label={ariaLabel || `Signal ${renderedValue}`}
      title={renderedValue}
    >
      {Icon ? <Icon className="w-2.5 h-2.5" /> : null}
      <span className="text-[8px] font-mono font-semibold tracking-[0.14em] leading-none uppercase">{renderedValue}</span>
    </div>
  );
}

