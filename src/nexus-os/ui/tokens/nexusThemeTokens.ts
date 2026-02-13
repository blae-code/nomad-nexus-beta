/**
 * Nexus OS theme tokens.
 *
 * Industrial + rust pulse motif only.
 * Keep all primitive styling token-driven from this module.
 */

export const nexusThemeTokens = Object.freeze({
  colors: {
    shellBg: '#060c12',
    shellBgElevated: '#0b121a',
    panelBg: '#101922',
    panelBgRaised: '#17212c',
    border: '#2f3d4f',
    borderStrong: '#48647f',
    textPrimary: '#d9e6f2',
    textMuted: '#9aaabc',
    textDim: '#728296',
    rust: '#b86c45',
    rustSoft: '#8d563a',
    rustGlow: 'rgba(130, 183, 221, 0.2)',
    success: '#54a27f',
    warning: '#b89a58',
    danger: '#ba6658',
    info: '#7aa8c0',
    auroraCyan: '#62a8cf',
    signalGold: '#c8a164',
    meshTeal: '#4f9b93',
    bridgeARGBBase: '94, 150, 190',
    bridgeBRGBBase: '92, 126, 156',
    bridgeCRGBBase: '157, 200, 229',
    bridgeChipTextBase: '#dcecf7',
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
    pulse: '0 0 0 1px rgba(96,153,194,0.26), 0 0 18px rgba(96,153,194,0.18)',
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
