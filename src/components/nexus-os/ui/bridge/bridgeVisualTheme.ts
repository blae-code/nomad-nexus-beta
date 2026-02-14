import type { ShellBridgeId } from './bridgeCatalog';

interface BridgeVisualTheme {
  accentRgb: string;
  accentAltRgb: string;
  accentSoftRgb: string;
  chipText: string;
}

const BRIDGE_VISUAL_THEMES: Readonly<Record<ShellBridgeId, BridgeVisualTheme>> = {
  OPS: {
    accentRgb: '171, 111, 74',
    accentAltRgb: '113, 146, 171',
    accentSoftRgb: '213, 166, 118',
    chipText: '#f2e1ca',
  },
  INTEL: {
    accentRgb: '89, 156, 201',
    accentAltRgb: '109, 134, 189',
    accentSoftRgb: '146, 201, 237',
    chipText: '#d9edfb',
  },
  INDUSTRY: {
    accentRgb: '126, 164, 88',
    accentAltRgb: '158, 143, 85',
    accentSoftRgb: '177, 203, 132',
    chipText: '#e2efd0',
  },
  COMMERCE: {
    accentRgb: '80, 167, 151',
    accentAltRgb: '113, 156, 109',
    accentSoftRgb: '131, 210, 191',
    chipText: '#d8f2ea',
  },
  FITTING: {
    accentRgb: '125, 138, 214',
    accentAltRgb: '112, 164, 191',
    accentSoftRgb: '166, 177, 236',
    chipText: '#dde4fa',
  },
  CRAFTING: {
    accentRgb: '149, 112, 192',
    accentAltRgb: '94, 171, 188',
    accentSoftRgb: '191, 153, 224',
    chipText: '#ece2f9',
  },
  COMMAND: {
    accentRgb: '184, 88, 80',
    accentAltRgb: '132, 148, 178',
    accentSoftRgb: '220, 136, 126',
    chipText: '#f4dcda',
  },
};

export function getBridgeVisualTheme(bridgeId: string | undefined): BridgeVisualTheme {
  const key = String(bridgeId || '').trim().toUpperCase() as ShellBridgeId;
  return BRIDGE_VISUAL_THEMES[key] || BRIDGE_VISUAL_THEMES.OPS;
}

export function getBridgeThemeCssVars(bridgeId: string | undefined) {
  const theme = getBridgeVisualTheme(bridgeId);
  return {
    '--nx-bridge-a-rgb': theme.accentRgb,
    '--nx-bridge-b-rgb': theme.accentAltRgb,
    '--nx-bridge-c-rgb': theme.accentSoftRgb,
    '--nx-bridge-chip-text': theme.chipText,
  };
}
