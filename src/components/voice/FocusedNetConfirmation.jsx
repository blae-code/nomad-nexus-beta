/**
 * FocusedNetConfirmation — One-time discipline notice for Focused nets
 */

import React, { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

const CONFIRMATION_SESSION_KEY = 'nexus.voice.focusedConfirmSeen';

/**
 * Hook to manage focused net confirmation state
 */
export function useFocusedConfirmation() {
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [pendingNetId, setPendingNetId] = useState(null);

  const checkNeedConfirmation = useCallback((net) => {
    // Only require confirmation for Focused nets (non-temporary)
    if (net.type !== 'FOCUSED') return false;
    if (net.isTemporary) return false;

    // Check if already confirmed this session
    const hasConfirmed = sessionStorage.getItem(CONFIRMATION_SESSION_KEY) === 'true';
    return !hasConfirmed;
  }, []);

  const requestConfirmation = useCallback((netId) => {
    setNeedsConfirmation(true);
    setPendingNetId(netId);
  }, []);

  const confirm = useCallback(() => {
    sessionStorage.setItem(CONFIRMATION_SESSION_KEY, 'true');
    setNeedsConfirmation(false);
    const netId = pendingNetId;
    setPendingNetId(null);
    return netId;
  }, [pendingNetId]);

  const cancel = useCallback(() => {
    setNeedsConfirmation(false);
    setPendingNetId(null);
  }, []);

  return {
    needsConfirmation,
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
    <Sheet open={true} onOpenChange={(open) => !open && onCancel()}>
      <SheetContent side="bottom" className="bg-zinc-900 border-zinc-800">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-orange-500" />
            <SheetTitle className="text-zinc-100">Focused Net — Operational Discipline</SheetTitle>
          </div>
          <SheetDescription className="text-zinc-400 text-sm leading-relaxed">
            Focused nets are reserved for operational traffic. Keep chatter and off-topic conversation in Casual nets. 
            Push-to-talk is recommended.
          </SheetDescription>
        </SheetHeader>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            Understood
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}