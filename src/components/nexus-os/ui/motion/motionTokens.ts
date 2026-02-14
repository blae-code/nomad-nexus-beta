export const motionTokens = Object.freeze({
  duration: {
    instant: 0,
    fast: 120,
    normal: 180,
    slow: 260,
    overlay: 220,
  },
  easing: {
    standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
    entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
});

export function resolveMotionDuration(ms: number, reducedMotion: boolean): number {
  return reducedMotion ? motionTokens.duration.instant : ms;
}

