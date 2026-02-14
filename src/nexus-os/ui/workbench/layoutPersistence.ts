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

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function nowIso(): string {
  return new Date().toISOString();
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

function normalizePanelSizes(panelSizes: unknown): Record<string, PanelSize> {
  const next: Record<string, PanelSize> = {};
  if (!panelSizes || typeof panelSizes !== 'object') return next;
  for (const [panelId, size] of Object.entries(panelSizes as Record<string, PanelSize>)) {
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
  const panelOrder = normalizePanelOrder(snapshot.panelOrder || [], availablePanelIds);
  const activePanelIds = (snapshot.activePanelIds || []).filter((id) => availablePanelIds.includes(id));
  return {
    version: LATEST_VERSION,
    schema: 'nexus-os-workbench',
    presetId: (snapshot.presetId || fallbackPresetId) as WorkbenchPresetId,
    panelOrder,
    activePanelIds: activePanelIds.length > 0 ? activePanelIds : panelOrder,
    panelSizes: normalizePanelSizes(snapshot.panelSizes),
    updatedAt: snapshot.updatedAt || nowIso(),
  };
}

export function toWorkbenchLayoutSnapshot(
  presetId: WorkbenchPresetId,
  panels: PanelDescriptor[],
  panelSizes: Record<string, PanelSize>,
  activePanelIds?: string[]
): WorkbenchLayoutSnapshotV2 {
  const panelOrder = panels.map((panel) => panel.id);
  return {
    version: LATEST_VERSION,
    schema: 'nexus-os-workbench',
    presetId,
    panelOrder,
    activePanelIds: Array.isArray(activePanelIds) && activePanelIds.length > 0 ? activePanelIds : panelOrder,
    panelSizes: normalizePanelSizes(panelSizes),
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
  try {
    const raw = localStorage.getItem(workbenchLayoutStorageKey(input.scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnyWorkbenchLayoutSnapshot;
    const snapshot = fromWorkbenchLayoutSnapshot(parsed, input.fallbackPresetId, input.availablePanelIds);
    if (!snapshot) return null;
    const migratedFrom = (parsed as AnyWorkbenchLayoutSnapshot).version === 1 ? 1 : null;
    return {
      snapshot,
      migratedFrom,
    };
  } catch {
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
