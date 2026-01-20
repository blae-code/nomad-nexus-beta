// Typography Hierarchy System
// Ensures consistent font usage and sizing across the app

export const typographyClasses = {
  // === COMMAND / AUTHORITY (Sans) ===
  commandTitle: "text-2xl font-black uppercase tracking-widest text-white font-sans",
  commandSubtitle: "text-lg font-bold uppercase tracking-wide text-zinc-200 font-sans",
  commandLabel: "text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 font-sans",

  // === STATUS / ALERTS (Sans + Bold) ===
  statusCritical: "text-sm font-bold text-red-400 font-sans",
  statusWarning: "text-sm font-bold text-yellow-400 font-sans",
  statusNominal: "text-sm font-bold text-emerald-400 font-sans",
  statusInfo: "text-sm font-bold text-blue-400 font-sans",

  // === CALLSIGNS / IDENTIFIERS (Mono) ===
  callsign: "font-mono font-bold text-zinc-300 tracking-wider",
  callsignSmall: "text-xs font-mono font-bold text-zinc-400 tracking-wider",

  // === TIMESTAMPS (Mono) ===
  timestamp: "text-[10px] font-mono text-zinc-500 tracking-widest",
  timestampLarge: "text-xs font-mono text-zinc-400 tracking-wider",

  // === NET CODES (Mono + Prominent) ===
  netCode: "text-lg font-mono font-bold text-white tracking-tighter",
  netCodeSmall: "text-xs font-mono font-bold text-zinc-300 tracking-tight",

  // === LOGS (Mono) ===
  logEntry: "text-xs font-mono text-zinc-400 leading-relaxed",
  logTimestamp: "text-[9px] font-mono text-zinc-600",
  logContent: "text-xs font-mono text-zinc-300",

  // === BODY TEXT (Sans) ===
  bodyLarge: "text-sm font-sans text-zinc-300 leading-relaxed",
  bodySmall: "text-xs font-sans text-zinc-400 leading-relaxed",

  // === LABELS (Sans) ===
  labelPrimary: "text-xs font-sans font-semibold text-zinc-300 uppercase",
  labelSecondary: "text-[10px] font-sans text-zinc-500 uppercase tracking-wider",

  // === DESCRIPTIONS (Sans) ===
  descriptionSmall: "text-[10px] font-sans text-zinc-500 italic",
};

// Usage: className={cn(typographyClasses.netCode, "text-red-500")}
// This allows extending with color overrides while maintaining the base hierarchy