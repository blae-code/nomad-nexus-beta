import __Layout from './Layout.jsx';

// Load pages from filesystem (eager so Base44 router can read immediately)
const pagesGlob = import.meta.glob('./pages/*.jsx', { eager: true });

export const PAGES = Object.entries(pagesGlob).reduce((acc, [path, mod]) => {
  const name = path.match(/\/([^/]+)\.jsx$/)?.[1];
  const Comp = mod?.default ?? mod?.[name];
  if (name && typeof Comp === 'function') acc[name] = Comp;
  return acc;
}, {});

// Keep these exports because various app files import them
export const PAGE_ROUTE_OVERRIDES = {};
export const PAGE_ROUTE_ALIASES = {}; // ✅ REQUIRED (fixes your current crash)

// Base44 expects pagesConfig and also tolerates a default export
export const pagesConfig = {
  mainPage: 'Hub',
  Pages: PAGES,
  Layout: __Layout,
  PAGE_ROUTE_OVERRIDES,
  PAGE_ROUTE_ALIASES,
};

export default pagesConfig;
