import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pagesConfigUrl = new URL('../src/pages.config.js', import.meta.url);
const { pagesConfig, PAGE_ROUTE_ALIASES, PAGE_ROUTE_OVERRIDES } = await import(
  pagesConfigUrl,
);

const { Pages, pageDefinitions } = pagesConfig ?? {};

if (!Pages || typeof Pages !== 'object') {
  throw new Error('pagesConfig.Pages must be defined as an object.');
}

if (!pageDefinitions || typeof pageDefinitions !== 'object') {
  throw new Error('pagesConfig.pageDefinitions must be defined as an object.');
}

const pageKeys = Object.keys(Pages);
const uniquePageKeys = new Set(pageKeys);

if (uniquePageKeys.size !== pageKeys.length) {
  throw new Error('Duplicate page keys detected in pagesConfig.Pages.');
}

const definitionKeys = Object.keys(pageDefinitions);
const missingDefinitions = pageKeys.filter((key) => !pageDefinitions[key]);
const extraDefinitions = definitionKeys.filter((key) => !Pages[key]);

if (missingDefinitions.length) {
  throw new Error(
    `Missing pageDefinitions entries for: ${missingDefinitions.join(', ')}`,
  );
}

if (extraDefinitions.length) {
  throw new Error(
    `pageDefinitions includes unused keys: ${extraDefinitions.join(', ')}`,
  );
}

const pagesConfigDir = path.dirname(fileURLToPath(pagesConfigUrl));

const hasDefaultExport = (source) =>
  /export\s+default\s+/m.test(source) || /export\s*\{[^}]*\bdefault\b[^}]*\}/m.test(source);

const normalizePageName = (pageName = '') =>
  pageName.trim().replace(/(Page|Screen|View)$/i, '').trim();

const createPageUrl = (pageName) => {
  const [rawName, query] = pageName.split('?');
  const normalizedName = normalizePageName(rawName);
  const normalizedLower = normalizedName.toLowerCase();
  const compactKey = normalizedLower.replace(/[\s-_]/g, '');

  const pathValue =
    compactKey === 'accessgate'
      ? '/access-gate'
      : '/' + normalizedLower.replace(/ /g, '-');

  return query ? `${pathValue}?${query}` : pathValue;
};

const routeRegistry = new Map();
const registerRoute = (routePath, pageKey, kind) => {
  if (typeof routePath !== 'string' || !routePath.startsWith('/')) {
    throw new Error(
      `Invalid ${kind} route for ${pageKey}: ${String(routePath)}`,
    );
  }

  const existing = routeRegistry.get(routePath);
  if (existing) {
    throw new Error(
      `Route collision on "${routePath}": ${existing.pageKey} (${existing.kind}) vs ${pageKey} (${kind})`,
    );
  }

  routeRegistry.set(routePath, { pageKey, kind });
};

for (const pageKey of pageKeys) {
  const pageComponent = Pages[pageKey];
  const definition = pageDefinitions[pageKey];

  if (!pageComponent) {
    throw new Error(`Pages entry is undefined for key: ${pageKey}`);
  }

  if (!definition?.file || typeof definition.file !== 'string') {
    throw new Error(`Missing file path for page definition: ${pageKey}`);
  }

  const expectedFileName = `/${pageKey}.jsx`;
  if (!definition.file.endsWith(expectedFileName)) {
    throw new Error(
      `Path mismatch for ${pageKey}: expected file to end with ${expectedFileName}, got ${definition.file}`,
    );
  }

  const filePath = path.resolve(pagesConfigDir, definition.file);

  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(
      `Missing page file for ${pageKey}: ${definition.file} (${error.message})`,
    );
  }

  const source = await fs.readFile(filePath, 'utf8');
  if (!hasDefaultExport(source)) {
    throw new Error(
      `Default export missing for ${pageKey}: ${definition.file}`,
    );
  }

  const canonicalPath = PAGE_ROUTE_OVERRIDES?.[pageKey] ?? createPageUrl(pageKey);
  registerRoute(canonicalPath, pageKey, 'canonical');

  const aliases = PAGE_ROUTE_ALIASES?.[pageKey] ?? [];
  if (!Array.isArray(aliases)) {
    throw new Error(`Aliases for ${pageKey} must be an array.`);
  }
  aliases.forEach((alias) => registerRoute(alias, pageKey, 'alias'));
}

const unusedOverrides = Object.keys(PAGE_ROUTE_OVERRIDES ?? {}).filter(
  (key) => !Pages[key],
);
if (unusedOverrides.length) {
  throw new Error(
    `PAGE_ROUTE_OVERRIDES contains unknown keys: ${unusedOverrides.join(', ')}`,
  );
}

const unusedAliases = Object.keys(PAGE_ROUTE_ALIASES ?? {}).filter(
  (key) => !Pages[key],
);
if (unusedAliases.length) {
  throw new Error(
    `PAGE_ROUTE_ALIASES contains unknown keys: ${unusedAliases.join(', ')}`,
  );
}

console.log('✅ Pages validation passed.');
