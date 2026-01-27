const DEMO_PARAM_VALUES = new Set(['1', 'true', 'yes', 'on']);
const DEMO_STORAGE_KEY = 'nn_demo_mode';

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

export const isDemoMode = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const value = params.get('demo');
  if (value && DEMO_PARAM_VALUES.has(value.toLowerCase())) return true;
  return window.localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
};

export const setDemoMode = (enabled) => {
  if (typeof window === 'undefined') return;
  if (enabled) {
    window.localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  } else {
    window.localStorage.removeItem(DEMO_STORAGE_KEY);
  }
};
