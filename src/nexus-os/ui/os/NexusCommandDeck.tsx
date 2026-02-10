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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1300] w-[min(920px,94vw)] rounded-lg border border-zinc-700 bg-zinc-950/96 shadow-2xl p-3">
      <div className="flex items-center gap-2">
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
          placeholder="Command: open cqb | bridge COMMAND | preset GRID_3_COLUMN | variant CQB-03 | op op_123 | close | suspend"
          className="h-9 flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 text-xs text-zinc-100"
        />
        <NexusButton size="sm" intent="primary" onClick={submit}>
          Run
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={onClose}>
          Close
        </NexusButton>
      </div>
      <div className="mt-2 text-[11px] text-zinc-500">
        Shortcuts: Alt+1..7 open apps, Ctrl/Cmd+Shift+P command deck, Ctrl/Cmd+Shift+S suspend active app.
      </div>
      {output ? <div className="mt-2 text-xs text-zinc-300 rounded border border-zinc-800 bg-zinc-900/55 px-2 py-1">{output}</div> : null}
    </div>
  );
}

