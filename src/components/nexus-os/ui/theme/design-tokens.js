import { getTokenAssetUrl, tokenCatalog } from '../tokens';

/**
 * NexusOS typography scale.
 */
export const NX_TYPOGRAPHY = Object.freeze({
  headerPrimary: 'text-[10px] font-black tracking-[0.15em] uppercase leading-none',
  headerSecondary: 'text-[8px] font-bold tracking-[0.14em] uppercase leading-none',
  bodyPrimary: 'text-[10px] font-semibold tracking-[0.12em] uppercase',
  bodySecondary: 'text-[8px] font-semibold tracking-[0.14em] leading-none uppercase',
  telemetry: 'text-[10px] font-mono font-bold tracking-[0.15em] uppercase',
  telemetrySmall: 'text-[8px] font-mono font-semibold tracking-[0.14em] uppercase',
});

/**
 * Semantic color map for NexusOS.
 */
export const NX_COLORS = Object.freeze({
  bgPrimary: 'zinc-950',
  bgElevated: 'zinc-900',
  borderStandard: 'zinc-700/40',
  borderElevated: 'zinc-700/60',
  borderDivider: 'zinc-800/60',
  accentPrimary: 'orange-500',
  accentBright: 'orange-400',
  accentCommand: 'red-600',
  ok: 'green-400',
  warning: 'amber-400',
  danger: 'red-500',
  neutral: 'zinc-400',
});

/**
 * Spacing presets for common shell regions.
 */
export const NX_SPACING = Object.freeze({
  headerStandard: 'px-2.5 py-2',
  headerCompact: 'px-2 py-1.5',
  panel: 'p-1.5',
  card: 'px-1.5 py-1',
  gapTight: 'gap-1',
  gapStandard: 'gap-1.5',
  gapRelaxed: 'gap-2',
});

/**
 * Icon size matrix.
 */
export const NX_ICON_SIZES = Object.freeze({
  xs: 'w-2.5 h-2.5',
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
});

/**
 * Border style presets.
 */
export const NX_BORDERS = Object.freeze({
  standard: 'border border-zinc-700/40',
  elevated: 'border border-zinc-700/60',
  divider: 'border-zinc-800/60',
});

/**
 * Backdrop presets.
 */
export const NX_BACKDROPS = Object.freeze({
  panel: 'bg-zinc-950/80 backdrop-blur-sm',
  header: 'bg-zinc-900/40 backdrop-blur-sm',
});

/**
 * Transition presets.
 */
export const NX_TRANSITIONS = Object.freeze({
  fast: 'transition-all duration-150',
  standard: 'transition-all duration-200',
  slow: 'transition-all duration-300',
});

/**
 * Token size classes mapped to Tailwind dimensions.
 */
export const NX_TOKEN_SIZES = Object.freeze({
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
});

/**
 * Semantic token recommendations.
 */
export const NX_TOKEN_USE_CASES = Object.freeze({
  status: {
    ready: { family: 'circle', color: 'green' },
    active: { family: 'circle', color: 'orange' },
    warning: { family: 'circle', color: 'yellow' },
    offline: { family: 'circle', color: 'grey' },
    danger: { family: 'circle', color: 'red' },
  },
  priority: {
    high: { family: 'triangle', color: 'red' },
    medium: { family: 'triangle', color: 'orange' },
    low: { family: 'triangle', color: 'blue' },
  },
  operation: {
    planning: { family: 'penta', color: 'blue' },
    briefing: { family: 'penta', color: 'cyan' },
    active: { family: 'penta', color: 'green' },
    debrief: { family: 'penta', color: 'yellow' },
    archived: { family: 'penta', color: 'grey' },
  },
  channel: {
    command: { family: 'hex', color: 'orange' },
    squad: { family: 'hex', color: 'cyan' },
    support: { family: 'hex', color: 'yellow' },
    general: { family: 'hex', color: 'grey' },
  },
  resource: {
    fuel: { family: 'fuel', color: 'orange' },
    ammo: { family: 'ammunition', color: 'yellow' },
    medical: { family: 'hospital', color: 'green' },
    repair: { family: 'mechanics', color: 'cyan' },
    food: { family: 'food', color: 'green' },
    energy: { family: 'energy', color: 'blue' },
    shelter: { family: 'shelter', color: 'cyan' },
  },
  objective: {
    primary: { family: 'objective', color: 'yellow' },
    active: { family: 'target', color: 'orange' },
    complete: { family: 'objective', color: 'green' },
    failed: { family: 'objective', color: 'red' },
  },
});

/**
 * Shared token + text layout patterns.
 */
export const NX_TOKEN_LAYOUTS = Object.freeze({
  inline: 'inline-flex items-center gap-1.5',
  stacked: 'inline-flex flex-col items-center gap-1',
  compact: 'inline-flex items-center gap-1',
});

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Resolve a semantic token and return a ready-to-render descriptor.
 */
export function getSemanticToken(category, state, size = 'md') {
  const categoryKey = normalizeKey(category);
  const stateKey = normalizeKey(state);
  const categoryMap = NX_TOKEN_USE_CASES[categoryKey] || {};
  const resolved = categoryMap[stateKey] || categoryMap.active || categoryMap.ready || { family: 'circle', color: 'grey' };
  const family = resolved.family;
  const color = resolved.color;
  const sizeClass = NX_TOKEN_SIZES[size] || NX_TOKEN_SIZES.md;
  return {
    ...resolved,
    size: size in NX_TOKEN_SIZES ? size : 'md',
    sizeClass,
    src: getTokenAssetUrl(family, color),
    family,
    color,
  };
}

/**
 * Token metadata useful for docs and validation.
 */
export const NX_TOKEN_LIBRARY_META = Object.freeze({
  familyCount: tokenCatalog.families.length,
  variantCount: tokenCatalog.variants.length,
  tokenCount: tokenCatalog.entries.length,
});
