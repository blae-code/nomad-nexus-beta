import React from 'react';
import { Cpu, Gauge } from 'lucide-react';
import { useReducedMotion } from '../motion';
import { transitionStyle } from '../motion/transitions';
import { NexusBadge } from '../primitives';
import type { NexusBootMode } from './bootStateMachine';

interface NexusBootOverlayProps {
  visible: boolean;
  mode: NexusBootMode;
  phaseLabel: string;
  progress: number;
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export default function NexusBootOverlay({
  visible,
  mode,
  phaseLabel,
  progress,
}: NexusBootOverlayProps) {
  const reducedMotion = useReducedMotion();
  const safeProgress = clampProgress(progress);

  return (
    <div
      className="absolute inset-0 z-[1250] flex items-end justify-start p-4 sm:p-6 bg-zinc-950/55 backdrop-blur-[2px]"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        ...transitionStyle({
          preset: 'overlay',
          reducedMotion,
          properties: 'opacity',
        }),
      }}
      aria-hidden={!visible}
    >
      <section className="w-full max-w-xl rounded-xl border border-zinc-700/90 bg-[linear-gradient(180deg,rgba(58,35,25,0.9),rgba(16,13,11,0.96))] px-4 py-3 shadow-2xl nexus-panel-glow">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-zinc-200 text-xs font-semibold uppercase tracking-wide">
            <Cpu className="w-3.5 h-3.5 text-orange-300" />
            Nexus OS {mode === 'resume' ? 'Resume' : 'Boot'}
          </div>
          <NexusBadge tone={mode === 'resume' ? 'active' : 'warning'}>
            {mode === 'resume' ? 'Resume Session' : 'Cold Boot'}
          </NexusBadge>
        </div>

        <div className="text-sm text-zinc-300">{phaseLabel}</div>

        <div className="mt-3 h-2 rounded bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-700 to-orange-400"
            style={{
              width: `${Math.round(safeProgress * 100)}%`,
              ...transitionStyle({
                preset: 'panel',
                reducedMotion,
                properties: 'width',
              }),
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            Session state machine active
          </span>
          <span>{Math.round(safeProgress * 100)}%</span>
        </div>
      </section>
    </div>
  );
}
