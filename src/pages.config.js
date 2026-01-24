import __Layout from './Layout.jsx';

const pagesGlob = import.meta.glob('./pages/*.jsx', { eager: true });

export const PAGES = Object.entries(pagesGlob).reduce((acc, [path, mod]) => {
  const name = path.match(/\/([^/]+)\.jsx$/)?.[1];
  const Comp = mod?.default ?? mod?.[name];
  if (name && typeof Comp === 'function') acc[name] = Comp;
  return acc;
}, {});

export const PAGE_ROUTE_OVERRIDES = {};
export const PAGE_ROUTE_ALIASES = {};

export const pagesConfig = {
  mainPage: 'Hub',
  Pages: PAGES,
  Layout: __Layout,
};

export default pagesConfig;
