import { getNexusCssVars, nexusThemeTokens } from '../tokens/nexusThemeTokens';

/**
 * Theme adapter for shared Nexus OS component styling.
 * Keep this as the single source for panel/header/badge geometry + shell vars.
 */
export const nexusUiTheme = Object.freeze({
  panelRadius: nexusThemeTokens.radii.panel,
  chipRadius: nexusThemeTokens.radii.chip,
  panelHeaderClassName: 'border-b border-zinc-800 bg-zinc-950/50',
  panelBodyClassName: 'bg-zinc-950/30',
  cssVars: getNexusCssVars,
});

export const nexusThemePalette = nexusThemeTokens;
export const getNexusThemeCssVars = getNexusCssVars;
