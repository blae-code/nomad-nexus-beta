import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueWorkspaceStateSaveMock, loadWorkspaceStateSnapshotMock } = vi.hoisted(() => ({
  enqueueWorkspaceStateSaveMock: vi.fn(),
  loadWorkspaceStateSnapshotMock: vi.fn(),
}));

vi.mock('../../src/components/nexus-os/services/workspaceStateBridgeService', () => ({
  enqueueWorkspaceStateSave: (...args: unknown[]) => enqueueWorkspaceStateSaveMock(...args),
  loadWorkspaceStateSnapshot: (...args: unknown[]) => loadWorkspaceStateSnapshotMock(...args),
}));

import {
  COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS,
  COMMS_CARD_CONSOLE_MAX_TEMPLATES,
  COMMS_CARD_CONSOLE_MAX_WATCHLIST_IDS,
  buildCommsCardConsoleScopeKey,
  commsCardConsoleStorageKey,
  hydrateCommsCardConsoleState,
  loadLocalCommsCardConsoleState,
  mergeCommsCardConsoleState,
  normalizeCommsCardConsoleState,
  persistCommsCardConsoleState,
} from '../../src/components/nexus-os/ui/comms/commsCardConsoleState';

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
  };
}

describe('commsCardConsoleState', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;
  let storage: ReturnType<typeof createMemoryStorage>;

  beforeEach(() => {
    enqueueWorkspaceStateSaveMock.mockReset();
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

  it('normalizes and clamps local state payloads', () => {
    const oversized = normalizeCommsCardConsoleState({
      watchlistSquadIds: Array.from({ length: 60 }, (_, index) => `sq-${index}`),
      bridgeTemplates: Array.from({ length: 20 }, (_, index) => ({
        id: `tpl-${index}`,
        name: `Template ${index}`,
        squadIds: ['a', 'b', 'c', 'd', 'e', 'f'],
        defaultTtlSec: 99,
        updatedAt: '2020-01-01T00:00:00.000Z',
      })),
    });

    expect(oversized.watchlistSquadIds).toHaveLength(COMMS_CARD_CONSOLE_MAX_WATCHLIST_IDS);
    expect(oversized.bridgeTemplates).toHaveLength(COMMS_CARD_CONSOLE_MAX_TEMPLATES);
    expect(oversized.bridgeTemplates[0].squadIds).toHaveLength(COMMS_CARD_CONSOLE_MAX_TEMPLATE_SQUADS);
    expect(oversized.bridgeTemplates[0].defaultTtlSec).toBe(300);
    expect(oversized.version).toBe(1);
  });

  it('merges remote and local state deterministically', () => {
    const local = normalizeCommsCardConsoleState({
      watchlistSquadIds: ['sq-1', 'sq-2'],
      bridgeTemplates: [{ id: 'tpl-a', name: 'Alpha', squadIds: ['sq-1'], defaultTtlSec: 300, updatedAt: '2026-01-01T00:00:00.000Z' }],
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    const remote = normalizeCommsCardConsoleState({
      watchlistSquadIds: ['sq-2', 'sq-3'],
      bridgeTemplates: [{ id: 'tpl-a', name: 'Alpha Remote', squadIds: ['sq-2'], defaultTtlSec: 120, updatedAt: '2026-01-02T00:00:00.000Z' }],
      updatedAt: '2026-01-02T00:00:00.000Z',
    });

    const merged = mergeCommsCardConsoleState(local, remote);
    expect(merged.watchlistSquadIds.slice(0, 3)).toEqual(['sq-2', 'sq-3', 'sq-1']);
    expect(merged.bridgeTemplates[0].name).toBe('Alpha Remote');
    expect(merged.bridgeTemplates[0].defaultTtlSec).toBe(120);
  });

  it('self-heals corrupt local snapshots and hydrates from remote', async () => {
    const scope = { sessionScopeKey: 'session:alpha', variantId: 'CQB-01', opId: 'op-a' };
    storage.setItem(commsCardConsoleStorageKey(scope), '{bad');

    const loaded = loadLocalCommsCardConsoleState(scope);
    expect(loaded.version).toBe(1);
    expect(storage.getItem(commsCardConsoleStorageKey(scope))).toBeNull();

    loadWorkspaceStateSnapshotMock.mockResolvedValue({
      state: {
        version: 99,
        watchlistSquadIds: ['sq-1'],
        bridgeTemplates: [{ id: 'tpl-x', name: 'X', squadIds: ['sq-1'], defaultTtlSec: 300, updatedAt: '2026-01-01T00:00:00.000Z' }],
      },
    });

    const hydrated = await hydrateCommsCardConsoleState(scope, loaded);
    expect(hydrated.watchlistSquadIds[0]).toBe('sq-1');
    expect(buildCommsCardConsoleScopeKey(scope)).toBe('session:alpha:CQB-01:op-a');
  });

  it('persists local snapshots and enqueues workspace save', () => {
    const scope = { sessionScopeKey: 'session:beta', variantId: 'CQB-02', opId: 'op-b' };
    const state = normalizeCommsCardConsoleState({
      watchlistSquadIds: ['sq-5'],
      bridgeTemplates: [{ id: 'tpl-b', name: 'Bravo', squadIds: ['sq-5'], defaultTtlSec: 300, updatedAt: '2026-01-03T00:00:00.000Z' }],
    });

    persistCommsCardConsoleState(scope, state);
    const raw = storage.getItem(commsCardConsoleStorageKey(scope));

    expect(raw).toBeTruthy();
    expect(enqueueWorkspaceStateSaveMock).toHaveBeenCalledTimes(1);
  });
});
