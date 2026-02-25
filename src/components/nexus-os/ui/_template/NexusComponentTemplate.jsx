import React from 'react';
import { NexusBadge, NexusButton, NexusTokenIcon } from '../primitives';

/**
 * NexusComponentTemplate - baseline for new NexusOS components.
 *
 * DESIGN COMPLIANCE:
 * - Typography: text-[10px]/text-[8px], uppercase, tracking-[0.12em]+
 * - Spacing: p-1.5/2/2.5 and gap-1/1.5/2
 * - Icons: w-2.5..w-4
 * - Tokens: use semantic families only
 *
 * @see src/components/nexus-os/STYLE_GUIDE.md
 */
export default function NexusComponentTemplate({
  title = 'Template',
  status = 'READY',
  onAction,
}) {
  return (
    <section className="rounded border border-zinc-700/40 bg-zinc-950/80 backdrop-blur-sm p-1.5 space-y-1.5">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] leading-none text-zinc-100">{title}</h3>
        <NexusBadge tone="active">{status}</NexusBadge>
      </header>

      <div className="flex items-center gap-1.5">
        <NexusTokenIcon family="hex" color="cyan" size="sm" alt="Template token" />
        <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Component Baseline</span>
      </div>

      <div className="flex items-center gap-1">
        <NexusButton intent="primary" size="sm" onClick={onAction} aria-label="Execute template action">
          Execute
        </NexusButton>
      </div>
    </section>
  );
}

