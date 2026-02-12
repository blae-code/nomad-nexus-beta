import type { ShellBridgeId } from './bridgeCatalog';

interface BridgeVisualTheme {
  accentRgb: string;
  accentAltRgb: string;
  accentSoftRgb: string;
  chipText: string;
}

const BRIDGE_VISUAL_THEMES: Readonly<Record<ShellBridgeId, BridgeVisualTheme>> = {
  OPS: {
    accentRgb: '238, 118, 66',
    accentAltRgb: '91, 181, 255',
    accentSoftRgb: '255, 186, 112',
    chipText: '#ffe2cf',
  },
  INTEL: {
    accentRgb: '77, 174, 255',
    accentAltRgb: '108, 227, 202',
    accentSoftRgb: '136, 141, 255',
    chipText: '#d9f2ff',
  },
  INDUSTRY: {
    accentRgb: '230, 166, 72',
    accentAltRgb: '121, 205, 110',
    accentSoftRgb: '255, 205, 129',
    chipText: '#f9ebd3',
  },
  COMMERCE: {
    accentRgb: '78, 199, 158',
    accentAltRgb: '229, 206, 92',
    accentSoftRgb: '121, 234, 191',
    chipText: '#dcfff1',
  },
  FITTING: {
    accentRgb: '235, 96, 96',
    accentAltRgb: '103, 165, 255',
    accentSoftRgb: '255, 138, 138',
    chipText: '#ffe1e1',
  },
  CRAFTING: {
    accentRgb: '219, 108, 203',
    accentAltRgb: '86, 205, 189',
    accentSoftRgb: '240, 153, 228',
    chipText: '#ffe2f9',
  },
  COMMAND: {
    accentRgb: '242, 129, 75',
    accentAltRgb: '255, 207, 88',
    accentSoftRgb: '255, 169, 119',
    chipText: '#ffe5d0',
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

