// Typography System - Single source of truth for typographic hierarchy
// Use TYPOGRAPHY constants in all pages/components for consistency
// Replaces deprecated typographyClasses object

export const TYPOGRAPHY = {
  // Font families
  SANS: 'Rajdhani, sans-serif',
  MONO: 'JetBrains Mono, monospace',

  // Heading levels - Sans serif
  H1: 'text-4xl font-black uppercase tracking-tight',
  H2: 'text-2xl font-black uppercase tracking-wide',
  H3: 'text-lg font-bold uppercase tracking-wide',
  H4: 'text-base font-bold uppercase tracking-wide',
  
  // Body text - Sans serif
  BODY_LG: 'text-base leading-relaxed',
  BODY: 'text-sm leading-relaxed',
  BODY_SM: 'text-xs leading-relaxed',
  
  // Labels - Sans serif (smaller, uppercase)
  LABEL_LG: 'text-sm font-bold uppercase tracking-widest',
  LABEL: 'text-xs font-bold uppercase tracking-widest',
  LABEL_SM: 'text-[10px] font-bold uppercase tracking-widest',
  
  // Callsigns - Mono
  CALLSIGN_LG: 'text-lg font-bold font-mono tracking-wider',
  CALLSIGN: 'text-sm font-bold font-mono tracking-wider',
  CALLSIGN_SM: 'text-xs font-bold font-mono tracking-wider',
  
  // Timestamps - Mono (smaller, numeric)
  TIMESTAMP: 'text-[10px] font-mono text-zinc-500',
  TIMESTAMP_LG: 'text-xs font-mono text-zinc-500',
  
  // Net codes - Mono
  NET_CODE: 'text-xl font-black font-mono tracking-tighter',
  NET_CODE_SM: 'text-sm font-bold font-mono tracking-tight',
  
  // Logs - Mono (monospaced for readability)
  LOG: 'text-xs font-mono leading-relaxed text-zinc-400',
  LOG_SM: 'text-[10px] font-mono leading-relaxed text-zinc-600',
  
  // Status indicators - Mono
  STATUS: 'text-xs font-mono font-bold uppercase',
  STATUS_SM: 'text-[10px] font-mono font-bold uppercase',
};

// Utility function to combine typography with color
export function typographyClass(typeClass, colorClass = '') {
  return `${typeClass} ${colorClass}`.trim();
}

// Export old name for backward compatibility during migration
export const typographyClasses = TYPOGRAPHY;