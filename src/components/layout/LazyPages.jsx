import { lazy } from 'react';

// Normalize component imports (handle ESM/lazy module wrapping)
const normalizeComponent = (importPromise) =>
  lazy(() => 
    importPromise.then(m => {
      // If it's already a component function, wrap it
      if (typeof m === 'function') {
        return { default: m };
      }
      // If it has a default export, use that
      if (m.default && typeof m.default === 'function') {
        return { default: m.default };
      }
      // Fallback - shouldn't happen but safe guard
      return { default: m };
    })
  );

// Lazy load heavy pages to reduce initial bundle size
export const LazyCommsConsole = normalizeComponent(import('@/pages/CommsConsole'));
export const LazyEvents = normalizeComponent(import('@/pages/Events'));
export const LazyAdminCockpit = normalizeComponent(import('@/pages/AdminCockpit'));
export const LazyFleetManager = normalizeComponent(import('@/pages/FleetManager'));
export const LazyIntelligence = normalizeComponent(import('@/pages/Intelligence'));
export const LazyTreasury = normalizeComponent(import('@/pages/Treasury'));
export const LazyChannels = normalizeComponent(import('@/pages/Channels'));
export const LazyUniverseMap = normalizeComponent(import('@/pages/UniverseMap'));
export const LazyProfile = normalizeComponent(import('@/pages/Profile'));
export const LazyRescue = normalizeComponent(import('@/pages/Rescue'));
export const LazyAccessGate = normalizeComponent(import('@/pages/AccessGate'));

// Deprecated: Use LazyAdminCockpit instead
export const LazyAdminConsole = LazyAdminCockpit;