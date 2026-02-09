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
 * The panel body is scrollable; the outer workbench should remain fixed.
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
  return (
    <section
      className={`h-full min-h-0 flex flex-col rounded-md border bg-zinc-950/70 border-zinc-800 shadow-lg ${className}`.trim()}
      style={{
        ...vars,
        borderRadius: nexusUiTheme.panelRadius,
        backgroundColor: 'var(--nx-panel-bg)',
        borderColor: 'var(--nx-border)',
        boxShadow: 'var(--nx-shadow-panel)',
      }}
    >
      <header className={`px-3 py-2 flex items-center justify-between gap-2 ${nexusUiTheme.panelHeaderClassName}`} style={{ borderColor: 'var(--nx-border)' }}>
        <div className="flex min-w-0 items-center gap-2">
          <RustPulseIndicator active={live} />
          <h3 className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">{title}</h3>
          {status ? <NexusBadge tone={statusTone}>{status}</NexusBadge> : null}
        </div>
        {toolbar ? <div className="shrink-0 flex items-center gap-2">{toolbar}</div> : null}
      </header>
      <div className={`flex-1 min-h-0 overflow-auto p-3 text-sm text-zinc-200 ${bodyClassName}`.trim()}>
        <AnimatedMount show={!loading} fromOpacity={0} toOpacity={1} fromY={4} toY={0} durationMs={160}>
          {loading ? <PanelLoadingState label={loadingLabel} /> : children}
        </AnimatedMount>
      </div>
    </section>
  );
}
