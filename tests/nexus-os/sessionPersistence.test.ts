import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  enqueueWorkspaceStateSaveMock,
  clearWorkspaceStateSnapshotMock,
  loadWorkspaceStateSnapshotMock,
} = vi.hoisted(() => ({
  enqueueWorkspaceStateSaveMock: vi.fn(),
  clearWorkspaceStateSnapshotMock: vi.fn(),
  loadWorkspaceStateSnapshotMock: vi.fn(),
}));

vi.mock('../../src/components/nexus-os/services/workspaceStateBridgeService', () => ({
  enqueueWorkspaceStateSave: (...args: unknown[]) => enqueueWorkspaceStateSaveMock(...args),
  clearWorkspaceStateSnapshot: (...args: unknown[]) => clearWorkspaceStateSnapshotMock(...args),
  loadWorkspaceStateSnapshot: (...args: unknown[]) => loadWorkspaceStateSnapshotMock(...args),
}));

import {
  hydrateWorkspaceSessionFromBackend,
  loadWorkspaceSession,
  persistWorkspaceSession,
  workspaceSessionStorageKey,
} from '../../src/components/nexus-os/ui/os/sessionPersistence';

function createMemoryStorage() {
  const memory = new Map<string, string>();
  return {
    getItem: (key: string) => memory.get(key) || null,
    setItem: (key: string, value: string) => {
      memory.set(key, value);
    },
    removeItem: (key: string) => {
      memory.delete(key);
    },
    clear: () => memory.clear(),
    key: (index: number) => Array.from(memory.keys())[index] || null,
    get length() {
      return memory.size;
    },
  };
}

describe('sessionPersistence', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    enqueueWorkspaceStateSaveMock.mockReset();
    clearWorkspaceStateSnapshotMock.mockReset();
    loadWorkspaceStateSnapshotMock.mockReset();
    storage = createMemoryStorage();
    (globalThis as { localStorage?: unknown }).localStorage = storage;
    (globalThis as { window?: unknown }).window = { localStorage: storage };
  });

  afterEach(() => {
    if (typeof previousStorage === 'undefined') {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = previousStorage;
    }
    if (typeof previousWindow === 'undefined') {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = previousWindow;
    }
  });

  it('self-heals corrupt local snapshots', () => {
    const scope = 'session:alpha';
    const key = workspaceSessionStorageKey(scope);
    storage.setItem(key, '{"badJson"');

    const loaded = loadWorkspaceSession(scope);

    expect(loaded.version).toBe(1);
    expect(storage.getItem(key)).toBeNull();
  });

  it('normalizes panel IDs and emits sync save on persist', () => {
    const scope = 'session:beta';
    persistWorkspaceSession(scope, {
      version: 1,
      bridgeId: ' OPS ',
      presetId: ' COMMAND_LEFT ',
      variantId: ' CQB-01 ',
      opId: ' op-1 ',
      elementFilter: ' ALL ',
      actorId: ' ce-warden ',
      focusMode: ' cqb ',
      forceDesignOpId: ' force-1 ',
      reportsOpId: ' report-1 ',
      activePanelIds: ['panel-a', 'panel-a', '', 'panel-b'],
      workspaceOnboardingCompleted: true,
      updatedAt: 'bad-date',
    });

    const persisted = JSON.parse(String(storage.getItem(workspaceSessionStorageKey(scope)) || '{}'));
    expect(persisted.bridgeId).toBe('OPS');
    expect(persisted.activePanelIds).toEqual(['panel-a', 'panel-b']);
    expect(enqueueWorkspaceStateSaveMock).toHaveBeenCalledTimes(1);
  });

  it('hydrates and normalizes backend snapshots', async () => {
    loadWorkspaceStateSnapshotMock.mockResolvedValue({
      state: {
        version: 1,
        bridgeId: ' COMMAND ',
        activePanelIds: ['panel-x', 'panel-x', '', 'panel-y'],
        workspaceOnboardingCompleted: true,
      },
    });

    const hydrated = await hydrateWorkspaceSessionFromBackend('session:gamma');
    expect(hydrated.bridgeId).toBe('COMMAND');
    expect(hydrated.activePanelIds).toEqual(['panel-x', 'panel-y']);
    expect(hydrated.workspaceOnboardingCompleted).toBe(true);
  });
});
