import React, { useEffect, useState, useRef } from 'react';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import { X } from 'lucide-react';

/**
 * CommandPaletteUI — Modal overlay with search, navigation, execution
 * Handles: Ctrl/⌘+K to open, Esc to close, arrow keys, Enter
 */

/**
 * CommandPaletteUI — Modal overlay with search, navigation, execution
 * Handles: Ctrl/⌘+K to open, Esc to close, arrow keys, Enter
 */
export default function CommandPaletteUI() {
  const context = useCommandPalette();
  
  // Fallback if hook not in provider scope
  if (!context) {
    return null;
  }

  const { isOpen, closePalette, search, setSearch, groupedActions } = context;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen, setSearch]);

  // Global keyboard listener: Ctrl/⌘+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/⌘+K to open
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // Open palette is called via Provider
          const palette = document.dispatchEvent(
            new CustomEvent('openCommandPalette', { detail: {} })
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  // Flatten actions for navigation
  const flatActions = Object.values(groupedActions).flat();

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closePalette();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % flatActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + flatActions.length) % flatActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const action = flatActions[selectedIndex];
      if (action) {
        action.onExecute();
        closePalette();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-start justify-center pt-24 z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePalette();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-zinc-950 border-2 border-orange-500/30 rounded-lg shadow-2xl shadow-orange-500/10 w-full max-w-3xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b-2 border-zinc-800 bg-zinc-900/50">
          <div className="w-1 h-6 bg-orange-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-base font-mono tracking-wide outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={closePalette}
            className="text-zinc-600 hover:text-orange-400 transition-colors p-1"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[500px] overflow-y-auto">
          {flatActions.length === 0 ? (
            <div className="px-5 py-12 text-center text-zinc-600 font-mono text-sm">
              NO COMMANDS FOUND
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, actions]) => (
              <div key={category}>
                <div className="px-5 py-2 text-xs font-black text-orange-500/70 uppercase tracking-widest bg-zinc-900/30 border-b border-zinc-800/50">
                  {category}
                </div>
                {actions.map((action, idx) => {
                  const globalIdx = flatActions.findIndex((a) => a.id === action.id);
                  const isSelected = globalIdx === selectedIndex;

                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onExecute();
                        closePalette();
                      }}
                      className={`w-full text-left px-5 py-3 transition-all duration-150 border-l-4 ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500 text-white'
                          : 'hover:bg-zinc-900/50 border-transparent text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      <div className="font-semibold tracking-wide">{action.label}</div>
                      {action.description && (
                        <div className="text-xs text-zinc-500 mt-1 font-mono">{action.description}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-5 py-3 border-t-2 border-zinc-800 bg-zinc-900/30 text-xs text-zinc-600 flex justify-between font-mono">
          <span>↑↓ navigate • ⏎ execute • ESC close</span>
          <span className="hidden sm:inline text-zinc-700">⌘K / CTRL+K</span>
        </div>
      </div>
    </div>
  );
}