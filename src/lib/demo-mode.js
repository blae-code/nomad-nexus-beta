const DEMO_PARAM = 'demo';
const DEMO_STORAGE_KEY = 'demoMode';
const DEMO_PARAM_VALUES = new Set(['1', 'true', 'yes', 'on']);

export const persistDemoFromUrl = () => {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const value = params.get('demo');
  if (!value) return;
  if (DEMO_PARAM_VALUES.has(value.toLowerCase())) {
    window.localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  } else if (value.toLowerCase() === 'false' || value.toLowerCase() === '0') {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  }
};

function getReason() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has(DEMO_PARAM)) {
      return `URL parameter "${DEMO_PARAM}" is set.`;
    }
    if (window.localStorage.getItem(DEMO_STORAGE_KEY) === 'true') {
      return `localStorage key "${DEMO_STORAGE_KEY}" is set.`;
    }
  }
  // Vite-specific environment variable
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return 'VITE_DEMO_MODE environment variable is set.';
  }
  return 'No demo mode condition met.';
}

export function isDemoMode() {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get(DEMO_PARAM) === 'true') {
      return true;
    }
    if (window.localStorage.getItem(DEMO_STORAGE_KEY) === 'true') {
      return true;
    }
  }
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

export function getDemoModeReason() {
  return isDemoMode() ? getReason() : 'Not in demo mode.';
}

export function setDemoMode(value) {
  if (typeof window !== 'undefined') {
    if (value) {
      window.localStorage.setItem(DEMO_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(DEMO_STORAGE_KEY);
    }
  }
}
