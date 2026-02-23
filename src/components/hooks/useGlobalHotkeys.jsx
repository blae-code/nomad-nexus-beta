import { useEffect, useCallback } from 'react';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';

/**
 * useGlobalHotkeys — Registers global keyboard shortcuts from CommandPalette action registry
 * Maps keyboard combos (Cmd/Ctrl+key, Cmd/Ctrl+Shift+key) to action execution
 * Ignores input fields to avoid interference with text entry
 */
export function useGlobalHotkeys() {
  const palette = useCommandPalette();

  // Build shortcut map from action registry: "⌘C" -> actionId
  const shortcutMap = useCallback(() => {
    const map = new Map();
    if (!palette?.filteredActions) return map;

    palette.filteredActions.forEach((action) => {
      if (action.shortcut) {
        map.set(action.shortcut, action.id);
      }
    });
    return map;
  }, [palette?.filteredActions]);

  // Normalize shortcut string to match keyboard event
  // "⌘C" -> "cmd+c", "⌘⇧D" -> "cmd+shift+d"
  const normalizeShortcut = useCallback((shortcutStr) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    let normalized = shortcutStr
      .replace(/⌘/g, isMac ? 'cmd' : 'ctrl')
      .replace(/⇧/g, 'shift')
      .toLowerCase();
    return normalized;
  }, []);

  // Build keyboard event listener
  useEffect(() => {
    const map = shortcutMap();
    if (map.size === 0) return undefined;

    const handleKeyDown = (event) => {
      // Ignore if inside input/textarea
      const target = event.target;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        return;
      }

      // Build pressed key combo: "ctrl+c", "cmd+shift+d", etc.
      const parts = [];
      if (event.ctrlKey || event.metaKey) {
        parts.push(event.metaKey && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent) ? 'cmd' : 'ctrl');
      }
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');

      // Add the actual key
      const key = event.key.toLowerCase();
      if (!/^(control|shift|alt|meta|cmd)/.test(key)) {
        parts.push(key);
      }

      const pressedCombo = parts.join('+');

      // Check all shortcuts to find a match
      for (const [shortcut, actionId] of map.entries()) {
        const normalized = normalizeShortcut(shortcut);
        if (normalized === pressedCombo) {
          event.preventDefault();
          // Find action in filtered list and execute
          const action = palette.filteredActions.find((a) => a.id === actionId);
          if (action?.onExecute) {
            action.onExecute();
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [palette?.filteredActions, shortcutMap, normalizeShortcut]);
}