import { useMemo, useState } from 'react';

export type NexusAppLifecycleState = 'foreground' | 'background' | 'suspended' | 'error' | 'closed';

export interface NexusAppLifecycleEntry {
  id: string;
  state: NexusAppLifecycleState;
  updatedAt: string;
  errorMessage?: string;
}

type LifecycleMap = Record<string, NexusAppLifecycleEntry>;

function nowIso(): string {
  return new Date().toISOString();
}

function buildInitialLifecycle(appIds: string[]): LifecycleMap {
  return appIds.reduce<LifecycleMap>((acc, id) => {
    acc[id] = { id, state: 'closed', updatedAt: nowIso() };
    return acc;
  }, {});
}

export function useNexusAppLifecycle(appIds: string[]) {
  const [entries, setEntries] = useState<LifecycleMap>(() => buildInitialLifecycle(appIds));

  const setState = (id: string, state: NexusAppLifecycleState, errorMessage?: string) => {
    setEntries((prev) => {
      if (!prev[id]) return prev;
      const next: LifecycleMap = { ...prev };
      if (state === 'foreground') {
        for (const key of Object.keys(next)) {
          if (key !== id && next[key].state === 'foreground') {
            next[key] = { ...next[key], state: 'background', updatedAt: nowIso() };
          }
        }
      }
      next[id] = {
        ...next[id],
        state,
        updatedAt: nowIso(),
        errorMessage,
      };
      return next;
    });
  };

  const markForeground = (id: string) => setState(id, 'foreground');
  const markBackground = (id: string) => setState(id, 'background');
  const markSuspended = (id: string) => setState(id, 'suspended');
  const markClosed = (id: string) => setState(id, 'closed');
  const markError = (id: string, message: string) => setState(id, 'error', message);

  const foregroundAppId = useMemo(() => {
    const entry = Object.values(entries).find((item) => item.state === 'foreground');
    return entry?.id || null;
  }, [entries]);

  const activeApps = useMemo(
    () =>
      Object.values(entries)
        .filter((entry) => entry.state !== 'closed')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [entries]
  );

  return {
    entries,
    foregroundAppId,
    activeApps,
    markForeground,
    markBackground,
    markSuspended,
    markClosed,
    markError,
  };
}

