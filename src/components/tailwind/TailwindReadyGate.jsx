import React from 'react';
import { useTailwindReady } from '@/components/hooks/useTailwindReady';
import TailwindLoader from './TailwindLoader';
import TailwindError from './TailwindError';

/**
 * TailwindReadyGate - Prevents app rendering until Tailwind CDN loads
 * Shows loader or error screen (with inline styles only) while waiting
 */
export default function TailwindReadyGate({ children, timeoutMs = 8000 }) {
  const { ready, error, waiting, elapsed } = useTailwindReady({ timeoutMs });

  // Still waiting for Tailwind
  if (waiting) {
    return <TailwindLoader elapsed={elapsed} />;
  }

  // Tailwind load failed
  if (error) {
    return <TailwindError error={error} elapsed={elapsed} />;
  }

  // Tailwind ready, render children
  return children;
}