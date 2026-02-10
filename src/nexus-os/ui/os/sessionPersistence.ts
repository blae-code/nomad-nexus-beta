/**
 * Nexus OS workspace session persistence.
 * Restores shell context so users return to a workstation state, not a blank page.
 */

export interface NexusWorkspaceSessionSnapshot {
  version: 1;
  bridgeId: string;
  presetId: string;
  variantId: string;
  opId: string;
  elementFilter: string;
  actorId: string;
  focusMode: string | null;
  forceDesignOpId: string;
  reportsOpId: string;
  activePanelIds: string[];
  updatedAt: string;
}

const STORAGE_PREFIX = 'nexus.os.session.v1';

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function defaultSnapshot(overrides: Partial<NexusWorkspaceSessionSnapshot> = {}): NexusWorkspaceSessionSnapshot {
  return {
    version: 1,
    bridgeId: 'OPS',
    presetId: 'COMMAND_LEFT',
    variantId: 'CQB-01',
    opId: '',
    elementFilter: 'ALL',
    actorId: 'ce-warden',
    focusMode: null,
    forceDesignOpId: '',
    reportsOpId: '',
    activePanelIds: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function workspaceSessionStorageKey(sessionScopeKey: string): string {
  return `${STORAGE_PREFIX}:${sessionScopeKey}`;
}

export function loadWorkspaceSession(
  sessionScopeKey: string,
  overrides: Partial<NexusWorkspaceSessionSnapshot> = {}
): NexusWorkspaceSessionSnapshot {
  const fallback = defaultSnapshot(overrides);
  if (!storageAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(workspaceSessionStorageKey(sessionScopeKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return fallback;
    return {
      ...fallback,
      ...parsed,
      version: 1,
    };
  } catch {
    return fallback;
  }
}

export function persistWorkspaceSession(sessionScopeKey: string, snapshot: NexusWorkspaceSessionSnapshot): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(
      workspaceSessionStorageKey(sessionScopeKey),
      JSON.stringify({
        ...snapshot,
        version: 1,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Best-effort persistence.
  }
}

export function resetWorkspaceSession(sessionScopeKey: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(workspaceSessionStorageKey(sessionScopeKey));
  } catch {
    // Best-effort reset.
  }
}

