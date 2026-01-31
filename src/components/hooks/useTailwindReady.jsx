import { useEffect, useState } from 'react';

/**
 * No-op compatibility export for Base44 infrastructure
 * Tailwind is managed by Base44, no injection needed
 */
export function ensureTailwindCdn() {
  return Promise.resolve();
}

/**
 * Passive Tailwind detection - trusts Base44 infrastructure
 * No injection, no safelist, no style verification
 */
function detectTailwind() {
  if (typeof window === 'undefined') return false;
  
  // Fast O(1) checks
  const hasScript = Boolean(document.querySelector('script[src*="cdn.tailwindcss.com"]'));
  const hasGlobal = typeof window.tailwind !== 'undefined';
  
  return hasScript || hasGlobal;
}

/**
 * Two-tier readiness: DOM-ready (fast) + App-ready (beacon or fallback)
 */
function checkAppReady() {
  // Tier A: DOM-ready
  if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
    return false;
  }
  
  const root = document.getElementById('root');
  if (!root) return false;
  
  // Tier B: App-ready (prefer beacon)
  const beacon = document.getElementById('nn-ready');
  if (beacon) return true;
  
  // Fallback: React mounted (root has children)
  return root.children.length > 0;
}

/**
 * useTailwindReady - No-op (CDN checks removed)
 * Tailwind is managed by Base44 platform
 */
export function useTailwindReady() {
  return { ready: true, error: null, waiting: false };
}