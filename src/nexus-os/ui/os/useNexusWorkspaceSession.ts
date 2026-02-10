import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
    setSnapshot(loadWorkspaceSession(sessionScopeKey, mergedDefaults));
    setHydrated(true);
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

