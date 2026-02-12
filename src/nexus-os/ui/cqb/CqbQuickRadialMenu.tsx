import React, { useMemo } from 'react';
import { getMacrosForVariant, type CqbMacroDefinition } from '../../registries/macroRegistry';
import { NexusBadge, NexusButton } from '../primitives';

interface CqbQuickRadialMenuProps {
  variantId: string;
  disabled?: boolean;
  onSelect: (macro: CqbMacroDefinition) => void;
}

const RADIAL_PRIORITY = [
  'CLEAR_COMMS',
  'CEASE_FIRE',
  'CHECK_FIRE',
  'CONTACT',
  'MOVE_OUT',
  'SET_SECURITY',
  'HOLD',
  'SELF_CHECK',
  'RELOADING',
  'DOWNED',
  'REVIVE',
  'EXTRACT',
];

function sortByPriority(macro: CqbMacroDefinition): number {
  const index = RADIAL_PRIORITY.indexOf(macro.eventType);
  return index >= 0 ? index : RADIAL_PRIORITY.length + macro.label.length;
}

function clampLabel(value: string): string {
  const next = String(value || '').trim();
  if (next.length <= 14) return next;
  return `${next.slice(0, 12)}..`;
}

export default function CqbQuickRadialMenu({ variantId, disabled = false, onSelect }: CqbQuickRadialMenuProps) {
  const radialMacros = useMemo(() => {
    const candidates = getMacrosForVariant(variantId).slice();
    return candidates.sort((a, b) => sortByPriority(a) - sortByPriority(b)).slice(0, 8);
  }, [variantId]);

  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-950/60 p-3 nexus-panel-glow">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-100">Quick Radial</h3>
        <NexusBadge tone="active">Hands-Free Ready</NexusBadge>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">
        Fast gameplay brevity dispatch. Alt+1..Alt+8 mirrors radial slots.
      </p>

      <div className="relative mt-3 mx-auto w-[min(20rem,100%)] aspect-square max-w-full rounded-full border border-zinc-800/70 bg-zinc-900/35 overflow-hidden">
        {radialMacros.map((macro, index) => {
          const angle = (-90 + (360 / Math.max(1, radialMacros.length)) * index) * (Math.PI / 180);
          const left = 50 + Math.cos(angle) * 34;
          const top = 50 + Math.sin(angle) * 34;
          return (
            <div
              key={macro.id}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <NexusButton
                size="sm"
                intent="subtle"
                disabled={disabled}
                onClick={() => onSelect(macro)}
                className="min-w-[5.4rem] sm:min-w-[6.2rem] justify-center text-[11px] px-1.5 sm:px-2"
                title={macro.tooltip || macro.label}
              >
                <span className="mr-1 text-[10px] text-orange-300">{index + 1}.</span>
                {clampLabel(macro.label)}
              </NexusButton>
            </div>
          );
        })}
        <div className="absolute inset-[31%] rounded-full border border-zinc-700/80 bg-zinc-900/80 grid place-content-center text-center px-3">
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500">Loop Core</div>
          <div className="text-xs font-semibold text-zinc-100">Press + Speak</div>
          <div className="text-[11px] text-zinc-400">PTT for voice parse</div>
        </div>
      </div>
    </section>
  );
}
