
import { lazy } from 'react';

// Lazy load heavy pages to reduce initial bundle size
export const LazyCommsConsole = lazy(() => import('@/pages/CommsConsole'));
export const LazyEvents = lazy(() => import('@/pages/Events'));
export const LazyAdminCockpit = lazy(() => import('@/pages/AdminCockpit'));
export const LazyFleetManager = lazy(() => import('@/pages/FleetManager'));
export const LazyIntelligence = lazy(() => import('@/pages/Intelligence'));
export const LazyTreasury = lazy(() => import('@/pages/Treasury'));
export const LazyChannels = lazy(() => import('@/pages/Channels'));
export const LazyUniverseMap = lazy(() => import('@/pages/UniverseMap'));
export const LazyProfile = lazy(() => import('@/pages/Profile'));
export const LazyRescue = lazy(() => import('@/pages/Rescue'));

// Deprecated: Use LazyAdminCockpit instead
export const LazyAdminConsole = LazyAdminCockpit;
