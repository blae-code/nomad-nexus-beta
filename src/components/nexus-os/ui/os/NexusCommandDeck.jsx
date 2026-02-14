import React, { useEffect, useRef, useState } from 'react';
import { NexusButton } from '../primitives';

interface NexusCommandDeckProps {
  open: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => string;
}

export default function NexusCommandDeck({ open, onClose, onRunCommand }: NexusCommandDeckProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (!open) return;
    setCommand('');
    setOutput('');
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const submit = () => {
    const next = command.trim();
    if (!next) return;
    const result = onRunCommand(next);
    setOutput(result);
    setCommand('');
  };

  return (
    <div className="fixed right-0 top-12 bottom-0 w-96 z-[1200] border-l border-zinc-700 bg-zinc-950/95 shadow-2xl backdrop-blur-lg flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-red-400">Command Deck</h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-red-400 transition-colors"
          title="Close (ESC)"
        >
          ✕
        </button>
      </div>

      {/* Command Input */}
      <div className="px-4 py-3 border-b border-zinc-800/60">
        <input
          ref={inputRef}
          value={command}
          onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
            if (event.key === 'Escape') onClose();
          }}
          placeholder="Command: open, preset, variant, op, close..."
          className="w-full h-9 rounded border border-red-700/40 bg-zinc-900/60 px-3 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-red-500/70 focus:outline-none focus:ring-1 focus:ring-red-500/30 transition-all nexus-console-text"
        />
        <div className="mt-2 flex gap-2">
          <NexusButton size="sm" intent="primary" onClick={submit} className="flex-1">
            Execute
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={onClose} className="flex-1">
            Close
          </NexusButton>
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {output ? (
          <div className="text-xs text-zinc-300 rounded border border-red-700/30 bg-red-950/20 px-3 py-2 font-mono">
            {output}
          </div>
        ) : (
          <div className="text-[11px] text-zinc-600 space-y-2">
            <p><span className="text-red-400 font-bold">Examples:</span></p>
            <ul className="space-y-1 text-zinc-500 ml-2">
              <li>open action</li>
              <li>bridge COMMAND</li>
              <li>preset GRID_3_COLUMN</li>
              <li>variant LOOP-03</li>
              <li>op op_123</li>
              <li>suspend</li>
            </ul>
          </div>
        )}
      </div>

      {/* Shortcuts Footer */}
      <div className="border-t border-zinc-800/60 px-4 py-2 text-[10px] text-zinc-600 space-y-1">
        <div><span className="text-red-500 font-mono">Alt+1..7</span> open apps</div>
        <div><span className="text-red-500 font-mono">Ctrl+Shift+P</span> command deck</div>
        <div><span className="text-red-500 font-mono">ESC</span> close</div>
      </div>
    </div>
  );
}