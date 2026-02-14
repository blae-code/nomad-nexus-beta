import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  hydrateWorkspaceSessionFromBackend,
  loadWorkspaceSession,
  persistWorkspaceSession,
  resetWorkspaceSession,
  type NexusWorkspaceSessionSnapshot,
} from './sessionPersistence';

export function useNexusWorkspaceSession(
  sessionScopeKey: string,
  defaults: Partial<NexusWorkspaceSessionSnapshot>
) {
  const mergedDefaults = useMemo(() => defaults, [JSON.stringify(defaults)]);
  const [snapshot, setSnapshot] = useState<NexusWorkspaceSessionSnapshot>(() =>
    loadWorkspaceSession(sessionScopeKey, mergedDefaults)
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const local = loadWorkspaceSession(sessionScopeKey, mergedDefaults);
    setSnapshot(local);
    setHydrated(true);
    void hydrateWorkspaceSessionFromBackend(sessionScopeKey, mergedDefaults).then((remote) => {
      if (!active) return;
      const localMs = Date.parse(String(local.updatedAt || ''));
      const remoteMs = Date.parse(String(remote.updatedAt || ''));
      if (!Number.isNaN(localMs) && !Number.isNaN(remoteMs) && remoteMs < localMs) return;
      setSnapshot(remote);
    }).catch(() => {
      // best effort remote hydration
    });
    return () => {
      active = false;
    };
  }, [sessionScopeKey, mergedDefaults]);

  useEffect(() => {
    if (!hydrated) return;
    persistWorkspaceSession(sessionScopeKey, snapshot);
  }, [sessionScopeKey, snapshot, hydrated]);

  const patchSnapshot = useCallback(
    (patch: Partial<NexusWorkspaceSessionSnapshot>) => {
      setSnapshot((prev) => ({
        ...prev,
        ...patch,
        version: 1,
        updatedAt: new Date().toISOString(),
      }));
    },
    [setSnapshot]
  );

  const reset = useCallback(() => {
    resetWorkspaceSession(sessionScopeKey);
    setSnapshot(loadWorkspaceSession(sessionScopeKey, mergedDefaults));
  }, [sessionScopeKey, mergedDefaults]);

  return {
    snapshot,
    hydrated,
    patchSnapshot,
    reset,
  };
}
