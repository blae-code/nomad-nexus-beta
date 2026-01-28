import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import DefaultLayout from '@/Layout';
import { createPageUrl } from '@/utils';

type PageModule = { default: ComponentType<any> };

const pageModules = import.meta.glob<PageModule>('./pages/**/*.jsx');

const normalizePageKey = (path: string) => {
  const fileName = path.split('/').pop() ?? '';
  return fileName.replace(/\.[^/.]+$/, '');
};

export const PAGE_ROUTE_OVERRIDES: Record<string, string> = {
  AccessGate: '/access-gate',
  CommsConsole: '/comms-console',
  FleetManager: '/fleet-manager',
  UniverseMap: '/universe-map',
};

export const PAGE_ROUTE_ALIASES: Record<string, string[]> = {
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
) as Record<string, LazyExoticComponent<ComponentType<any>>>;

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
