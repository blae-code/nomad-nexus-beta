/**
 * Audio device persistence utilities
 * Stores selected input/output device IDs in localStorage
 */

const STORAGE_KEY_INPUT = 'nexus.audio.inputDeviceId';
const STORAGE_KEY_OUTPUT = 'nexus.audio.outputDeviceId';

/**
 * Get saved input device ID
 */
export function getSavedInputDeviceId() {
  try {
    return localStorage.getItem(STORAGE_KEY_INPUT) || null;
  } catch (e) {
    console.warn('Failed to read device preference:', e);
    return null;
  }
}

/**
 * Save input device ID
 */
export function saveMicDeviceId(deviceId) {
  try {
    if (deviceId) {
      localStorage.setItem(STORAGE_KEY_INPUT, deviceId);
    } else {
      localStorage.removeItem(STORAGE_KEY_INPUT);
    }
  } catch (e) {
    console.warn('Failed to save device preference:', e);
  }
}

/**
 * Get saved output device ID
 */
export function getSavedOutputDeviceId() {
  try {
    return localStorage.getItem(STORAGE_KEY_OUTPUT) || null;
  } catch (e) {
    console.warn('Failed to read device preference:', e);
    return null;
  }
}

/**
 * Save output device ID
 */
export function saveOutputDeviceId(deviceId) {
  try {
    if (deviceId) {
      localStorage.setItem(STORAGE_KEY_OUTPUT, deviceId);
    } else {
      localStorage.removeItem(STORAGE_KEY_OUTPUT);
    }
  } catch (e) {
    console.warn('Failed to save device preference:', e);
  }
}

/**
 * Clear all device preferences
 */
export function clearDevicePreferences() {
  try {
    localStorage.removeItem(STORAGE_KEY_INPUT);
    localStorage.removeItem(STORAGE_KEY_OUTPUT);
  } catch (e) {
    console.warn('Failed to clear device preferences:', e);
  }
}