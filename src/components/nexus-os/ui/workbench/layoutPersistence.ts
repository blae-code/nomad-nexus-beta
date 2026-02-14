import type {
  AnyWorkbenchLayoutSnapshot,
  PanelDescriptor,
  PanelSize,
  WorkbenchLayoutSnapshot,
  WorkbenchLayoutSnapshotV2,
  WorkbenchPresetId,
} from './types';
import { normalizePanelOrder } from './layoutEngine';
import {
  clearWorkspaceStateSnapshot,
  enqueueWorkspaceStateSave,
  loadWorkspaceStateSnapshot,
} from '../../services/workspaceStateBridgeService';

/**
 * Layout persistence with migration support.
 * - v1: { version:1, presetId, panelOrder, panelSizes }
 * - v2: adds active panel subset, schema tag, and timestamp metadata.
 */

const STORAGE_PREFIX = 'nexus.os.workbench.layout.v2';
const LATEST_VERSION = 2 as const;
const LAYOUT_REMOTE_NAMESPACE = 'workbench_layout_snapshot';
const MAX_LAYOUT_PANELS = 96;

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeIsoTimestamp(value: unknown, fallback: string): string {
  const token = String(value || '').trim();
  const parsed = Date.parse(token);
  if (token && !Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return fallback;
}

export function workbenchLayoutStorageKey(scopeKey: string): string {
  return `${STORAGE_PREFIX}:${scopeKey}`;
}

function isV1Snapshot(value: unknown): value is WorkbenchLayoutSnapshot {
  const snapshot = value as WorkbenchLayoutSnapshot;
  return (
    Boolean(snapshot) &&
    snapshot.version === 1 &&
    typeof snapshot.presetId === 'string' &&
    Array.isArray(snapshot.panelOrder)
  );
}

function isV2Snapshot(value: unknown): value is WorkbenchLayoutSnapshotV2 {
  const snapshot = value as WorkbenchLayoutSnapshotV2;
  return (
    Boolean(snapshot) &&
    snapshot.version === 2 &&
    snapshot.schema === 'nexus-os-workbench' &&
    typeof snapshot.presetId === 'string' &&
    Array.isArray(snapshot.panelOrder) &&
    Array.isArray(snapshot.activePanelIds)
  );
}

function normalizePanelIdList(ids: unknown, availablePanelIds: string[]): string[] {
  if (!Array.isArray(ids)) return [];
  const available = new Set(availablePanelIds);
  const deduped = new Set<string>();
  for (const entry of ids) {
    const panelId = String(entry || '').trim();
    if (!panelId || !available.has(panelId)) continue;
    deduped.add(panelId);
    if (deduped.size >= MAX_LAYOUT_PANELS) break;
  }
  return Array.from(deduped);
}

function normalizePanelSizes(panelSizes: unknown, allowedPanelIds: string[]): Record<string, PanelSize> {
  const next: Record<string, PanelSize> = {};
  if (!panelSizes || typeof panelSizes !== 'object') return next;
  const allowed = new Set(allowedPanelIds);
  for (const [panelId, size] of Object.entries(panelSizes as Record<string, PanelSize>)) {
    if (!allowed.has(panelId)) continue;
    if (!size || typeof size !== 'object') continue;
    const normalized: PanelSize = {};
    if (typeof size.colSpan === 'number' && Number.isFinite(size.colSpan)) normalized.colSpan = size.colSpan;
    if (typeof size.rowSpan === 'number' && Number.isFinite(size.rowSpan)) normalized.rowSpan = size.rowSpan;
    next[panelId] = normalized;
  }
  return next;
}

function normalizeSnapshot(
  snapshot: WorkbenchLayoutSnapshotV2,
  fallbackPresetId: WorkbenchPresetId,
  availablePanelIds: string[]
): WorkbenchLayoutSnapshotV2 {
  const boundedAvailablePanelIds = Array.from(
    new Set((availablePanelIds || []).map((entry) => String(entry || '').trim()).filter(Boolean))
  ).slice(0, MAX_LAYOUT_PANELS);
  const panelOrder = normalizePanelOrder(
    normalizePanelIdList(snapshot.panelOrder, boundedAvailablePanelIds),
    boundedAvailablePanelIds
  );
  const hasExplicitActivePanelIds = Array.isArray(snapshot.activePanelIds);
  const activePanelIds = normalizePanelIdList(snapshot.activePanelIds, boundedAvailablePanelIds);
  const sizePanelIds = Array.from(new Set([...panelOrder, ...activePanelIds]));
  return {
    version: LATEST_VERSION,
    schema: 'nexus-os-workbench',
    presetId: (snapshot.presetId || fallbackPresetId) as WorkbenchPresetId,
    panelOrder,
    activePanelIds: hasExplicitActivePanelIds ? activePanelIds : panelOrder,
    panelSizes: normalizePanelSizes(snapshot.panelSizes, sizePanelIds),
    updatedAt: normalizeIsoTimestamp(snapshot.updatedAt, nowIso()),
  };
}

export function toWorkbenchLayoutSnapshot(
  presetId: WorkbenchPresetId,
  panels: PanelDescriptor[],
  panelSizes: Record<string, PanelSize>,
  activePanelIds?: string[]
): WorkbenchLayoutSnapshotV2 {
  const panelOrder = Array.from(new Set(panels.map((panel) => String(panel.id || '').trim()).filter(Boolean))).slice(0, MAX_LAYOUT_PANELS);
  const activeIds = Array.isArray(activePanelIds)
    ? activePanelIds.map((entry) => String(entry || '').trim()).filter(Boolean).slice(0, MAX_LAYOUT_PANELS)
    : panelOrder;
  return {
    version: LATEST_VERSION,
    schema: 'nexus-os-workbench',
    presetId,
    panelOrder,
    activePanelIds: activeIds,
    panelSizes: normalizePanelSizes(panelSizes, Array.from(new Set([...panelOrder, ...activeIds]))),
    updatedAt: nowIso(),
  };
}

export function migrateWorkbenchLayoutSnapshot(
  snapshot: AnyWorkbenchLayoutSnapshot,
  fallbackPresetId: WorkbenchPresetId,
  availablePanelIds: string[]
): WorkbenchLayoutSnapshotV2 | null {
  if (isV2Snapshot(snapshot)) {
    return normalizeSnapshot(snapshot, fallbackPresetId, availablePanelIds);
  }
  if (isV1Snapshot(snapshot)) {
    const migrated: WorkbenchLayoutSnapshotV2 = {
      version: LATEST_VERSION,
      schema: 'nexus-os-workbench',
      presetId: (snapshot.presetId || fallbackPresetId) as WorkbenchPresetId,
      panelOrder: snapshot.panelOrder || [],
      activePanelIds: snapshot.panelOrder || [],
      panelSizes: snapshot.panelSizes || {},
      updatedAt: nowIso(),
    };
    return normalizeSnapshot(migrated, fallbackPresetId, availablePanelIds);
  }
  return null;
}

export function fromWorkbenchLayoutSnapshot(
  snapshot: AnyWorkbenchLayoutSnapshot | null | undefined,
  fallbackPresetId: WorkbenchPresetId,
  availablePanelIds: string[]
) {
  if (!snapshot) return null;
  return migrateWorkbenchLayoutSnapshot(snapshot, fallbackPresetId, availablePanelIds);
}

export function serializeWorkbenchLayout(snapshot: WorkbenchLayoutSnapshotV2): string {
  return JSON.stringify(snapshot);
}

export function parseWorkbenchLayout(
  json: string,
  fallbackPresetId: WorkbenchPresetId,
  availablePanelIds: string[]
): WorkbenchLayoutSnapshotV2 | null {
  try {
    const raw = JSON.parse(json);
    return fromWorkbenchLayoutSnapshot(raw, fallbackPresetId, availablePanelIds);
  } catch {
    return null;
  }
}

export function persistWorkbenchLayout(scopeKey: string, snapshot: WorkbenchLayoutSnapshotV2): void {
  const serialized = serializeWorkbenchLayout(snapshot);
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(workbenchLayoutStorageKey(scopeKey), serialized);
  } catch {
    // Best effort persistence.
  }
  enqueueWorkspaceStateSave({
    namespace: LAYOUT_REMOTE_NAMESPACE,
    scopeKey,
    schemaVersion: LATEST_VERSION,
    state: snapshot,
    debounceMs: 700,
  });
}

