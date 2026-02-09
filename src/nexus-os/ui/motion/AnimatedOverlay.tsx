import React, { useEffect, useState } from 'react';
import { motionTokens, resolveMotionDuration } from './motionTokens';
import { useReducedMotion } from './useReducedMotion';

interface AnimatedOverlayProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function AnimatedOverlay({ open, children, className = '' }: AnimatedOverlayProps) {
  const reducedMotion = useReducedMotion();
  const duration = resolveMotionDuration(motionTokens.duration.overlay, reducedMotion);
  const [isMounted, setIsMounted] = useState(open);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setIsMounted(true);
      requestAnimationFrame(() => setIsVisible(true));
      return undefined;
    }

    setIsVisible(false);
    if (duration === 0) {
      setIsMounted(false);
      return undefined;
    }

    const timer = setTimeout(() => setIsMounted(false), duration);
    return () => clearTimeout(timer);
  }, [open, duration]);

  if (!isMounted) return null;

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${duration}ms ${motionTokens.easing.standard}`,
      }}
    >
      {children}
    </div>
  );
}

