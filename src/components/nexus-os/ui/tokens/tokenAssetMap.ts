/**
 * Token asset manifest for operational iconography.
 *
 * Keep all token file references centralized here so feature modules
 * do not hardcode raw paths into UI components.
 */

export type NumberToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
export type NumberTokenFamily = `number-${NumberToken}`;

type BaseTokenFamily =
  | 'ammunition'
  | 'circle'
  | 'energy'
  | 'food'
  | 'fuel'
  | 'hex'
  | 'hospital'
  | 'mechanics'
  | 'objective'
  | 'penta'
  | 'shelter'
  | 'square'
  | 'target'
  | 'target-alt'
  | 'triangle';

export type TokenFamily = BaseTokenFamily | NumberTokenFamily;
export type TokenColor = 'blue' | 'cyan' | 'green' | 'grey' | 'orange' | 'purple' | 'red' | 'yellow' | 'violet';
export type NumberTokenColor = 'blue' | 'cyan' | 'green' | 'purple' | 'red' | 'yellow';
export type TokenVariant = 'base' | 'v1' | 'v2';

interface TokenAssetOptions {
  variant?: TokenVariant;
}

const NUMBER_TOKEN_VALUES: readonly NumberToken[] = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
const NUMBER_TOKEN_PURPLE_VARIANT_BY_KEY: Readonly<Record<Exclude<TokenVariant, 'base'>, string>> = Object.freeze({
  v1: 'purple-1',
  v2: 'purple-2',
});

const TOKEN_FAMILY_COLORS: Record<TokenFamily, readonly TokenColor[]> = {
  ammunition: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  circle: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  energy: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  food: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  fuel: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  hex: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  hospital: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  mechanics: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  objective: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  penta: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  shelter: ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  square: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  target: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  'target-alt': ['blue', 'cyan', 'green', 'grey', 'orange', 'purple', 'red', 'yellow'],
  triangle: ['blue', 'cyan', 'green', 'grey', 'orange', 'red', 'violet', 'yellow'],
  'number-0': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-1': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-2': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-3': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-4': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-5': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-6': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-7': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-8': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-9': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-10': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-11': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-12': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
  'number-13': ['blue', 'cyan', 'green', 'purple', 'red', 'yellow'],
};

const COLOR_FALLBACK_ORDER: readonly TokenColor[] = ['grey', 'green', 'blue', 'cyan', 'yellow', 'orange', 'red', 'purple', 'violet'];
const tokenUrlCache = new Map<string, string>();

function tokenAssetPath(fileName: string): string {
  return new URL(`../../../../../tokens/${fileName}`, import.meta.url).href;
}

function nearestCompatibleColor(family: TokenFamily, preferred: TokenColor): TokenColor {
  const available = TOKEN_FAMILY_COLORS[family];
  if (available.includes(preferred)) return preferred;
  if (preferred === 'violet' && available.includes('purple')) return 'purple';
  if (preferred === 'purple' && available.includes('violet')) return 'violet';

  const next = COLOR_FALLBACK_ORDER.find((color) => available.includes(color));
  return next || available[0];
}

function isNumberTokenFamily(family: TokenFamily): family is NumberTokenFamily {
  return family.startsWith('number-');
}

function resolveTokenFileName(family: TokenFamily, color: TokenColor, variant: TokenVariant): string {
  if (variant !== 'base' && color === 'purple' && isNumberTokenFamily(family)) {
    const variantKey = NUMBER_TOKEN_PURPLE_VARIANT_BY_KEY[variant as Exclude<TokenVariant, 'base'>];
    if (variantKey) return `token-${family}-${variantKey}.png`;
  }
  return `token-${family}-${color}.png`;
}

export function getTokenAssetUrl(
  family: TokenFamily,
  preferredColor: TokenColor = 'grey',
  options: TokenAssetOptions = {}
): string {
  const color = nearestCompatibleColor(family, preferredColor);
  const variant = options.variant || 'base';
  const cacheKey = `${family}:${color}:${variant}`;
  const cached = tokenUrlCache.get(cacheKey);
  if (cached) return cached;
  const url = tokenAssetPath(resolveTokenFileName(family, color, variant));
  tokenUrlCache.set(cacheKey, url);
  return url;
}

export function getNumberTokenAssetUrl(
  value: number,
  preferredColor: NumberTokenColor = 'yellow',
  options: TokenAssetOptions = {}
): string {
  const clamped = Math.max(0, Math.min(13, Math.round(value))) as NumberToken;
  return getTokenAssetUrl(`number-${clamped}`, preferredColor, options);
}

