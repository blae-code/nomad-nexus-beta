import React, { useEffect, useState, useRef } from 'react';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import {
  X,
  Home,
  Calendar,
  Radio,
  Users,
  Map,
  Box,
  DollarSign,
  Settings,
  FileSearch,
  PanelRight,
  MessageSquare,
  Bell,
  Zap,
  AlertTriangle,
  ClipboardCopy,
  RotateCcw,
  Lock,
  Target,
  ScrollText,
  Boxes,
  Monitor,
  ClipboardList,
} from 'lucide-react';

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

  const { isOpen, closePalette, search, setSearch, groupedActions, filteredActions } = context;
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
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          {flatActions.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="text-zinc-600 font-mono text-sm mb-2">NO COMMANDS FOUND</div>
              <div className="text-zinc-700 text-xs">Try a different search term</div>
            </div>
          ) : (
            Object.entries(groupedActions).map(([category, actions]) => (
              <div key={category}>
                <div className="sticky top-0 px-5 py-2 text-xs font-black text-orange-500/70 uppercase tracking-widest bg-zinc-950/95 backdrop-blur-sm border-b border-zinc-800/50 flex items-center gap-2">
                  <div className="w-0.5 h-3 bg-orange-500/50" />
                  {category}
                  <div className="ml-auto text-zinc-700 font-mono">{actions.length}</div>
                </div>
                {actions.map((action, idx) => {
                  const globalIdx = flatActions.findIndex((a) => a.id === action.id);
                  const isSelected = globalIdx === selectedIndex;
                  
                  const iconMap = {
                    Home, Calendar, Radio, Users, Map, Box, DollarSign, Settings, FileSearch,
                    PanelRight, MessageSquare, Bell, Zap, AlertTriangle, ClipboardCopy, RotateCcw, Lock,
                    Target, ScrollText, Boxes, Monitor, ClipboardList
                  };
                  const IconComponent = action.icon ? iconMap[action.icon] : null;

                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onExecute();
                        closePalette();
                      }}
                      className={`w-full text-left px-5 py-3 transition-all duration-150 border-l-4 flex items-center gap-3 ${
                        isSelected
                          ? 'bg-orange-500/20 border-orange-500 text-white'
                          : 'hover:bg-zinc-900/50 border-transparent text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {IconComponent && (
                        <div className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-orange-400' : 'text-zinc-600'}`}>
                          <IconComponent className="w-full h-full" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold tracking-wide truncate">{action.label}</div>
                        {action.description && (
                          <div className="text-xs text-zinc-500 mt-0.5 font-mono truncate">{action.description}</div>
                        )}
                      </div>
                      {action.shortcut && (
                        <div className="text-xs font-mono text-zinc-600 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700 flex-shrink-0">
                          {action.shortcut}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(24, 24, 27, 0.5);
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(234, 88, 12, 0.3);
            border-radius: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(234, 88, 12, 0.5);
          }
        `}</style>

        {/* Footer Hint */}
        <div className="px-5 py-3 border-t-2 border-zinc-800 bg-zinc-900/30 text-xs text-zinc-600 flex justify-between font-mono">
          <span>↑↓ navigate • ⏎ execute • ESC close</span>
          <span className="hidden sm:inline text-zinc-700">⌘K / CTRL+K</span>
        </div>
      </div>
    </div>
  );
}
