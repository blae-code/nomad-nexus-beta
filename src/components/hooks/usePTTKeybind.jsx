import { useEffect, useRef, useCallback } from 'react';
import { useKeybinds } from '@/components/hooks/useKeybinds';

export const usePTTKeybind = (onStandardPTT, onCmdPTT) => {
  const { keybinds, isKeyMatch } = useKeybinds();
  const standardPressedRef = useRef(false);
  const cmdPressedRef = useRef(false);

  const handleKeyDown = useCallback((event) => {
    // Ignore if typing in input/textarea
    if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
      return;
    }

    if (isKeyMatch(event, 'ptt_standard') && !standardPressedRef.current) {
      event.preventDefault();
      standardPressedRef.current = true;
      onStandardPTT?.(true);
    }

    if (isKeyMatch(event, 'ptt_cmd') && !cmdPressedRef.current) {
      event.preventDefault();
      cmdPressedRef.current = true;
      onCmdPTT?.(true);
    }
  }, [keybinds, isKeyMatch, onStandardPTT, onCmdPTT]);

  const handleKeyUp = useCallback((event) => {
    if (isKeyMatch(event, 'ptt_standard')) {
      event.preventDefault();
      standardPressedRef.current = false;
      onStandardPTT?.(false);
    }

    if (isKeyMatch(event, 'ptt_cmd')) {
      event.preventDefault();
      cmdPressedRef.current = false;
      onCmdPTT?.(false);
    }
  }, [keybinds, isKeyMatch, onStandardPTT, onCmdPTT]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  return { standardPressedRef, cmdPressedRef };
};