import { lazy } from 'react';
import DefaultLayout from '@/Layout';
import { createPageUrl } from '@/utils';

const pageModules = import.meta.glob('./pages/**/*.jsx');

const normalizePageKey = (path) => {
  const fileName = path.split('/').pop() ?? '';
  return fileName.replace(/\.[^/.]+$/, '');
};

export const PAGE_ROUTE_OVERRIDES = {
  AccessGate: '/access-gate',
  CommsConsole: '/comms-console',
  FleetManager: '/fleet-manager',
  UniverseMap: '/universe-map',
};

export const PAGE_ROUTE_ALIASES = {
  Hub: ['/'],
  Admin: ['/adminconsole'],
  AccessGate: ['/accessgate'],
  CommsConsole: ['/commsconsole'],
  FleetManager: ['/fleetmanager'],
  UniverseMap: ['/universemap'],
};

const Pages = Object.fromEntries(
  Object.entries(pageModules).map(([path, importer]) => {
    const pageKey = normalizePageKey(path);
    const Component = lazy(async () => {
      const module = await importer();
      return module;
    });

    return [pageKey, Component];
  }),
);

export const pagesConfig = Object.keys(Pages)
  .sort()
  .map((pageKey) => {
    const canonicalPath = PAGE_ROUTE_OVERRIDES[pageKey] ?? createPageUrl(pageKey);
    return {
      path: canonicalPath,
      name: pageKey,
    };
  });

const config = {
  Pages,
  Layout: DefaultLayout,
  mainPage: 'Hub',
};

export const { Layout, mainPage } = config;

export default config;
