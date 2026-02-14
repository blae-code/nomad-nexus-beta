import React, { useEffect } from 'react';
import { getNexusCssVars } from '../tokens';
import { NexusButton } from '../primitives';
import { AnimatedMount, AnimatedOverlay, transitionStyle, useReducedMotion } from '../motion';

/**
 * CommandFocus overlay
 * State-only overlay with explicit exit affordance; no routing changes.
 */
export default function CommandFocus({ open, onClose, FocusApp }) {
  const vars = getNexusCssVars();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatedOverlay open={open} className="fixed inset-0 z-[1200] bg-black/75 backdrop-blur-[1px] p-4 sm:p-6" role="dialog" aria-modal="true">
      <AnimatedMount show={open} fromOpacity={0.85} toOpacity={1} fromY={6} toY={0} durationMs={180}>
        <div
          className="h-full w-full rounded-lg border border-zinc-700 bg-zinc-950/95 shadow-2xl overflow-hidden flex flex-col"
          style={{
            ...vars,
            ...transitionStyle({
              preset: 'overlay',
              reducedMotion,
              properties: 'opacity, transform',
            }),
            borderColor: 'var(--nx-border-strong)',
            boxShadow: 'var(--nx-shadow-shell)',
          }}
        >
          <header className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wide text-zinc-100">Command Focus</h2>
              <p className="text-xs text-zinc-500">Dominant mode overlay for high-attention command tasks.</p>
            </div>
            <NexusButton size="sm" intent="danger" onClick={onClose}>
              Exit Focus
            </NexusButton>
          </header>
          <div className="flex-1 min-h-0 overflow-hidden p-4">
            {FocusApp ? <FocusApp /> : <div className="text-sm text-zinc-400">No focus app selected.</div>}
          </div>
        </div>
      </AnimatedMount>
    </AnimatedOverlay>
  );
}
