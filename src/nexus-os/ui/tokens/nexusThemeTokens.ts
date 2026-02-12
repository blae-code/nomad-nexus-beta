/**
 * Nexus OS theme tokens.
 *
 * Industrial + rust pulse motif only.
 * Keep all primitive styling token-driven from this module.
 */

export const nexusThemeTokens = Object.freeze({
  colors: {
    shellBg: '#0d0b0a',
    shellBgElevated: '#15110f',
    panelBg: '#1a1411',
    panelBgRaised: '#211915',
    border: '#3a2a22',
    borderStrong: '#6a3f2a',
    textPrimary: '#f0e8e2',
    textMuted: '#ab9d93',
    textDim: '#7f7268',
    rust: '#b35a2f',
    rustSoft: '#8f4a2f',
    rustGlow: 'rgba(179, 90, 47, 0.24)',
    success: '#5c8a66',
    warning: '#b98a3d',
    danger: '#a85244',
    info: '#8a7868',
    auroraCyan: '#57bde4',
    signalGold: '#d6ad56',
    meshTeal: '#4db88d',
    bridgeARGBBase: '221, 109, 60',
    bridgeBRGBBase: '95, 171, 255',
    bridgeCRGBBase: '255, 182, 125',
    bridgeChipTextBase: '#ffe0cf',
  },
  radii: {
    shell: '14px',
    panel: '10px',
    chip: '999px',
  },
  spacing: {
    xxs: '4px',
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '20px',
    xl: '28px',
  },
  shadows: {
    shell: '0 14px 36px rgba(0,0,0,0.42)',
    panel: '0 8px 20px rgba(0,0,0,0.35)',
    pulse: '0 0 0 1px rgba(179,90,47,0.26), 0 0 18px rgba(179,90,47,0.18)',
  },
});

export function getNexusCssVars() {
  return {
    '--nx-shell-bg': nexusThemeTokens.colors.shellBg,
    '--nx-shell-bg-elevated': nexusThemeTokens.colors.shellBgElevated,
    '--nx-panel-bg': nexusThemeTokens.colors.panelBg,
    '--nx-panel-bg-raised': nexusThemeTokens.colors.panelBgRaised,
    '--nx-border': nexusThemeTokens.colors.border,
    '--nx-border-strong': nexusThemeTokens.colors.borderStrong,
    '--nx-text-primary': nexusThemeTokens.colors.textPrimary,
    '--nx-text-muted': nexusThemeTokens.colors.textMuted,
    '--nx-text-dim': nexusThemeTokens.colors.textDim,
    '--nx-rust': nexusThemeTokens.colors.rust,
    '--nx-rust-soft': nexusThemeTokens.colors.rustSoft,
    '--nx-rust-glow': nexusThemeTokens.colors.rustGlow,
    '--nx-success': nexusThemeTokens.colors.success,
    '--nx-warning': nexusThemeTokens.colors.warning,
    '--nx-danger': nexusThemeTokens.colors.danger,
    '--nx-info': nexusThemeTokens.colors.info,
    '--nx-aurora-cyan': nexusThemeTokens.colors.auroraCyan,
    '--nx-signal-gold': nexusThemeTokens.colors.signalGold,
    '--nx-mesh-teal': nexusThemeTokens.colors.meshTeal,
    '--nx-bridge-a-rgb-base': nexusThemeTokens.colors.bridgeARGBBase,
    '--nx-bridge-b-rgb-base': nexusThemeTokens.colors.bridgeBRGBBase,
    '--nx-bridge-c-rgb-base': nexusThemeTokens.colors.bridgeCRGBBase,
    '--nx-bridge-chip-text-base': nexusThemeTokens.colors.bridgeChipTextBase,
    '--nx-radius-shell': nexusThemeTokens.radii.shell,
    '--nx-radius-panel': nexusThemeTokens.radii.panel,
    '--nx-radius-chip': nexusThemeTokens.radii.chip,
    '--nx-shadow-shell': nexusThemeTokens.shadows.shell,
    '--nx-shadow-panel': nexusThemeTokens.shadows.panel,
    '--nx-shadow-pulse': nexusThemeTokens.shadows.pulse,
  };
}
