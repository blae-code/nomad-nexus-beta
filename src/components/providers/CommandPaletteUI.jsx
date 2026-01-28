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
  const { isOpen, closePalette, search, setSearch, groupedActions } = useCommandPalette();
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
      className="fixed inset-0 bg-black/50 flex items-start justify-center pt-16 z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePalette();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search commands..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-zinc-600"
          />
          <button
            onClick={closePalette}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {flatActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500">No commands found</div>
          ) : (
            Object.entries(groupedActions).map(([category, actions]) => (
              <div key={category}>
                <div className="px-4 py-2 text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-zinc-800/30">
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
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'hover:bg-zinc-800/50 text-zinc-300'
                      }`}
                    >
                      <div className="font-medium">{action.label}</div>
                      {action.description && (
                        <div className="text-xs text-zinc-500 mt-1">{action.description}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-800/20 text-xs text-zinc-600 flex justify-between">
          <span>↑↓ to navigate • ⏎ to execute • Esc to close</span>
          <span className="hidden sm:inline">Ctrl+K to reopen</span>
        </div>
      </div>
    </div>
  );
}