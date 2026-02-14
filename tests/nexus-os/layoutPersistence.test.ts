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
  loadWorkbenchLayout,
  toWorkbenchLayoutSnapshot,
  workbenchLayoutStorageKey,
} from '../../src/components/nexus-os/ui/workbench/layoutPersistence';

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

describe('layoutPersistence', () => {
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

  it('removes corrupt local layout snapshots', () => {
    const scopeKey = 'layout:alpha';
    const key = workbenchLayoutStorageKey(scopeKey);
    storage.setItem(key, '{"badJson"');

    const loaded = loadWorkbenchLayout({
      scopeKey,
      fallbackPresetId: 'GRID_2X2',
      availablePanelIds: ['panel-a', 'panel-b'],
    });

    expect(loaded).toBeNull();
    expect(storage.getItem(key)).toBeNull();
  });

  it('filters layout panel sizes to known panel IDs', () => {
    const snapshot = toWorkbenchLayoutSnapshot(
      'GRID_2X2',
      [
        { id: 'panel-a', title: 'A', component: (() => null) as any },
        { id: 'panel-b', title: 'B', component: (() => null) as any },
      ],
      {
        'panel-a': { colSpan: 1, rowSpan: 2 },
        'panel-z': { colSpan: 9, rowSpan: 9 },
      },
      ['panel-a']
    );

    expect(snapshot.panelSizes['panel-a']?.colSpan).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(snapshot.panelSizes, 'panel-z')).toBe(false);
    expect(snapshot.activePanelIds).toEqual(['panel-a']);
  });
});

