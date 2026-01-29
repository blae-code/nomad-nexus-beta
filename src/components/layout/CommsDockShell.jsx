import React, { useState } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CommsDockShell({ isOpen, onClose }) {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="bg-zinc-950 border-t border-orange-500/30 flex flex-col h-96 flex-shrink-0">
      {/* Header */}
      <div className="border-b border-orange-500/20 px-6 py-3 flex items-center justify-between bg-zinc-950/80 flex-shrink-0">
        <h3 className="text-xs font-bold uppercase text-orange-400 tracking-widest">Comms Dock</h3>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-8 w-8 text-zinc-500 hover:text-orange-400"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-zinc-500 hover:text-red-400"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 p-6 text-zinc-500 text-sm">
          Comms Dock — placeholder footer
        </div>
      )}
    </div>
  );
}