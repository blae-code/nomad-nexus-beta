/**
 * NexusOS Design Token Registry
 * 
 * Single source of truth for all design decisions in NexusOS.
 * Import these tokens instead of hardcoding values.
 * 
 * @see components/nexus-os/STYLE_GUIDE.md
 */

import { getTokenAssetUrl, getNumberTokenAssetUrl, tokenAssets } from '../tokens/tokenAssetMap';

// ============================================================================
// TYPOGRAPHY SCALES
// ============================================================================

/**
 * Typography hierarchy for all NexusOS text.
 * Military-grade precision: 8px and 10px only, bold weights, wide tracking, uppercase.
 */
export const NX_TYPOGRAPHY = {
  /** Main headers: Panel titles, section headers */
  headerPrimary: 'text-[10px] font-black tracking-[0.15em] uppercase leading-none',
  
  /** Secondary headers: Subsection titles */
  headerSecondary: 'text-[8px] font-bold tracking-[0.14em] uppercase leading-none',
  
  /** Body text: Primary labels, descriptions */
  bodyPrimary: 'text-[10px] font-semibold tracking-[0.12em] uppercase',
  
  /** Body text: Secondary labels, helper text */
  bodySecondary: 'text-[8px] font-semibold tracking-[0.14em] leading-none',
  
  /** Telemetry: Numeric values, status codes, coordinates */
  telemetryPrimary: 'text-[10px] font-mono font-bold tracking-[0.15em]',
  
  /** Telemetry: Small metrics, compact data */
  telemetrySecondary: 'text-[8px] font-mono font-semibold tracking-[0.14em]',
  
  /** Button text: All button labels */
  button: 'text-[10px] font-semibold uppercase tracking-[0.12em]',
  
  /** Badge text: All badge labels */
  badge: 'text-[10px] font-semibold uppercase tracking-[0.14em]',
  
  /** Pill text: Status and signal pills */
  pill: 'text-[8px] font-mono uppercase tracking-wider font-semibold',
};

// ============================================================================
// COLOR PALETTE
// ============================================================================

/**
 * Color system for NexusOS.
 * Base: zinc scale, Accent: orange/red, States: green/amber/red
 */
export const NX_COLORS = {
  // Base backgrounds
  bgPrimary: 'zinc-950',
  bgElevated: 'zinc-900',
  bgPanel: 'zinc-900/80',
  bgCard: 'zinc-900/90',
  
  // Accent colors
  accentBright: 'orange-400',
  accentPrimary: 'orange-500',
  accentAdmin: 'red-500',
  accentCommand: 'red-600',
  
  // Semantic states
  stateOk: 'green-400',
  stateOkDark: 'emerald-600',
  stateWarning: 'amber-400',
  stateWarningDark: 'amber-600',
  stateDanger: 'red-500',
  stateDangerDark: 'red-600',
  stateNeutral: 'zinc-400',
  stateActive: 'orange-500',
  
  // Text colors
  textPrimary: 'zinc-100',
  textSecondary: 'zinc-300',
  textMuted: 'zinc-400',
  textDisabled: 'zinc-600',
  
  // Border colors (with opacity)
  borderStandard: 'zinc-700/40',
  borderElevated: 'zinc-700/60',
  borderDivider: 'zinc-800/60',
  borderFocus: 'orange-500/40',
};

// ============================================================================
// SPACING STANDARDS
// ============================================================================

/**
 * Spacing system for padding, gaps, and margins.
 * Tight spacing for military-grade density.
 */
export const NX_SPACING = {
  // Padding presets
  padding: {
    compact: 'p-1.5',
    standard: 'p-2',
    relaxed: 'p-2.5',
    headerCompact: 'px-2 py-1.5',
    headerStandard: 'px-2.5 py-2',
    card: 'px-1.5 py-1',
    button: 'px-2 py-1',
  },
  
  // Gap presets
  gap: {
    tight: 'gap-1',
    standard: 'gap-1.5',
    relaxed: 'gap-2',
  },
  
  // Margin (use sparingly - prefer gap)
  margin: {
    minimal: 'm-0.5',
    small: 'm-1',
  },
};

// ============================================================================
// ICON SIZE MATRIX
// ============================================================================

/**
 * Icon sizing standards.
 * All Lucide icons must use these exact sizes.
 */
export const NX_ICON_SIZES = {
  xs: 'w-2.5 h-2.5',  // 10px - Signal indicators
  sm: 'w-3 h-3',      // 12px - Buttons, inline
  md: 'w-3.5 h-3.5',  // 14px - Headers, primary actions
  lg: 'w-4 h-4',      // 16px - Collapsed panels, featured
};

// ============================================================================
// BORDER & BACKDROP STANDARDS
// ============================================================================

/**
 * Border and backdrop effects.
 * All opacity backgrounds must include backdrop-blur-sm.
 */
export const NX_EFFECTS = {
  border: {
    standard: 'border border-zinc-700/40',
    elevated: 'border border-zinc-700/60',
    divider: 'border-zinc-800/60',
    focus: 'focus:ring-2 focus:ring-orange-500/40',
  },
  
  backdrop: {
    panel: 'bg-zinc-950/80 backdrop-blur-sm',
    header: 'bg-zinc-900/40 backdrop-blur-sm',
    card: 'bg-zinc-900/90 backdrop-blur-sm',
    elevated: 'bg-zinc-900/95 backdrop-blur-sm',
  },
  
  transition: {
    standard: 'transition-all duration-200',
    fast: 'transition-all duration-150',
    slow: 'transition-all duration-300',
  },
  
  hover: {
    brightness: 'hover:brightness-105',
    opacity: 'hover:opacity-80',
    scale: 'hover:scale-105',
  },
};

