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
 * CommandPaletteUI — Immersive Command Execution System
 * Features: Global search, categorized actions, keyboard navigation, visual feedback, shortcut hints
 * Handles: Ctrl/⌘+K to open, Esc to close, arrow keys, Enter, real-time search
 */
export default function CommandPaletteUI() {
  const context = useCommandPalette();
  
  // Fallback if hook not in provider scope
  if (!context) {
    return null;
  }

  const { isOpen, openPalette, closePalette, search, setSearch, groupedActions, filteredActions } = context;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentlyUsed, setRecentlyUsed] = useState([]);
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
          openPalette();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openPalette]);

  if (!isOpen) return null;

  // Flatten actions for navigation
  const flatActions = Object.values(groupedActions).flat();

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closePalette();
      return;
    }

    if (flatActions.length === 0) {
      return;
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
        // Track recently used
        setRecentlyUsed((prev) => {
          const filtered = prev.filter((id) => id !== action.id);
          return [action.id, ...filtered].slice(0, 5);
        });
        action.onExecute();
        closePalette();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab switches between search and actions
      if (e.shiftKey) {
        setSelectedIndex(0);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-start justify-center pt-20 z-[1000] p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closePalette();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-4xl animate-in slide-in-from-top-4 duration-300"
      >
        {/* Immersive panel with Redscar styling */}
        <div className="relative bg-black/95 border-2 border-red-700/60 rounded-lg shadow-2xl shadow-red-500/20 overflow-hidden backdrop-blur-xl">
          {/* Ambient glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/5 via-transparent to-orange-600/5 pointer-events-none" />
          
          {/* Scanline overlay */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(200,68,50,0.03)_0px,rgba(200,68,50,0.03)_1px,transparent_1px,transparent_2px)] pointer-events-none animate-scan" />

          {/* Search Input Header */}
          <div className="relative flex items-center gap-3 px-6 py-4 border-b-2 border-red-700/40 bg-zinc-900/60">
            <h2 id="command-palette-title" className="sr-only">Command palette</h2>
            
            {/* Accent bar */}
            <div className="w-1.5 h-8 bg-gradient-to-b from-red-600 to-red-500 rounded-sm shadow-lg shadow-red-500/30" />
            
            {/* Search icon with glow */}
            <div className="relative">
              <FileSearch className="w-5 h-5 text-red-400" />
              <div className="absolute inset-0 blur-md bg-red-400/30 animate-pulse" />
            </div>
            
            <input
              ref={inputRef}
              type="text"
              placeholder="Command search • Navigation • Execute..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              aria-label="Search commands"
              className="flex-1 bg-transparent text-white text-lg font-mono tracking-wide outline-none placeholder:text-zinc-600 focus:placeholder:text-zinc-700 transition-all"
            />
            
            {search && (
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span className="text-red-400 font-bold">{flatActions.length}</span>
                <span>results</span>
              </div>
            )}
            
            <button
              onClick={closePalette}
              aria-label="Close command palette"
              className="text-zinc-600 hover:text-red-400 transition-all p-2 rounded hover:bg-red-500/10 group"
              title="Close • ESC"
            >
              <X className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Results Grid with Quick Actions */}
          <div className="relative max-h-[65vh] overflow-y-auto command-scrollbar">
            {flatActions.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-900/60 border-2 border-zinc-800 flex items-center justify-center">
                  <FileSearch className="w-8 h-8 text-zinc-700" />
                </div>
                <div className="text-zinc-500 font-mono text-sm mb-2 uppercase tracking-[0.2em]">No Commands Found</div>
                <div className="text-zinc-700 text-xs mb-4">Try a different search term or press ESC to close</div>
                <div className="text-zinc-800 text-[10px] font-mono">Available: <span className="text-zinc-700">{Object.keys(groupedActions).length} categories</span></div>
              </div>
            ) : (
              <div className="p-2">
                {/* Recently Used Section */}
                {recentlyUsed.length > 0 && !search && (
                  <div className="mb-4">
                    <div className="sticky top-0 z-10 px-4 py-2 mb-2 bg-zinc-900/90 backdrop-blur-md border-l-4 border-orange-500/60 rounded flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                      <span className="text-xs font-black text-orange-400 uppercase tracking-[0.25em]">Recently Used</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-orange-500/30 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2">
                      {recentlyUsed.map((actionId) => {
                        const action = flatActions.find((a) => a.id === actionId);
                        if (!action) return null;
                        const globalIdx = flatActions.findIndex((a) => a.id === actionId);
                        const isSelected = globalIdx === selectedIndex;
                        const iconMap = {
                          Home, Calendar, Radio, Users, Map, Box, DollarSign, Settings, FileSearch,
                          PanelRight, MessageSquare, Bell, Zap, AlertTriangle, ClipboardCopy, RotateCcw, Lock,
                          Target, ScrollText, Boxes, Monitor, ClipboardList
                        };
                        const IconComponent = action.icon ? iconMap[action.icon] : Zap;
                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              action.onExecute();
                              closePalette();
                            }}
                            className={`group relative text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                              isSelected
                                ? 'bg-orange-500/20 border-orange-500/70 shadow-lg shadow-orange-500/20 scale-[1.02]'
                                : 'bg-zinc-900/40 border-zinc-800/60 hover:border-orange-700/50 hover:bg-zinc-900/60'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-orange-600/10 via-amber-600/10 to-orange-600/10 animate-pulse pointer-events-none" />
                            )}
                            <div className="relative flex items-start gap-3">
                              <div className={`relative w-10 h-10 flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-orange-500/20 border-orange-500/60' 
                                  : 'bg-zinc-800/60 border-zinc-700/60 group-hover:border-orange-700/40'
                              }`}>
                                <IconComponent className={`w-5 h-5 transition-all ${
                                  isSelected ? 'text-orange-400 scale-110' : 'text-zinc-500 group-hover:text-orange-500'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm tracking-wide truncate mb-1 ${
                                  isSelected ? 'text-white' : 'text-zinc-300'
                                }`}>
                                  {action.label}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {Object.entries(groupedActions).map(([category, actions]) => (
                  <div key={category} className="mb-4">
                    {/* Category Header */}
                    <div className="sticky top-0 z-10 px-4 py-2 mb-2 bg-zinc-900/90 backdrop-blur-md border-l-4 border-red-500/60 rounded flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-black text-red-400 uppercase tracking-[0.25em]">{category}</span>
                      <div className="flex-1 h-px bg-gradient-to-r from-red-500/30 to-transparent" />
                      <span className="text-[10px] font-mono text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded">{actions.length}</span>
                    </div>
                    
                    {/* Actions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2">
                      {actions.map((action) => {
                        const globalIdx = flatActions.findIndex((a) => a.id === action.id);
                        const isSelected = globalIdx === selectedIndex;
                        
                        const iconMap = {
                          Home, Calendar, Radio, Users, Map, Box, DollarSign, Settings, FileSearch,
                          PanelRight, MessageSquare, Bell, Zap, AlertTriangle, ClipboardCopy, RotateCcw, Lock,
                          Target, ScrollText, Boxes, Monitor, ClipboardList
                        };
                        const IconComponent = action.icon ? iconMap[action.icon] : Zap;

                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              action.onExecute();
                              closePalette();
                            }}
                            className={`group relative text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                              isSelected
                                ? 'bg-red-500/20 border-red-500/70 shadow-lg shadow-red-500/20 scale-[1.02]'
                                : 'bg-zinc-900/40 border-zinc-800/60 hover:border-red-700/50 hover:bg-zinc-900/60'
                            }`}
                          >
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-600/10 via-orange-600/10 to-red-600/10 animate-pulse pointer-events-none" />
                            )}
                            
                            <div className="relative flex items-start gap-3">
                              {/* Icon with glow */}
                              <div className={`relative w-10 h-10 flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isSelected 
                                  ? 'bg-red-500/20 border-red-500/60' 
                                  : 'bg-zinc-800/60 border-zinc-700/60 group-hover:border-red-700/40'
                              }`}>
                                <IconComponent className={`w-5 h-5 transition-all ${
                                  isSelected ? 'text-red-400 scale-110' : 'text-zinc-500 group-hover:text-red-500'
                                }`} />
                                {isSelected && (
                                  <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-md animate-pulse" />
                                )}
                              </div>
                              
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm tracking-wide truncate mb-1 ${
                                  isSelected ? 'text-white' : 'text-zinc-300'
                                }`}>
                                  {action.label}
                                </div>
                                {action.description && (
                                  <div className="text-[11px] text-zinc-500 font-mono truncate leading-tight">
                                    {action.description}
                                  </div>
                                )}
                              </div>
                              
                              {/* Shortcut badge */}
                              {action.shortcut && (
                                <div className={`self-start flex-shrink-0 text-[10px] font-mono px-2 py-1 rounded border ${
                                  isSelected 
                                    ? 'text-red-300 bg-red-500/20 border-red-500/40' 
                                    : 'text-zinc-600 bg-zinc-800/50 border-zinc-700/50'
                                }`}>
                                  {action.shortcut}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <style>{`
            .command-scrollbar::-webkit-scrollbar {
              width: 10px;
            }
            .command-scrollbar::-webkit-scrollbar-track {
              background: rgba(0, 0, 0, 0.4);
            }
            .command-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(185, 28, 28, 0.4);
              border-radius: 5px;
              border: 2px solid rgba(0, 0, 0, 0.4);
            }
            .command-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(185, 28, 28, 0.6);
            }
            @keyframes scan {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100%); }
            }
            .animate-scan {
              animation: scan 8s linear infinite;
            }
          `}</style>

          {/* Footer Controls */}
          <div className="relative px-6 py-3 border-t-2 border-red-700/40 bg-zinc-900/60 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center gap-4 text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800/60 border border-zinc-700/60 rounded text-[10px]">↑↓</kbd>
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800/60 border border-zinc-700/60 rounded text-[10px]">⏎</kbd>
                  <span>Execute</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 bg-zinc-800/60 border border-zinc-700/60 rounded text-[10px]">ESC</kbd>
                  <span>Close</span>
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-zinc-600">
                <span className="text-red-400 font-bold">⌘K</span>
                <span>•</span>
                <span className="text-red-400 font-bold">CTRL+K</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}