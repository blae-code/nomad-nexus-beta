import { useCallback, useEffect } from 'react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export function useVoiceCommands() {
  const voiceNet = useVoiceNet();
  const shellUI = useShellUI();

  const executeCommand = useCallback(async (voiceInput) => {
    try {
      const response = await base44.functions.invoke('processVoiceCommands', {
        voiceInput,
        netId: voiceNet?.transmitNetId || null,
      });

      if (!response?.data?.success) {
        console.warn('Voice command not recognized:', voiceInput);
        return { success: false };
      }

      const { action, target, command, confidence } = response.data;

      console.log(`[VOICE] Executing: "${command}" (${(confidence * 100).toFixed(0)}%)`);

      // Route to appropriate handler
      if (action === 'navigate') {
        window.location.href = createPageUrl(target);
      } else if (action === 'toggle') {
        if (target === 'commsDock') shellUI?.toggleCommsDock();
        else if (target === 'contextPanel') shellUI?.toggleContextPanel();
      } else if (action === 'openPalette') {
        window.dispatchEvent(new CustomEvent('nexus:open-command-palette'));
      } else if (action === 'startPTT') {
        voiceNet?.startPTT();
      } else if (action === 'stopPTT') {
        voiceNet?.stopPTT();
      }

      return { success: true, command, action, target, confidence };
    } catch (error) {
      console.error('[VOICE] Command execution error:', error);
      return { success: false, error: error.message };
    }
  }, [shellUI, voiceNet]);

  // Listen for voice command events from comms or voice net
  useEffect(() => {
    const handleVoiceCommand = (event) => {
      const { detail } = event;
      if (detail?.voiceInput) {
        executeCommand(detail.voiceInput);
      }
    };

    window.addEventListener('nexus:voice-command', handleVoiceCommand);
    return () => window.removeEventListener('nexus:voice-command', handleVoiceCommand);
  }, [executeCommand]);

  return { executeCommand };
}