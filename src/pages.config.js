import Layout from "./Layout.jsx";

// Eager-load all pages in src/pages/
const pagesGlob = import.meta.glob("./pages/*.jsx", { eager: true });

export const PAGES = Object.entries(pagesGlob).reduce((acc, [path, mod]) => {
  const name = path.match(/\/([^/]+)\.jsx$/)?.[1];
  const Comp = mod?.default ?? mod?.[name];
  if (name && typeof Comp === "function") acc[name] = Comp;
  return acc;
}, {});

// REQUIRED named exports (some components import these)
export const PAGE_ROUTE_OVERRIDES = {
  '/': '/Hub',
  '/hub': '/Hub',
  '/academy': '/Academy',
  '/events': '/Events',
  '/intelligence': '/Intelligence',
  '/admin': '/AdminCockpit',
  '/universemap': '/UniverseMap',
  '/fleetmanager': '/FleetManager',
  '/rescue': '/Rescue',
  '/channels': '/Channels',
  '/profile': '/Profile',
  '/settings': '/Settings',
  '/access-gate': '/AccessGate',
  '/accessgate': '/AccessGate',
  '/login': '/AccessGate',
};

export const PAGE_ROUTE_ALIASES = {
  '/nomadopsdashboard': '/NomadOpsDashboard',
  '/commsconsole': '/CommsConsole',
  '/adminconsole': '/AdminCockpit',
};

export const pagesConfig = {
  mainPage: "Hub",
  Pages: PAGES,
  Layout,
  PAGE_ROUTE_OVERRIDES,
  PAGE_ROUTE_ALIASES,
};

export default pagesConfig;