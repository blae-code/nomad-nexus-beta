import { useState, useEffect, useCallback } from 'react';

const DEFAULT_KEYBINDS = {
  ptt_standard: 'Space',
  ptt_cmd: 'Control',
};

const KEYBIND_LABELS = {
  ptt_standard: 'Standard PTT',
  ptt_cmd: 'CMD PTT',
};

export const useKeybinds = () => {
  const [keybinds, setKeybinds] = useState(DEFAULT_KEYBINDS);
  const [isListening, setIsListening] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pttKeybinds');
    if (saved) {
      try {
        setKeybinds(JSON.parse(saved));
      } catch {
        setKeybinds(DEFAULT_KEYBINDS);
      }
    }
  }, []);

  // Normalize key names for consistency
  const normalizeKey = (key) => {
    const keyMap = {
      ' ': 'Space',
      'control': 'Control',
      'shift': 'Shift',
      'alt': 'Alt',
      'meta': 'Meta',
      'enter': 'Enter',
      'tab': 'Tab',
      'escape': 'Escape',
      'arrowup': 'ArrowUp',
      'arrowdown': 'ArrowDown',
      'arrowleft': 'ArrowLeft',
      'arrowright': 'ArrowRight',
    };
    return keyMap[key.toLowerCase()] || key;
  };

  const saveKeybind = useCallback((action, key) => {
    const normalizedKey = normalizeKey(key);
    const newKeybinds = { ...keybinds, [action]: normalizedKey };
    setKeybinds(newKeybinds);
    localStorage.setItem('pttKeybinds', JSON.stringify(newKeybinds));
  }, [keybinds]);

  const resetKeybinds = useCallback(() => {
    setKeybinds(DEFAULT_KEYBINDS);
    localStorage.setItem('pttKeybinds', JSON.stringify(DEFAULT_KEYBINDS));
  }, []);

  const isKeyMatch = useCallback((event, action) => {
    const eventKey = normalizeKey(event.key);
    const boundKey = keybinds[action];
    return eventKey === boundKey;
  }, [keybinds]);

  return {
    keybinds,
    saveKeybind,
    resetKeybinds,
    isKeyMatch,
    isListening,
    setIsListening,
    KEYBIND_LABELS,
    normalizeKey,
  };
};