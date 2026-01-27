import { useState } from 'react';
import { useKeybinds } from '@/components/hooks/useKeybinds';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PTTKeybindSettings() {
  const { keybinds, saveKeybind, resetKeybinds, KEYBIND_LABELS, normalizeKey } = useKeybinds();
  const [listeningFor, setListeningFor] = useState(null);
  const [tempKey, setTempKey] = useState(null);

  const handleKeyDown = (action, event) => {
    event.preventDefault();
    const key = normalizeKey(event.key);
    
    // Don't accept certain keys
    if (['Escape', 'Enter'].includes(key)) {
      if (key === 'Escape') {
        setListeningFor(null);
        setTempKey(null);
      }
      return;
    }

    setTempKey(key);
  };

  const confirmKey = (action) => {
    if (tempKey) {
      saveKeybind(action, tempKey);
      setListeningFor(null);
      setTempKey(null);
    }
  };

  const cancelListening = () => {
    setListeningFor(null);
    setTempKey(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">PTT KEYBINDS</h3>
        <button
          onClick={resetKeybinds}
          className="flex items-center gap-1 px-2 py-1 text-[9px] text-zinc-400 hover:text-zinc-300 bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700/50 transition-all"
          title="Reset to defaults"
        >
          <RotateCcw className="w-3 h-3" />
          RESET
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(KEYBIND_LABELS).map(([action, label]) => (
          <div key={action} className="flex items-center justify-between p-2 bg-zinc-900/30 border border-zinc-800/50">
            <span className="text-[9px] font-mono text-zinc-400">{label}</span>
            
            {listeningFor === action ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-red-900/30 border border-red-700/50 rounded-sm">
                  <span className="text-[9px] font-bold text-red-300">
                    {tempKey ? `${tempKey} (Press ENTER to confirm)` : 'Press any key...'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => confirmKey(action)}
                    disabled={!tempKey}
                    className={cn(
                      'px-2 py-1 text-[8px] font-bold uppercase transition-colors',
                      tempKey
                        ? 'bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/50 cursor-pointer'
                        : 'bg-zinc-800/30 border border-zinc-700/50 text-zinc-600 cursor-not-allowed'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && tempKey) {
                        confirmKey(action);
                      }
                    }}
                  >
                    OK
                  </button>
                  <button
                    onClick={cancelListening}
                    className="px-2 py-1 text-[8px] font-bold uppercase bg-zinc-800/30 border border-zinc-700/50 text-zinc-400 hover:text-zinc-300 transition-colors"
                  >
                    ESC
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setListeningFor(action)}
                onKeyDown={(e) => handleKeyDown(action, e)}
                className="px-3 py-1 text-[9px] font-bold text-[#ea580c] bg-[#ea580c]/10 border border-[#ea580c]/30 hover:bg-[#ea580c]/20 rounded-sm transition-colors"
              >
                {keybinds[action]}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="text-[8px] text-zinc-500 space-y-1 pt-2 border-t border-zinc-800/50">
        <p>• Click a key to rebind it</p>
        <p>• Press any key, then confirm with ENTER</p>
        <p>• Press ESC to cancel</p>
      </div>
    </div>
  );
}