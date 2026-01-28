import { useState, useEffect, useCallback } from 'react';

/**
 * useLayoutPreferences — Persist layout state to localStorage
 * Manages: SidePanel collapse, CommsDock state, Telemetry visibility
 */
const STORAGE_KEY = 'nomad_layout_prefs';

const DEFAULT_PREFS = {
  sidePanelCollapsed: false,
  commsDockOpen: false,
  showTelemetry: true,
};

export function useLayoutPreferences() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPrefs({ ...DEFAULT_PREFS, ...parsed });
      }
    } catch (err) {
      console.warn('Failed to load layout preferences:', err);
    }
    setLoaded(true);
  }, []);

  // Save to localStorage whenever prefs change
  const updatePrefs = useCallback((updates) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save layout preferences:', err);
      }
      return next;
    });
  }, []);

  const toggleSidePanel = useCallback(() => {
    updatePrefs({ sidePanelCollapsed: !prefs.sidePanelCollapsed });
  }, [prefs.sidePanelCollapsed, updatePrefs]);

  const toggleCommsDock = useCallback(() => {
    updatePrefs({ commsDockOpen: !prefs.commsDockOpen });
  }, [prefs.commsDockOpen, updatePrefs]);

  const toggleTelemetry = useCallback(() => {
    updatePrefs({ showTelemetry: !prefs.showTelemetry });
  }, [prefs.showTelemetry, updatePrefs]);

  return {
    loaded,
    prefs,
    updatePrefs,
    toggleSidePanel,
    toggleCommsDock,
    toggleTelemetry,
  };
}