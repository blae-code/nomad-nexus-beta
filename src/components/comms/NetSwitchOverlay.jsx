import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function NetSwitchOverlay({ nets, selectedNet, onSelectNet }) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for number keys 1-9
      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < nets.length) {
          e.preventDefault();
          onSelectNet(nets[index]);
          setShowOverlay(true);
          setHighlightedIndex(index);
          setTimeout(() => setShowOverlay(false), 1500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nets, onSelectNet]);

  if (!showOverlay && !selectedNet) return null;

  const topNets = nets.slice(0, 9);
  const selectedIndex = topNets.findIndex(n => n.id === selectedNet?.id);

  return (
    <div className={cn(
      "fixed bottom-20 left-6 z-50 transition-all duration-200",
      showOverlay ? "opacity-100" : "opacity-60"
    )}>
      <div className="bg-black/80 border border-zinc-800 rounded-lg p-4 space-y-2 backdrop-blur-sm">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">NET DIRECTORY</div>
        {topNets.map((net, idx) => (
          <div
            key={net.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded text-xs font-mono transition-all",
              selectedIndex === idx
                ? "bg-[#ea580c] text-white shadow-lg"
                : highlightedIndex === idx
                ? "bg-[#ea580c]/30 text-[#ea580c] border border-[#ea580c]/50"
                : "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900"
            )}
          >
            <span className="font-bold w-4">[{idx + 1}]</span>
            <span className="flex-1">{net.code}</span>
            {net.min_rank_to_tx && (
              <span className="text-[9px] text-zinc-500">{net.min_rank_to_tx}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}