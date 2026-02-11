import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * ShellUIContext — Centralized state for mission-control layout
 * Manages: sidepanel, context panel, comms dock visibility + persistence
 */
const ShellUIContext = createContext(null);

const STORAGE_PREFIX = 'nexus.shell.ui.';
const SHELL_UI_STATE_KEY = `${STORAGE_PREFIX}state`;

const DEFAULT_STATE = {
  isSidePanelOpen: true,
  isContextPanelOpen: true,
  // Keep the legacy dock available, but avoid forcing it on top of workspace surfaces.
  isCommsDockOpen: false,
  dockMode: 'voice', // 'voice' or 'text'
  dockMinimized: false,
  contextPanelMinimized: false,
};

export function normalizeShellUIState(rawState = {}) {
  if (!rawState || typeof rawState !== 'object') {
    return { ...DEFAULT_STATE };
  }

  const dockMode = rawState.dockMode === 'text' ? 'text' : 'voice';

  return {
    ...DEFAULT_STATE,
    ...rawState,
    dockMode,
    isSidePanelOpen: Boolean(rawState.isSidePanelOpen ?? DEFAULT_STATE.isSidePanelOpen),
    isContextPanelOpen: Boolean(rawState.isContextPanelOpen ?? DEFAULT_STATE.isContextPanelOpen),
    isCommsDockOpen: Boolean(rawState.isCommsDockOpen ?? DEFAULT_STATE.isCommsDockOpen),
    dockMinimized: Boolean(rawState.dockMinimized ?? DEFAULT_STATE.dockMinimized),
    contextPanelMinimized: Boolean(rawState.contextPanelMinimized ?? DEFAULT_STATE.contextPanelMinimized),
  };
}

export function readShellUIState(storage = globalThis?.localStorage) {
  if (!storage) return { ...DEFAULT_STATE };
  try {
    const stored = storage.getItem(SHELL_UI_STATE_KEY);
    if (!stored) return { ...DEFAULT_STATE };
    return normalizeShellUIState(JSON.parse(stored));
  } catch (err) {
    console.warn('Failed to load shell UI state:', err);
    return { ...DEFAULT_STATE };
  }
}

export function ShellUIProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setState(readShellUIState(localStorage));
    setLoaded(true);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(SHELL_UI_STATE_KEY, JSON.stringify(normalizeShellUIState(state)));
      } catch (err) {
        console.warn('Failed to persist shell UI state:', err);
      }
    }
  }, [state, loaded]);

  const toggleSidePanel = useCallback(() => {
    setState((prev) => ({ ...prev, isSidePanelOpen: !prev.isSidePanelOpen }));
  }, []);

  const toggleContextPanel = useCallback(() => {
    setState((prev) => ({ ...prev, isContextPanelOpen: !prev.isContextPanelOpen }));
  }, []);

  const toggleCommsDock = useCallback(() => {
    setState((prev) => ({ ...prev, isCommsDockOpen: !prev.isCommsDockOpen }));
  }, []);

  const setDockMode = useCallback((mode) => {
    setState((prev) => ({ ...prev, dockMode: mode }));
  }, []);

  const setDockMinimized = useCallback((minimized) => {
    setState((prev) => ({ ...prev, dockMinimized: minimized }));
  }, []);

  const setContextPanelMinimized = useCallback((minimized) => {
    setState((prev) => ({ ...prev, contextPanelMinimized: minimized }));
  }, []);

  const openCommsDock = useCallback(() => {
    setState((prev) => ({ ...prev, isCommsDockOpen: true }));
  }, []);

  const closeCommsDock = useCallback(() => {
    setState((prev) => ({ ...prev, isCommsDockOpen: false }));
  }, []);

  const value = {
    ...state,
    loaded,
    toggleSidePanel,
    toggleContextPanel,
    toggleCommsDock,
    setDockMode,
    setDockMinimized,
    setContextPanelMinimized,
    openCommsDock,
    closeCommsDock,
  };

  return <ShellUIContext.Provider value={value}>{children}</ShellUIContext.Provider>;
}

export function useShellUI() {
  const context = useContext(ShellUIContext);
  if (!context) {
    throw new Error('useShellUI must be used within ShellUIProvider');
  }
  return context;
}
