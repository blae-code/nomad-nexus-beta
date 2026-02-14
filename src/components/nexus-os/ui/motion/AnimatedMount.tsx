import React, { useMemo } from 'react';
import { motionTokens, resolveMotionDuration } from './motionTokens';
import { useReducedMotion } from './useReducedMotion';

interface AnimatedMountProps {
  show?: boolean;
  children: React.ReactNode;
  className?: string;
  fromOpacity?: number;
  toOpacity?: number;
  fromY?: number;
  toY?: number;
  durationMs?: number;
  delayMs?: number;
}

export default function AnimatedMount({
  show = true,
  children,
  className = '',
  fromOpacity = 0,
  toOpacity = 1,
  fromY = 6,
  toY = 0,
  durationMs = motionTokens.duration.normal,
  delayMs = 0,
}: AnimatedMountProps) {
  const reducedMotion = useReducedMotion();
  const duration = resolveMotionDuration(durationMs, reducedMotion);

  const style = useMemo(
    () => ({
      opacity: show ? toOpacity : fromOpacity,
      transform: `translateY(${show ? toY : fromY}px)`,
      transitionProperty: 'opacity, transform',
      transitionDuration: `${duration}ms`,
      transitionTimingFunction: motionTokens.easing.entrance,
      transitionDelay: `${reducedMotion ? 0 : delayMs}ms`,
      willChange: reducedMotion ? 'auto' : 'opacity, transform',
    }),
    [show, toOpacity, fromOpacity, toY, fromY, duration, reducedMotion, delayMs]
  );

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

