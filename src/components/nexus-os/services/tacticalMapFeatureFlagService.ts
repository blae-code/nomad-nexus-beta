const FLAG_STORAGE_KEY = 'nexus.os.flags.NX_MAP_COMMAND_SURFACE_V2';

function getEnvFlag(): string {
  try {
    return String(import.meta?.env?.VITE_NX_MAP_COMMAND_SURFACE_V2 || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

function getStoredOverride(): string {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  try {
    return String(window.localStorage.getItem(FLAG_STORAGE_KEY) || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export function isMapCommandSurfaceV2Enabled(): boolean {
  const stored = getStoredOverride();
  if (stored === '0' || stored === 'false' || stored === 'off') return false;
  if (stored === '1' || stored === 'true' || stored === 'on') return true;

  const env = getEnvFlag();
  if (env === '0' || env === 'false' || env === 'off') return false;
  if (env === '1' || env === 'true' || env === 'on') return true;
  return true;
}

export function getMapCommandSurfaceRetryDelayMs(previousDelayMs: number): number {
  const safePrevious = Number.isFinite(previousDelayMs) && previousDelayMs > 0 ? previousDelayMs : 20_000;
  return Math.min(Math.round(safePrevious * 1.6), 120_000);
}

