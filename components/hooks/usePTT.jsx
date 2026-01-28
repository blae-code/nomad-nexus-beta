import { useEffect, useRef, useState } from 'react';

/**
 * usePTT Hook
 * Manages Push-To-Talk state and keybinding
 * Rationale: allow configurable PTT keys, recover from stuck key states, and surface warnings to UI.
 * Returns: { isTransmitting, pttKey }
 */
export function usePTT(onTransmitChange, preferences = {}) {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [pttWarning, setPttWarning] = useState(null);
  const keyDownRef = useRef(false);
  const pttKeyRef = useRef(preferences.pttKey || 'Space');
  const failsafeTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);

  const PTT_KEY_LABELS = {
    Space: 'Space',
    ControlLeft: 'Left Ctrl',
    ControlRight: 'Right Ctrl',
    AltLeft: 'Left Alt',
    AltRight: 'Right Alt',
    Control: 'Ctrl',
    Alt: 'Alt',
  };

  const getEventKeys = (event) => {
    const codeKey = event.code === 'Space' ? 'Space' : event.code;
    const key = event.key;
    return { codeKey, key };
  };

  // Update PTT key when preferences change
  useEffect(() => {
    pttKeyRef.current = preferences.pttKey || 'Space';
  }, [preferences.pttKey]);

  useEffect(() => {
    const clearFailsafe = () => {
      if (failsafeTimeoutRef.current) {
        clearTimeout(failsafeTimeoutRef.current);
        failsafeTimeoutRef.current = null;
      }
    };

    const scheduleWarningClear = () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      warningTimeoutRef.current = setTimeout(() => {
        setPttWarning(null);
        warningTimeoutRef.current = null;
      }, 4000);
    };

    const handleKeyDown = (e) => {
      const { codeKey, key } = getEventKeys(e);
      
      // Avoid repeats for held keys
      if (keyDownRef.current) return;

      if (codeKey === pttKeyRef.current || key === pttKeyRef.current) {
        e.preventDefault();
        keyDownRef.current = true;
        setIsTransmitting(true);
        onTransmitChange?.(true);
        clearFailsafe();
        failsafeTimeoutRef.current = setTimeout(() => {
          if (keyDownRef.current) {
            keyDownRef.current = false;
            setIsTransmitting(false);
            onTransmitChange?.(false);
            setPttWarning('PTT reset after 5s to prevent a stuck transmit state.');
            scheduleWarningClear();
          }
        }, 5000);
      }
    };

    const handleKeyUp = (e) => {
      const { codeKey, key } = getEventKeys(e);
      
      if (codeKey === pttKeyRef.current || key === pttKeyRef.current) {
        e.preventDefault();
        keyDownRef.current = false;
        setIsTransmitting(false);
        onTransmitChange?.(false);
        clearFailsafe();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      clearFailsafe();
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [onTransmitChange]);

  return {
    isTransmitting,
    pttKey: pttKeyRef.current,
    pttKeyLabel: PTT_KEY_LABELS[pttKeyRef.current] || pttKeyRef.current,
    pttWarning,
  };
}