export function getNumberTokenVariantByState(statusLike: string): TokenVariant {
  const token = String(statusLike || '').trim().toLowerCase();
  if (!token) return 'base';
  if (token.includes('secure') || token.includes('encrypt') || token.includes('harden') || token.includes('auth')) return 'v1';
  if (token.includes('escalat') || token.includes('critical') || token.includes('degrad') || token.includes('jam')) return 'v2';
  return 'base';
}

function buildTokenCatalogEntries(): Array<{
  family: TokenFamily;
  color: TokenColor;
  variant: TokenVariant;
  fileName: string;
}> {
  const rows: Array<{ family: TokenFamily; color: TokenColor; variant: TokenVariant; fileName: string }> = [];
  const families = Object.keys(TOKEN_FAMILY_COLORS) as TokenFamily[];
  for (const family of families) {
    const colors = TOKEN_FAMILY_COLORS[family];
    for (const color of colors) {
      rows.push({ family, color, variant: 'base', fileName: resolveTokenFileName(family, color, 'base') });
      if (isNumberTokenFamily(family) && color === 'purple') {
        rows.push({ family, color, variant: 'v1', fileName: resolveTokenFileName(family, color, 'v1') });
        rows.push({ family, color, variant: 'v2', fileName: resolveTokenFileName(family, color, 'v2') });
      }
    }
  }
  return rows;
}

const TOKEN_CATALOG_ENTRIES = Object.freeze(buildTokenCatalogEntries());
const TOKEN_CATALOG_FILE_SET = Object.freeze(new Set(TOKEN_CATALOG_ENTRIES.map((entry) => entry.fileName)));

function buildNumberTokenByValue(): Record<NumberToken, NumberTokenFamily> {
  return NUMBER_TOKEN_VALUES.reduce((acc, value) => {
    acc[value] = `number-${value}`;
    return acc;
  }, {} as Record<NumberToken, NumberTokenFamily>);
}

export const tokenAssets = Object.freeze({
  comms: {
    channel: getTokenAssetUrl('hex', 'orange'),
    vehicle: getTokenAssetUrl('target-alt', 'blue'),
    role: {
      command: getTokenAssetUrl('target', 'orange'),
      flight: getTokenAssetUrl('fuel', 'cyan'),
      medical: getTokenAssetUrl('hospital', 'green'),
      support: getTokenAssetUrl('mechanics', 'yellow'),
      default: getTokenAssetUrl('square', 'cyan'),
    },
    operatorStatus: {
      tx: getTokenAssetUrl('circle', 'orange'),
      onNet: getTokenAssetUrl('circle', 'green'),
      muted: getTokenAssetUrl('circle', 'grey'),
      offNet: getTokenAssetUrl('circle', 'red'),
    },
    vehicleStatus: {
      active: getTokenAssetUrl('target-alt', 'yellow'),
      ready: getTokenAssetUrl('target-alt', 'green'),
      mixed: getTokenAssetUrl('target-alt', 'cyan'),
      degraded: getTokenAssetUrl('target-alt', 'red'),
    },
  },
  map: {
    node: {
      comms: getTokenAssetUrl('hex', 'orange'),
      objective: getTokenAssetUrl('objective', 'yellow'),
      target: getTokenAssetUrl('target', 'orange'),
    },
    callout: {
      high: getTokenAssetUrl('triangle', 'orange'),
      critical: getTokenAssetUrl('triangle', 'red'),
      standard: getTokenAssetUrl('triangle', 'blue'),
    },
    logistics: {
      ammunition: getTokenAssetUrl('ammunition', 'yellow'),
      food: getTokenAssetUrl('food', 'green'),
      fuel: getTokenAssetUrl('fuel', 'orange'),
      medical: getTokenAssetUrl('hospital', 'green'),
      maintenance: getTokenAssetUrl('mechanics', 'cyan'),
      energy: getTokenAssetUrl('energy', 'blue'),
      shelter: getTokenAssetUrl('shelter', 'cyan'),
    },
  },
  ops: {
    status: {
      planning: getTokenAssetUrl('penta', 'blue'),
      active: getTokenAssetUrl('penta', 'green'),
      wrapping: getTokenAssetUrl('penta', 'yellow'),
      archived: getTokenAssetUrl('penta', 'grey'),
    },
    priority: {
      high: getTokenAssetUrl('target-alt', 'red'),
      medium: getTokenAssetUrl('target-alt', 'orange'),
      low: getTokenAssetUrl('target-alt', 'green'),
    },
  },
});

export const tokenCatalog = Object.freeze({
  families: Object.keys(TOKEN_FAMILY_COLORS) as TokenFamily[],
  colorsByFamily: TOKEN_FAMILY_COLORS,
  entries: TOKEN_CATALOG_ENTRIES,
  fileNames: [...TOKEN_CATALOG_FILE_SET],
  byNumberValue: buildNumberTokenByValue(),
  variants: ['base', 'v1', 'v2'] as readonly TokenVariant[],
});