export function resetWorkbenchLayout(scopeKey: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(workbenchLayoutStorageKey(scopeKey));
  } catch {
    // Best effort reset.
  }
  void clearWorkspaceStateSnapshot({
    namespace: LAYOUT_REMOTE_NAMESPACE,
    scopeKey,
  }, 'layout_reset');
}

export function loadWorkbenchLayout(input: {
  scopeKey: string;
  fallbackPresetId: WorkbenchPresetId;
  availablePanelIds: string[];
}) {
  if (!storageAvailable()) return null;
  const key = workbenchLayoutStorageKey(input.scopeKey);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnyWorkbenchLayoutSnapshot;
    const snapshot = fromWorkbenchLayoutSnapshot(parsed, input.fallbackPresetId, input.availablePanelIds);
    if (!snapshot) {
      localStorage.removeItem(key);
      return null;
    }
    const migratedFrom = (parsed as AnyWorkbenchLayoutSnapshot).version === 1 ? 1 : null;
    return {
      snapshot,
      migratedFrom,
    };
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // best effort
    }
    return null;
  }
}

export async function hydrateWorkbenchLayoutFromBackend(input: {
  scopeKey: string;
  fallbackPresetId: WorkbenchPresetId;
  availablePanelIds: string[];
}) {
  const remote = await loadWorkspaceStateSnapshot<AnyWorkbenchLayoutSnapshot>({
    namespace: LAYOUT_REMOTE_NAMESPACE,
    scopeKey: input.scopeKey,
  }).catch(() => null);
  const state = remote?.state;
  if (!state) return null;
  const snapshot = fromWorkbenchLayoutSnapshot(state, input.fallbackPresetId, input.availablePanelIds);
  if (!snapshot) return null;
  if (storageAvailable()) {
    try {
      localStorage.setItem(workbenchLayoutStorageKey(input.scopeKey), serializeWorkbenchLayout(snapshot));
    } catch {
      // best effort
    }
  }
  const rawVersion = Number((state as { version?: number }).version || LATEST_VERSION);
  return {
    snapshot,
    migratedFrom: rawVersion === 1 ? 1 : null,
    source: remote?.source || 'none',
    persistedAt: remote?.persistedAt || snapshot.updatedAt,
  };
}
