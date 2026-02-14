import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  enqueueWorkspaceStateSave,
  flushAllWorkspaceStateSaves,
  workspaceStateMaxPayloadBytes,
} from '../../src/components/nexus-os/services/workspaceStateBridgeService';

const invokeMemberFunctionMock = vi.fn();

vi.mock('../../src/api/memberFunctions.js', () => ({
  invokeMemberFunction: (...args: unknown[]) => invokeMemberFunctionMock(...args),
}));

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

describe('workspaceStateBridgeService', () => {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousStorage = (globalThis as { localStorage?: unknown }).localStorage;

  beforeEach(() => {
    invokeMemberFunctionMock.mockReset();
    const storage = createMemoryStorage();
    storage.setItem('nexus.login.token', 'token-1');
    (globalThis as { localStorage?: unknown }).localStorage = storage;
    (globalThis as { window?: unknown }).window = { localStorage: storage };
  });

  afterEach(async () => {
    await flushAllWorkspaceStateSaves();
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

  it('queues and flushes normalized workspace save payloads', async () => {
    invokeMemberFunctionMock.mockResolvedValue({ data: { success: true } });

    enqueueWorkspaceStateSave({
      namespace: 'Ops State',
      scopeKey: 'bridge alpha',
      schemaVersion: 3,
      state: { ready: true },
      debounceMs: 240,
    });

    await flushAllWorkspaceStateSaves();

    expect(invokeMemberFunctionMock).toHaveBeenCalledTimes(1);
    const [name, payload] = invokeMemberFunctionMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(name).toBe('updateWorkspaceState');
    expect(payload.action).toBe('save');
    expect(payload.namespace).toBe('ops_state');
    expect(payload.scopeKey).toBe('bridge_alpha');
    expect(payload.schemaVersion).toBe(3);
  });

  it('drops oversized workspace payloads', async () => {
    invokeMemberFunctionMock.mockResolvedValue({ data: { success: true } });

    enqueueWorkspaceStateSave({
      namespace: 'ops',
      scopeKey: 'big',
      state: {
        blob: 'x'.repeat(workspaceStateMaxPayloadBytes() + 1024),
      },
      debounceMs: 200,
    });

    await flushAllWorkspaceStateSaves();
    expect(invokeMemberFunctionMock).not.toHaveBeenCalled();
  });

  it('coalesces repeated saves for the same scope to the latest state', async () => {
    invokeMemberFunctionMock.mockResolvedValue({ data: { success: true } });

    for (let index = 0; index < 6; index += 1) {
      enqueueWorkspaceStateSave({
        namespace: 'ops',
        scopeKey: 'scope-repeat',
        state: { value: index },
        debounceMs: 200,
      });
    }

    await flushAllWorkspaceStateSaves();

    expect(invokeMemberFunctionMock.mock.calls.length).toBe(1);
    const payload = invokeMemberFunctionMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect((payload.state as { value: number }).value).toBe(5);
  });
});
