import React from 'react';
import { useTailwindReady } from '@/components/hooks/useTailwindReady';
import TailwindLoader from './TailwindLoader';
import TailwindError from './TailwindError';

/**
 * TailwindReadyGate - Pass-through (CDN checks removed)
 * Tailwind is managed by Base44 platform, no checks needed
 */
export default function TailwindReadyGate({ children }) {
  return children;
}