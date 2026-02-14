import {
  clearWorkspaceStateSnapshot,
  enqueueWorkspaceStateSave,
  loadWorkspaceStateSnapshot,
} from '../../services/workspaceStateBridgeService';

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
  workspaceOnboardingCompleted: boolean;
  updatedAt: string;
}

const STORAGE_PREFIX = 'nexus.os.session.v1';
const SESSION_REMOTE_NAMESPACE = 'workspace_session_snapshot';

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
    workspaceOnboardingCompleted: false,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function workspaceSessionStorageKey(sessionScopeKey: string): string {
  return `${STORAGE_PREFIX}:${sessionScopeKey}`;
}

export function workspaceSessionExists(sessionScopeKey: string): boolean {
  if (!storageAvailable()) return false;
  try {
    return Boolean(localStorage.getItem(workspaceSessionStorageKey(sessionScopeKey)));
  } catch {
    return false;
  }
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
    const onboardingCompleted =
      typeof parsed.workspaceOnboardingCompleted === 'boolean'
        ? parsed.workspaceOnboardingCompleted
        : true;
    return {
      ...fallback,
      ...parsed,
      workspaceOnboardingCompleted: onboardingCompleted,
      version: 1,
    };
  } catch {
    return fallback;
  }
}

export function persistWorkspaceSession(sessionScopeKey: string, snapshot: NexusWorkspaceSessionSnapshot): void {
  const persisted = {
    ...snapshot,
    version: 1 as const,
    updatedAt: new Date().toISOString(),
  };
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(workspaceSessionStorageKey(sessionScopeKey), JSON.stringify(persisted));
  } catch {
    // Best-effort persistence.
  }
  enqueueWorkspaceStateSave({
    namespace: SESSION_REMOTE_NAMESPACE,
    scopeKey: sessionScopeKey,
    schemaVersion: 1,
    state: persisted,
    debounceMs: 800,
  });
}

export function resetWorkspaceSession(sessionScopeKey: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(workspaceSessionStorageKey(sessionScopeKey));
  } catch {
    // Best-effort reset.
  }
  void clearWorkspaceStateSnapshot({
    namespace: SESSION_REMOTE_NAMESPACE,
    scopeKey: sessionScopeKey,
  }, 'session_reset');
}

export async function hydrateWorkspaceSessionFromBackend(
  sessionScopeKey: string,
  overrides: Partial<NexusWorkspaceSessionSnapshot> = {}
): Promise<NexusWorkspaceSessionSnapshot> {
  const fallback = loadWorkspaceSession(sessionScopeKey, overrides);
  const remote = await loadWorkspaceStateSnapshot<unknown>({
    namespace: SESSION_REMOTE_NAMESPACE,
    scopeKey: sessionScopeKey,
  }).catch(() => null);
  const state = remote?.state;
  if (!state || typeof state !== 'object') return fallback;
  const parsed = state as Partial<NexusWorkspaceSessionSnapshot>;
  if (parsed.version !== 1) return fallback;
  const merged = {
    ...fallback,
    ...parsed,
    version: 1 as const,
  };
  if (storageAvailable()) {
    try {
      localStorage.setItem(workspaceSessionStorageKey(sessionScopeKey), JSON.stringify(merged));
    } catch {
      // best effort
    }
  }
  return merged;
}
