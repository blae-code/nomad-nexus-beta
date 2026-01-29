import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

/**
 * ShellUIContext — Centralized state for mission-control layout
 * Manages: sidepanel, context panel, comms dock visibility + persistence
 */
const ShellUIContext = createContext(null);

const STORAGE_PREFIX = 'nexus.shell.ui.';

const DEFAULT_STATE = {
  isSidePanelOpen: true,
  isContextPanelOpen: true,
  isCommsDockOpen: true,
};

export function ShellUIProvider({ children }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}state`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({
          ...parsed,
          isCommsDockOpen: true, // Always force dock visible on load
        });
      } else {
        setState(DEFAULT_STATE);
      }
    } catch (err) {
      console.warn('Failed to load shell UI state:', err);
      setState(DEFAULT_STATE);
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(state));
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

  const value = {
    ...state,
    loaded,
    toggleSidePanel,
    toggleContextPanel,
    toggleCommsDock,
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