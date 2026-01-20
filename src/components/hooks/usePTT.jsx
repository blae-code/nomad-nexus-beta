import { useEffect, useRef, useState } from 'react';

/**
 * usePTT Hook
 * Manages Push-To-Talk state and keybinding
 * Returns: { isTransmitting, pttKey }
 */
export function usePTT(onTransmitChange, preferences = {}) {
  const [isTransmitting, setIsTransmitting] = useState(false);
  const keyDownRef = useRef(false);
  const pttKeyRef = useRef(preferences.pttKey || 'Space');

  // Update PTT key when preferences change
  useEffect(() => {
    pttKeyRef.current = preferences.pttKey || 'Space';
  }, [preferences.pttKey]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Normalize key names
      const key = e.code === 'Space' ? 'Space' : e.key;
      
      // Avoid repeats for held keys
      if (keyDownRef.current) return;

      if (key === pttKeyRef.current) {
        e.preventDefault();
        keyDownRef.current = true;
        setIsTransmitting(true);
        onTransmitChange?.(true);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.code === 'Space' ? 'Space' : e.key;
      
      if (key === pttKeyRef.current) {
        e.preventDefault();
        keyDownRef.current = false;
        setIsTransmitting(false);
        onTransmitChange?.(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [onTransmitChange]);

  return { isTransmitting, pttKey: pttKeyRef.current };
}