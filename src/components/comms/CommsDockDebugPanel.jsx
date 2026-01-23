/**
 * Comms Debug Panel
 * Renders diagnostic info when admin
 */
import React from 'react';

export default function CommsDockDebugPanel({ debug, user }) {
  if (!user || user.role !== 'admin' || !debug) {
    return null;
  }

  return (
    <div className="px-2 py-1.5 border-t border-zinc-800 bg-zinc-950/60 text-[7px] font-mono space-y-0.5">
      <div className="flex justify-between">
        <span className="text-zinc-600">Mode:</span>
        <span className={debug.mode === 'LIVE' ? 'text-green-400' : 'text-blue-400'}>
          {debug.mode}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-600">State:</span>
        <span className={
          debug.connectionState === 'connected' ? 'text-green-400' :
          debug.connectionState === 'connecting' ? 'text-yellow-400' :
          'text-red-400'
        }>
          {debug.connectionState}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-600">Participants:</span>
        <span className="text-zinc-300">{debug.participantCount}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-zinc-600">Token:</span>
        <span className={debug.tokenMinted ? 'text-green-400' : 'text-red-400'}>
          {debug.tokenMinted ? 'Yes' : 'No'}
        </span>
      </div>
      {debug.lastError && (
        <div className="border-t border-zinc-800 mt-1 pt-1">
          <span className="text-red-400">Error: {debug.lastError}</span>
        </div>
      )}
    </div>
  );
}