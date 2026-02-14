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
const MAX_TEXT_LENGTH = 120;
const MAX_ACTIVE_PANELS = 64;

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

function trimText(value: unknown, fallback: string, maxLength = MAX_TEXT_LENGTH): string {
  const token = String(value ?? '').trim().slice(0, maxLength);
  return token || fallback;
}

function normalizeIsoTimestamp(value: unknown, fallback: string): string {
  const token = String(value || '').trim();
  const parsed = Date.parse(token);
  if (token && !Number.isNaN(parsed)) return new Date(parsed).toISOString();
  return fallback;
}

function normalizePanelIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const deduped = new Set<string>();
  for (const entry of value) {
    const panelId = String(entry || '').trim().slice(0, MAX_TEXT_LENGTH);
    if (!panelId) continue;
    deduped.add(panelId);
    if (deduped.size >= MAX_ACTIVE_PANELS) break;
  }
  return Array.from(deduped);
}

function normalizeSessionSnapshot(
  input: Partial<NexusWorkspaceSessionSnapshot>,
  fallback: NexusWorkspaceSessionSnapshot
): NexusWorkspaceSessionSnapshot {
  const focusModeCandidate =
    input.focusMode === null ? null : trimText(input.focusMode, fallback.focusMode || '');
  return {
    version: 1,
    bridgeId: trimText(input.bridgeId, fallback.bridgeId),
    presetId: trimText(input.presetId, fallback.presetId),
    variantId: trimText(input.variantId, fallback.variantId),
    opId: trimText(input.opId, ''),
    elementFilter: trimText(input.elementFilter, fallback.elementFilter),
    actorId: trimText(input.actorId, fallback.actorId),
    focusMode: focusModeCandidate || null,
    forceDesignOpId: trimText(input.forceDesignOpId, ''),
    reportsOpId: trimText(input.reportsOpId, ''),
    activePanelIds: normalizePanelIds(input.activePanelIds),
    workspaceOnboardingCompleted:
      typeof input.workspaceOnboardingCompleted === 'boolean'
        ? input.workspaceOnboardingCompleted
        : fallback.workspaceOnboardingCompleted,
    updatedAt: normalizeIsoTimestamp(input.updatedAt, fallback.updatedAt),
  };
}

function removeCorruptSession(sessionScopeKey: string): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(workspaceSessionStorageKey(sessionScopeKey));
  } catch {
    // best effort
  }
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
    const parsed = JSON.parse(raw) as Partial<NexusWorkspaceSessionSnapshot>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      removeCorruptSession(sessionScopeKey);
      return fallback;
    }
    const normalized = normalizeSessionSnapshot(parsed, fallback);
    return {
      ...normalized,
      workspaceOnboardingCompleted:
        typeof parsed.workspaceOnboardingCompleted === 'boolean'
          ? parsed.workspaceOnboardingCompleted
          : true,
    };
  } catch {
    removeCorruptSession(sessionScopeKey);
    return fallback;
  }
}

export function persistWorkspaceSession(sessionScopeKey: string, snapshot: NexusWorkspaceSessionSnapshot): void {
  const persisted = {
    ...normalizeSessionSnapshot(snapshot, defaultSnapshot()),
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
  const merged = normalizeSessionSnapshot(
    {
      ...fallback,
      ...parsed,
      workspaceOnboardingCompleted:
        typeof parsed.workspaceOnboardingCompleted === 'boolean'
          ? parsed.workspaceOnboardingCompleted
          : fallback.workspaceOnboardingCompleted,
    },
    fallback
  );
  if (storageAvailable()) {
    try {
      localStorage.setItem(workspaceSessionStorageKey(sessionScopeKey), JSON.stringify(merged));
    } catch {
      // best effort
    }
  }
  return merged;
}
