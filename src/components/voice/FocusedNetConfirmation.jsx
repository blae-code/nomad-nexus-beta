/**
 * FocusedNetConfirmation — Hook + Sheet for confirming focused net join
 * Provides confirmation flow for joining focused voice nets
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield } from 'lucide-react';

/**
 * Hook for managing focused net confirmation state
 */
export function useFocusedConfirmation() {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingNetId, setPendingNetId] = useState(null);

  const checkNeedConfirmation = useCallback((net) => {
    // Only focused nets (non-temporary) need confirmation
    return net.type === 'FOCUSED' && !net.isTemporary;
  }, []);

  const requestConfirmation = useCallback((netId) => {
    setPendingNetId(netId);
    setNeedsConfirmation(true);
  }, []);

  const confirm = useCallback(() => {
    const netId = pendingNetId;
    setNeedsConfirmation(false);
    setPendingNetId(null);
    return netId;
  }, [pendingNetId]);

  const cancel = useCallback(() => {
    setNeedsConfirmation(false);
    setPendingNetId(null);
  }, []);

  return {
    needsConfirmation,
    pendingNetId,
    checkNeedConfirmation,
    requestConfirmation,
    confirm,
    cancel,
  };
}

/**
 * Confirmation sheet component
 */
export function FocusedNetConfirmationSheet({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border-2 border-orange-500/50 rounded-lg max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Join Focused Net?</h2>
            <p className="text-xs text-zinc-400">Tactical comms protocol</p>
          </div>
        </div>

        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-zinc-300">
              Focused nets enforce tactical discipline and clear comms protocols.
            </div>
          </div>
          <div className="text-xs text-zinc-400 space-y-1">
            <div>• Push-to-talk required</div>
            <div>• Minimize chatter</div>
            <div>• Follow net commander</div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="flex-1 bg-orange-600 hover:bg-orange-500"
            onClick={onConfirm}
          >
            Join Net
          </Button>
        </div>
      </div>
    </div>
  );
}