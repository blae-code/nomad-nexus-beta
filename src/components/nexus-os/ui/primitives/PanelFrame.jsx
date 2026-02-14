import React from 'react';
import NexusBadge from './NexusBadge';
import RustPulseIndicator from './RustPulseIndicator';
import { getNexusCssVars } from '../tokens';
import { nexusUiTheme } from '../theme';
import { AnimatedMount } from '../motion';
import { PanelLoadingState } from '../loading';

/**
 * PanelFrame
 * Industrial panel chrome with title, status badge, and toolbar slot.
 * The panel body is bounded; overflow content should be summarized or paged.
 */
export default function PanelFrame({
  title,
  status,
  statusTone = 'neutral',
  live = false,
  loading = false,
  loadingLabel,
  toolbar = null,
  children,
  className = '',
  bodyClassName = '',
}) {
  const vars = getNexusCssVars();
  const toneAccent = {
    active: 'var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base))',
    ok: '79, 196, 142',
    warning: '234, 184, 87',
    danger: '214, 98, 83',
    experimental: 'var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base))',
    neutral: '148, 133, 122',
    locked: '120, 112, 103',
  }[statusTone] || 'var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base))';
  return (
    <section
      className={`h-full min-h-0 flex flex-col rounded-md border bg-zinc-950/72 border-zinc-800 shadow-lg relative overflow-hidden ${className}`.trim()}
      style={{
        ...vars,
        borderRadius: nexusUiTheme.panelRadius,
        backgroundImage:
          `linear-gradient(180deg, rgba(${toneAccent}, 0.07), rgba(13, 20, 29, 0.88) 10%, rgba(9, 15, 23, 0.94))`,
        borderColor: 'var(--nx-border)',
        boxShadow: `0 0 0 1px rgba(${toneAccent}, 0.12) inset, 0 8px 16px rgba(0, 0, 0, 0.2)`,
      }}
    >
      <header
        className={`px-3 py-2 flex items-center justify-between gap-2 min-w-0 ${nexusUiTheme.panelHeaderClassName}`}
        style={{
          borderColor: 'var(--nx-border)',
          backgroundImage: `linear-gradient(90deg, rgba(${toneAccent}, 0.1), rgba(11, 18, 26, 0.62) 34%, rgba(10, 16, 24, 0.76))`,
        }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <RustPulseIndicator active={live} />
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100 truncate">{title}</h3>
          {status ? <NexusBadge tone={statusTone}>{status}</NexusBadge> : null}
        </div>
        {toolbar ? <div className="min-w-0 flex-1 flex justify-end overflow-hidden">{toolbar}</div> : null}
      </header>
      <div
        className={`flex-1 min-h-0 overflow-hidden p-3 text-sm text-zinc-200 ${bodyClassName}`.trim()}
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(var(--nx-bridge-a-rgb, var(--nx-bridge-a-rgb-base)), 0.025), rgba(var(--nx-bridge-b-rgb, var(--nx-bridge-b-rgb-base)), 0.015) 30%, transparent 58%)',
        }}
      >
        <AnimatedMount show={!loading} fromOpacity={0} toOpacity={1} fromY={4} toY={0} durationMs={160}>
          {loading ? <PanelLoadingState label={loadingLabel} /> : children}
        </AnimatedMount>
      </div>
    </section>
  );
}
