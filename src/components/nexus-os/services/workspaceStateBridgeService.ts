export interface WorkspaceStateSaveInput {
  namespace: string;
  scopeKey?: string;
  schemaVersion?: number;
  state: unknown;
  debounceMs?: number;
}

export interface WorkspaceStateLoadInput {
  namespace: string;
  scopeKey?: string;
}

export interface WorkspaceStateSnapshot<T = unknown> {
  namespace: string;
  scopeKey: string;
  schemaVersion: number;
  persistedAt: string;
  bytes: number;
  state: T;
  source: 'entity' | 'event_log' | 'none';
}

const DEFAULT_DEBOUNCE_MS = 900;
const DEFAULT_SCOPE = 'default';
const MAX_STATE_PAYLOAD_BYTES = 220_000;
const MAX_PENDING_SAVE_KEYS = 48;

type PendingSave = {
  namespace: string;
  scopeKey: string;
  schemaVersion: number;
  state: unknown;
};

const pendingByKey = new Map<string, PendingSave>();
const timerByKey = new Map<string, ReturnType<typeof setTimeout>>();

function text(value: unknown, fallback = ''): string {
  const normalized = String(value || '').trim();
  return normalized || fallback;
}

function normalizeNamespace(value: unknown): string {
  return text(value)
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '_')
    .slice(0, 80) || 'workspace_state';
}

function normalizeScopeKey(value: unknown): string {
  return text(value, DEFAULT_SCOPE).replace(/[^a-zA-Z0-9._:-]+/g, '_').slice(0, 140) || DEFAULT_SCOPE;
}

function normalizeSchemaVersion(value: unknown): number {
  const parsed = Number(value);
  const version = Number.isFinite(parsed) ? Math.floor(parsed) : 1;
  return Math.max(1, Math.min(version, 99));
}

export function workspaceStateSyncEnabled(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem('nexus.login.token'));
  } catch {
    return false;
  }
}

function utf8Bytes(value: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length;
  }
  return value.length;
}

function stableCloneWithBytes<T>(value: T): { state: T; bytes: number } | null {
  try {
    const serialized = JSON.stringify(value ?? {});
    return {
      state: JSON.parse(serialized) as T,
      bytes: utf8Bytes(serialized),
    };
  } catch {
    return null;
  }
}

export function workspaceStateMaxPayloadBytes(): number {
  return MAX_STATE_PAYLOAD_BYTES;
}

export function workspaceStateMaxPendingKeys(): number {
  return MAX_PENDING_SAVE_KEYS;
}

function queueKey(namespace: string, scopeKey: string): string {
  return `${namespace}:${scopeKey}`;
}

function evictOldestPendingSave(): void {
  if (pendingByKey.size < MAX_PENDING_SAVE_KEYS) return;
  const oldestKey = pendingByKey.keys().next().value as string | undefined;
  if (!oldestKey) return;
  const timer = timerByKey.get(oldestKey);
  if (timer) clearTimeout(timer);
  timerByKey.delete(oldestKey);
  pendingByKey.delete(oldestKey);
}

async function invokeWorkspaceFunction(payload: Record<string, unknown>) {
  const module = await import('../../../api/memberFunctions');
  return module.invokeMemberFunction('updateWorkspaceState', payload);
}

async function flushQueuedSave(key: string): Promise<void> {
  const pending = pendingByKey.get(key);
  if (!pending) return;
  const timer = timerByKey.get(key);
  if (timer) clearTimeout(timer);
  pendingByKey.delete(key);
  timerByKey.delete(key);
  if (!workspaceStateSyncEnabled()) return;
  await invokeWorkspaceFunction({
    action: 'save',
    namespace: pending.namespace,
    scopeKey: pending.scopeKey,
    schemaVersion: pending.schemaVersion,
    state: pending.state,
  }).catch(() => null);
}

export function enqueueWorkspaceStateSave(input: WorkspaceStateSaveInput): void {
  if (!workspaceStateSyncEnabled()) return;
  const namespace = normalizeNamespace(input.namespace);
  const scopeKey = normalizeScopeKey(input.scopeKey || DEFAULT_SCOPE);
  const schemaVersion = normalizeSchemaVersion(input.schemaVersion || 1);
  const normalizedState = stableCloneWithBytes(input.state);
  if (!normalizedState || normalizedState.bytes > MAX_STATE_PAYLOAD_BYTES) return;
  const key = queueKey(namespace, scopeKey);
  if (!pendingByKey.has(key)) {
    evictOldestPendingSave();
  }
  pendingByKey.set(key, {
    namespace,
    scopeKey,
    schemaVersion,
    state: normalizedState.state,
  });
  const debounceMs = Math.max(200, Math.min(Math.floor(Number(input.debounceMs || DEFAULT_DEBOUNCE_MS)), 5000));
  const existing = timerByKey.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    void flushQueuedSave(key);
  }, debounceMs);
  timerByKey.set(key, timer);
}

export async function flushAllWorkspaceStateSaves(): Promise<void> {
  const keys = Array.from(pendingByKey.keys());
  await Promise.all(keys.map((key) => flushQueuedSave(key)));
}

export async function loadWorkspaceStateSnapshot<T = unknown>(
  input: WorkspaceStateLoadInput
): Promise<WorkspaceStateSnapshot<T> | null> {
  if (!workspaceStateSyncEnabled()) return null;
  const namespace = normalizeNamespace(input.namespace);
  const scopeKey = normalizeScopeKey(input.scopeKey || DEFAULT_SCOPE);
  const response = await invokeWorkspaceFunction({
    action: 'load',
    namespace,
    scopeKey,
  }).catch(() => null);
  const snapshot = response?.data?.snapshot;
  if (!snapshot || typeof snapshot !== 'object') return null;
  const clonedState = stableCloneWithBytes(snapshot.state as T);
  if (!clonedState) return null;
  return {
    namespace: normalizeNamespace(snapshot.namespace || namespace),
    scopeKey: normalizeScopeKey(snapshot.scopeKey || scopeKey),
    schemaVersion: normalizeSchemaVersion(snapshot.schemaVersion || 1),
    persistedAt: text(snapshot.persistedAt),
    bytes: Number.isFinite(Number(snapshot.bytes)) ? Number(snapshot.bytes) : clonedState.bytes,
    state: clonedState.state,
    source: snapshot.source === 'entity' || snapshot.source === 'event_log' ? snapshot.source : 'none',
  };
}

export async function clearWorkspaceStateSnapshot(input: WorkspaceStateLoadInput, reason = 'manual_clear'): Promise<boolean> {
  if (!workspaceStateSyncEnabled()) return false;
  const namespace = normalizeNamespace(input.namespace);
  const scopeKey = normalizeScopeKey(input.scopeKey || DEFAULT_SCOPE);
  const response = await invokeWorkspaceFunction({
    action: 'clear',
    namespace,
    scopeKey,
    reason: text(reason, 'manual_clear'),
  }).catch(() => null);
  return Boolean(response?.data?.success);
}
