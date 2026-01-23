/**
 * CommsConsoleDeepLink: Unified action for joining voice
 * 
 * Replaces scattered "Join Comms" buttons throughout the app.
 * Routes users to CommsConsole with pre-selected eventId & netId.
 * 
 * CANONICAL PATH: CommsConsole → ActiveNetPanel
 */

import React from 'react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';

export function useCommsConsoleLink() {
  const navigate = useNavigate();

  const openCommsArray = (eventId, netId = null) => {
    const url = createPageUrl('commsconsole');
    const params = new URLSearchParams();
    if (eventId) params.append('eventId', eventId);
    if (netId) params.append('netId', netId);
    navigate(`${url}?${params.toString()}`);
  };

  return { openCommsArray };
}

/**
 * Button component for "Join Voice" → CommsConsole
 * Replaces CommsJoinDialog and scattered voice join buttons
 */
export function OpenCommsArrayButton({ 
  eventId, 
  netId = null,
  label = 'Open Comms Array',
  variant = 'default',
  size = 'sm',
  className = '',
  ...props 
}) {
  const { openCommsArray } = useCommsConsoleLink();

  return (
    <button
      onClick={() => openCommsArray(eventId, netId)}
      className={cn('flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold', className)}
      {...props}
    >
      <Radio className="w-3 h-3" />
      {label}
    </button>
  );
}

// For places currently using CommsJoinDialog, provide a drop-in replacement
export function CommsJoinButtonRedirect({ eventId, onClose, autoJoin = false, ...props }) {
  const { openCommsArray } = useCommsConsoleLink();

  React.useEffect(() => {
    if (autoJoin) {
      openCommsArray(eventId);
      onClose?.();
    }
  }, [autoJoin, eventId, onClose, openCommsArray]);

  return (
    <div className="space-y-3 p-4 bg-zinc-950 border border-zinc-800">
      <p className="text-xs text-zinc-400 font-mono">Voice joining is now in the Comms Array</p>
      <button
        onClick={() => {
          openCommsArray(eventId);
          onClose?.();
        }}
        className="w-full px-3 py-2 bg-[#ea580c] hover:bg-[#c2410c] text-white text-xs font-bold rounded"
      >
        OPEN COMMS ARRAY
      </button>
      {onClose && (
        <button
          onClick={onClose}
          className="w-full px-3 py-2 border border-zinc-800 text-zinc-400 text-xs font-semibold rounded hover:border-zinc-700"
        >
          CANCEL
        </button>
      )}
    </div>
  );
}