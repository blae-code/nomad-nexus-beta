import type {
  TacticalLayerId,
  TacticalMapDockId,
  TacticalMapMode,
  TacticalMapPreferences,
} from '../schemas/mapSchemas';

interface PreferenceScopeInput {
  actorId: string;
  bridgeId?: string;
  opId?: string;
}

const STORAGE_PREFIX = 'nexus.os.tacticalMap.preferences.v2';

const MODE_LAYER_DEFAULTS: Readonly<Record<TacticalMapMode, Partial<Record<TacticalLayerId, boolean>>>> = Object.freeze({
  ESSENTIAL: {
    presence: true,
    controlZones: false,
    ops: true,
    intel: false,
    comms: false,
    logistics: false,
  },
  COMMAND: {
    presence: true,
    controlZones: false,
    ops: true,
    intel: false,
    comms: false,
    logistics: false,
  },
  FULL: {
    presence: true,
    controlZones: true,
    ops: true,
    intel: true,
    comms: true,
    logistics: true,
  },
});

function hasLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeBridgeId(value: string | undefined): string {
  return String(value || '').trim().toUpperCase() || 'OPS';
}

function normalizeDockId(mode: TacticalMapMode, dockId: TacticalMapDockId | undefined): TacticalMapDockId {
  const allowedByMode: Record<TacticalMapMode, TacticalMapDockId[]> = {
    ESSENTIAL: ['SUMMARY', 'ACTIONS'],
    COMMAND: ['SUMMARY', 'COMMS', 'INTEL', 'ACTIONS', 'EVIDENCE'],
    FULL: ['SUMMARY', 'COMMS', 'INTEL', 'ACTIONS', 'EVIDENCE', 'LOGISTICS', 'TIMELINE'],
  };
  const allowed = allowedByMode[mode];
  if (!dockId || !allowed.includes(dockId)) return allowed[0];
  return dockId;
}

function normalizeMode(bridgeId: string | undefined, mode: unknown): TacticalMapMode {
  const token = String(mode || '').toUpperCase();
  if (token === 'ESSENTIAL' || token === 'COMMAND' || token === 'FULL') return token;
  return normalizeBridgeId(bridgeId) === 'COMMAND' ? 'COMMAND' : 'ESSENTIAL';
}

export function tacticalMapPreferenceStorageKey(input: PreferenceScopeInput): string {
  const actor = String(input.actorId || 'anonymous').trim() || 'anonymous';
  const bridge = normalizeBridgeId(input.bridgeId);
  const op = String(input.opId || 'global').trim() || 'global';
  return `${STORAGE_PREFIX}:${actor}:${bridge}:${op}`;
}

export function createDefaultTacticalMapPreferences(bridgeId?: string): TacticalMapPreferences {
  const mode = normalizeBridgeId(bridgeId) === 'COMMAND' ? 'COMMAND' : 'ESSENTIAL';
  return {
    mode,
    dockId: normalizeDockId(mode, undefined),
    layerDefaults: { ...MODE_LAYER_DEFAULTS[mode] },
    mapDetail: {
      showStations: mode === 'FULL',
      showLagrange: mode === 'FULL',
      showOmMarkers: false,
    },
  };
}

function normalizePreferences(raw: Partial<TacticalMapPreferences> | null | undefined, bridgeId?: string): TacticalMapPreferences {
  const mode = normalizeMode(bridgeId, raw?.mode);
  const defaultMapDetail = createDefaultTacticalMapPreferences(bridgeId).mapDetail;
  const layerDefaults = {
    ...MODE_LAYER_DEFAULTS[mode],
    ...(raw?.layerDefaults || {}),
  };
  return {
    mode,
    dockId: normalizeDockId(mode, raw?.dockId),
    layerDefaults,
    mapDetail: {
      showStations: raw?.mapDetail?.showStations ?? defaultMapDetail.showStations,
      showLagrange: raw?.mapDetail?.showLagrange ?? defaultMapDetail.showLagrange,
      showOmMarkers: raw?.mapDetail?.showOmMarkers ?? defaultMapDetail.showOmMarkers,
    },
  };
}

export function loadTacticalMapPreferences(input: PreferenceScopeInput): TacticalMapPreferences {
  const fallback = createDefaultTacticalMapPreferences(input.bridgeId);
  if (!hasLocalStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(tacticalMapPreferenceStorageKey(input));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<TacticalMapPreferences>;
    return normalizePreferences(parsed, input.bridgeId);
  } catch {
    return fallback;
  }
}

export function saveTacticalMapPreferences(input: PreferenceScopeInput, preferences: TacticalMapPreferences): void {
  if (!hasLocalStorage()) return;
  const normalized = normalizePreferences(preferences, input.bridgeId);
  try {
    window.localStorage.setItem(tacticalMapPreferenceStorageKey(input), JSON.stringify(normalized));
  } catch {
    // Best-effort persistence only.
  }
}

export function mapModeLayerDefaults(mode: TacticalMapMode): Partial<Record<TacticalLayerId, boolean>> {
  return { ...MODE_LAYER_DEFAULTS[mode] };
}
