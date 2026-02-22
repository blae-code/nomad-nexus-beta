/**
 * Token asset manifest for operational iconography.
 *
 * Keep all token file references centralized here so feature modules
 * do not hardcode raw paths into UI components.
 */

type NumberToken = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;
type NumberTokenFamily = `number-${NumberToken}`;

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
type NumberTokenColor = 'blue' | 'cyan' | 'green' | 'purple' | 'red' | 'yellow';

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

export function getTokenAssetUrl(family: TokenFamily, preferredColor: TokenColor = 'grey'): string {
  const color = nearestCompatibleColor(family, preferredColor);
  const cacheKey = `${family}:${color}`;
  const cached = tokenUrlCache.get(cacheKey);
  if (cached) return cached;
  const url = tokenAssetPath(`token-${family}-${color}.png`);
  tokenUrlCache.set(cacheKey, url);
  return url;
}

export function getNumberTokenAssetUrl(value: number, preferredColor: NumberTokenColor = 'yellow'): string {
  const clamped = Math.max(0, Math.min(13, Math.round(value))) as NumberToken;
  return getTokenAssetUrl(`number-${clamped}`, preferredColor);
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
});

