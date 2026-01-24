
import { lazy } from 'react';

// Normalize component imports (handle ESM/lazy module wrapping)
const normalizeComponent = (importPromise) =>
  lazy(() => importPromise.then(m => ({ default: m.default || m })));

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