// ============================================================================
// TOKEN SYSTEM
// ============================================================================

/**
 * Token size standards for tactical icons.
 */
export const NX_TOKEN_SIZES = {
  sm: 'w-3 h-3',   // 12px - Inline badges, compact roster
  md: 'w-4 h-4',   // 16px - Standard markers, list items
  lg: 'w-5 h-5',   // 20px - Prominent markers, headers
  xl: 'w-6 h-6',   // 24px - Focus elements, map markers
};

/**
 * Semantic token mappings for common use cases.
 */
export const NX_TOKEN_USE_CASES = {
  status: {
    family: 'circle',
    colors: {
      ready: 'green',
      active: 'orange',
      warning: 'yellow',
      danger: 'red',
      offline: 'grey',
      neutral: 'grey',
    },
  },
  
  priority: {
    family: 'triangle',
    colors: {
      critical: 'red',
      high: 'orange',
      medium: 'yellow',
      low: 'blue',
      standard: 'cyan',
    },
  },
  
  operation: {
    family: 'penta',
    colors: {
      planning: 'blue',
      briefing: 'cyan',
      active: 'green',
      debrief: 'yellow',
      archived: 'grey',
    },
  },
  
  objective: {
    family: 'objective',
    colors: {
      pending: 'yellow',
      active: 'orange',
      complete: 'green',
      failed: 'red',
    },
  },
  
  role: {
    families: {
      command: { family: 'target', color: 'orange' },
      medical: { family: 'hospital', color: 'green' },
      engineer: { family: 'mechanics', color: 'cyan' },
      pilot: { family: 'fuel', color: 'blue' },
      marine: { family: 'ammunition', color: 'red' },
      support: { family: 'square', color: 'cyan' },
    },
  },
  
  channel: {
    family: 'hex',
    colors: {
      command: 'orange',
      squad: 'cyan',
      support: 'yellow',
      general: 'grey',
      admin: 'red',
    },
  },
  
  vehicle: {
    family: 'target-alt',
    colors: {
      operational: 'green',
      active: 'yellow',
      mixed: 'cyan',
      degraded: 'red',
      docked: 'grey',
    },
  },
};

/**
 * Helper function to get semantic token URL.
 * 
 * @param {string} category - Use case category (status, priority, operation, etc.)
 * @param {string} state - State within category (ready, high, planning, etc.)
 * @param {string} size - Size preset (sm, md, lg, xl)
 * @returns {string} Token asset URL
 * 
 * @example
 * const url = getSemanticToken('status', 'ready', 'sm');
 * // Returns URL for green circle token at 12px
 */
export function getSemanticToken(category, state, size = 'md') {
  const useCase = NX_TOKEN_USE_CASES[category];
  if (!useCase) {
    console.warn(`[NexusOS] Unknown token category: ${category}`);
    return getTokenAssetUrl('circle', 'grey');
  }
  
  if (useCase.families && useCase.families[state]) {
    const { family, color } = useCase.families[state];
    return getTokenAssetUrl(family, color);
  }
  
  const family = useCase.family;
  const color = useCase.colors[state] || 'grey';
  return getTokenAssetUrl(family, color);
}

/**
 * Re-export token utilities from tokenAssetMap.
 */
export { getTokenAssetUrl, getNumberTokenAssetUrl, tokenAssets };

// ============================================================================
// COMPONENT PRESETS
// ============================================================================

/**
 * Common component styling combinations.
 */
export const NX_COMPONENT_PRESETS = {
  panelHeader: `${NX_SPACING.padding.headerStandard} ${NX_EFFECTS.border.standard} ${NX_EFFECTS.backdrop.header}`,
  panelBody: `${NX_SPACING.padding.standard} ${NX_EFFECTS.backdrop.panel}`,
  card: `${NX_SPACING.padding.card} ${NX_EFFECTS.border.standard} ${NX_EFFECTS.backdrop.card} rounded`,
  button: `${NX_SPACING.padding.button} ${NX_EFFECTS.transition.standard} ${NX_EFFECTS.hover.brightness}`,
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a font size value is compliant.
 * @param {string} fontSize - Font size to check (e.g., '8px', '10px')
 * @returns {boolean}
 */
export function isValidFontSize(fontSize) {
  return fontSize === '8px' || fontSize === '10px';
}

/**
 * Check if a font weight is compliant (600+).
 * @param {number} fontWeight - Font weight to check
 * @returns {boolean}
 */
export function isValidFontWeight(fontWeight) {
  return fontWeight >= 600;
}

/**
 * Check if letter spacing is compliant (0.12em+).
 * @param {string} letterSpacing - Letter spacing to check
 * @returns {boolean}
 */
export function isValidLetterSpacing(letterSpacing) {
  const match = letterSpacing.match(/^([\d.]+)em$/);
  if (!match) return false;
  const value = parseFloat(match[1]);
  return value >= 0.12;
}