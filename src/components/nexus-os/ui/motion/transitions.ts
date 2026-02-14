import { motionTokens, resolveMotionDuration } from './motionTokens';
import type { CSSProperties } from 'react';

export type TransitionPreset = 'focus' | 'panel' | 'overlay' | 'toggle' | 'radial';

const PRESET_DURATION_MS: Record<TransitionPreset, number> = {
  focus: motionTokens.duration.normal,
  panel: motionTokens.duration.fast,
  overlay: motionTokens.duration.overlay,
  toggle: motionTokens.duration.fast,
  radial: motionTokens.duration.fast,
};

export function transitionDurationMs(
  preset: TransitionPreset,
  reducedMotion: boolean,
  fallbackMs?: number
): number {
  const ms = typeof fallbackMs === 'number' ? fallbackMs : PRESET_DURATION_MS[preset];
  return resolveMotionDuration(ms, reducedMotion);
}

export function transitionStyle(input: {
  preset: TransitionPreset;
  reducedMotion: boolean;
  properties?: string;
  durationMs?: number;
  easing?: string;
  delayMs?: number;
  willChange?: string;
}): CSSProperties {
  const duration = transitionDurationMs(input.preset, input.reducedMotion, input.durationMs);
  return {
    transitionProperty: input.properties || 'opacity, transform',
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: input.easing || motionTokens.easing.standard,
    transitionDelay: `${input.reducedMotion ? 0 : input.delayMs || 0}ms`,
    willChange: input.reducedMotion ? 'auto' : input.willChange || 'opacity, transform',
  };
}
