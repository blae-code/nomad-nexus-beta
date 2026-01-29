/**
 * FocusedNetConfirmation — One-time-per-session discipline notice
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const SESSION_KEY = 'nexus.voice.focusedConfirmSeen';

export function useFocusedConfirmation() {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingNetId, setPendingNetId] = useState(null);

  const checkNeedConfirmation = (net) => {
    // Check if this is a focused net (non-temporary)
    if (net.type !== 'FOCUSED' || net.isTemporary) {
      return false;
    }

    // Check session storage
    const seen = sessionStorage.getItem(SESSION_KEY);
    return !seen;
  };

  const requestConfirmation = (netId) => {
    setPendingNetId(netId);
    setNeedsConfirmation(true);
  };

  const confirm = () => {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setNeedsConfirmation(false);
    return pendingNetId;
  };

  const cancel = () => {
    setNeedsConfirmation(false);
    setPendingNetId(null);
  };

  return {
    needsConfirmation,
    checkNeedConfirmation,
    requestConfirmation,
    confirm,
    cancel,
  };
}

export function FocusedNetConfirmationSheet({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md mx-4">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Focused Net — Operational Discipline</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Focused nets are reserved for operational traffic. Keep chatter and off-topic conversation
              in Casual nets. Push-to-talk is recommended.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="default" size="sm" onClick={onConfirm}>
            Understood
          </Button>
        </div>
      </div>
    </div>
  );
}