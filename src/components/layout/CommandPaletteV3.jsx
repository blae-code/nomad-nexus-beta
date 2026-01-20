import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  Command,
  Search,
  ArrowRight,
  LayoutGrid,
  Calendar,
  Radio,
  Shield,
  Bot,
  Zap,
  Users,
  Coins,
  RotateCcw,
  AlertCircle,
  Plus,
  LogOut,
  User,
  Settings,
  Activity,
  Rocket,
  MessageSquare,
  Star,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  commands,
  COMMAND_SECTIONS,
  filterCommandsByUser,
  searchCommands,
  groupCommandsBySection,
} from '@/components/nav/commands';

// Icon map for dynamic icon rendering
const iconMap = {
  LayoutGrid,
  Calendar,
  Radio,
  Shield,
  Bot,
  Zap,
  Users,
  Coins,
  RotateCcw,
  AlertCircle,
  Plus,
  LogOut,
  User,
  Settings,
  Activity,
  Rocket,
  MessageSquare,
};

export default function CommandPaletteV3() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [recentCommands, setRecentCommands] = useState([]);
  const [pinnedCommands, setPinnedCommands] = useState([]);
  const [confirmingDistress, setConfirmingDistress] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();

  // Fetch user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Load recents and pinned from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('recentCommands');
    if (stored) {
      try {
        setRecentCommands(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load recent commands:', e);
      }
    }

    const pinned = localStorage.getItem('pinnedCommands');
    if (pinned) {
      try {
        setPinnedCommands(JSON.parse(pinned));
      } catch (e) {
        console.error('Failed to load pinned commands:', e);
      }
    }
  }, []);

  // Filter commands by user clearance
  const availableCommands = useMemo(() => {
    return filterCommandsByUser(user);
  }, [user]);

  // Toggle pin
  const togglePin = (cmdId) => {
    const newPinned = pinnedCommands.includes(cmdId)
      ? pinnedCommands.filter((id) => id !== cmdId)
      : [...pinnedCommands, cmdId].slice(0, 5);
    setPinnedCommands(newPinned);
    localStorage.setItem('pinnedCommands', JSON.stringify(newPinned));
  };

  // Search/filter with sections
  const displayCommands = useMemo(() => {
    if (!query.trim()) {
      const result = {};

      // Pinned section
      if (pinnedCommands.length > 0) {
        const pinnedCmds = pinnedCommands
          .map((id) => availableCommands.find((c) => c.id === id))
          .filter(Boolean);
        if (pinnedCmds.length > 0) {
          result['📌 PINNED COMMANDS'] = pinnedCmds;
        }
      }

      // Recent operations section
      if (recentCommands.length > 0) {
        const recentIds = recentCommands.slice(0, 4);
        const recentCmds = recentIds
          .map((id) => availableCommands.find((c) => c.id === id))
          .filter(Boolean);
        if (recentCmds.length > 0) {
          result['⏱ RECENT OPERATIONS'] = recentCmds;
        }
      }

      // All grouped by section
      const allGrouped = groupCommandsBySection(availableCommands);
      return { ...result, ...allGrouped };
    }

    const filtered = searchCommands(query, availableCommands);
    return groupCommandsBySection(filtered);
  }, [query, availableCommands, recentCommands, pinnedCommands]);

  // Flatten for keyboard nav
  const flatCommands = useMemo(() => {
    return Object.values(displayCommands).flat();
  }, [displayCommands]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setConfirmingDistress(false);
      } else if (isOpen && flatCommands.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % flatCommands.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + flatCommands.length) % flatCommands.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const cmd = flatCommands[selectedIndex];
          if (cmd) {
            executeCommand(cmd);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatCommands, selectedIndex]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setConfirmingDistress(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Execute command
  const executeCommand = (cmd) => {
    const newRecents = [
      cmd.id,
      ...recentCommands.filter((id) => id !== cmd.id),
    ].slice(0, 10);
    setRecentCommands(newRecents);
    localStorage.setItem('recentCommands', JSON.stringify(newRecents));

    if (cmd.id === 'action-distress') {
      if (!confirmingDistress) {
        setConfirmingDistress(true);
        return;
      }
    }

    if (cmd.type === 'NAV') {
      window.location.href = createPageUrl(cmd.route);
    } else if (cmd.type === 'ACTION') {
      handleAction(cmd.handler);
    }

    setIsOpen(false);
    setQuery('');
    setConfirmingDistress(false);
  };

  // Action handlers
  const handleAction = (handler) => {
    switch (handler) {
      case 'logout':
        base44.auth.logout();
        break;
      case 'setStatus':
        console.log('Set Status - TODO');
        break;
      case 'sendDistress':
        console.log('Distress sent');
        break;
      case 'createEvent':
        console.log('Create Event - TODO');
        break;
      default:
        console.warn('Unknown handler:', handler);
    }
  };

  // Get icon component
  const getIcon = (iconName) => {
    return iconMap[iconName] || Command;
  };

  // Get current page breadcrumb
  const getCurrentBreadcrumb = () => {
    const path = location.pathname.toLowerCase();
    const breadcrumbs = {
      '/hub': 'COMMAND HUB',
      '/nomadopsdashboard': 'NOMAD OPS',
      '/events': 'OPERATIONS BOARD',
      '/commsconsole': 'COMMS ARRAY',
      '/intelligence': 'INTELLIGENCE',
      '/adminconsole': 'SYSTEM ADMIN',
      '/admin': 'SYSTEM ADMIN',
    };
    return breadcrumbs[path] || 'OPERATIONS';
  };

  return (
    <div ref={containerRef} className="relative max-w-sm">
      {/* Main Input */}
      <div className="relative group">
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-[#ea580c]/0 via-[#ea580c]/20 to-[#ea580c]/0 blur-xl transition-opacity duration-500',
            isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
          )}
        />

        <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
        <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
        <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-zinc-700 group-hover:border-[#ea580c] transition-colors" />
        <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-zinc-700 group-hover:border-[#ea580c] transition-colors" />

        <div
          className={cn(
            'relative flex items-center h-8 bg-zinc-900 border transition-all duration-300 overflow-hidden',
            isOpen ? 'border-[#ea580c] shadow-[0_0_20px_rgba(234,88,12,0.2)]' : 'border-zinc-800 hover:border-zinc-700'
          )}
        >
          <Search className="w-3 h-3 ml-2 mr-2 text-zinc-600" />

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Search commands…"
            className="flex-1 h-full bg-transparent border-none text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
          />

          <div className="mr-2 flex items-center gap-1 text-[9px] font-mono text-zinc-600">
            <Command className="w-2 h-2" />
            <span>K</span>
          </div>
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 shadow-xl overflow-hidden z-50"
            style={{
              backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
              backgroundSize: '100% 2px',
            }}
          >
            {/* Breadcrumb */}
            <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/30 text-[9px] font-mono text-zinc-500 flex items-center gap-2">
              <span className="text-[7px] text-zinc-700">[</span>
              <span className="text-zinc-400">{getCurrentBreadcrumb()}</span>
              <span className="text-[7px] text-zinc-700">]</span>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {flatCommands.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-xs">
                  <p>No commands found</p>
                </div>
              ) : (
                Object.entries(displayCommands).map(([section, cmds]) => (
                  <div key={section}>
                    <div className="px-3 py-2 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                      {section}
                    </div>
                    <div className="space-y-0">
                      {cmds.map((cmd, idx) => {
                        const globalIdx = flatCommands.indexOf(cmd);
                        const isSelected = globalIdx === selectedIndex;
                        const isPinned = pinnedCommands.includes(cmd.id);
                        const Icon = getIcon(cmd.icon);

                        return (
                          <button
                            key={cmd.id}
                            onClick={() => {
                              setSelectedIndex(globalIdx);
                              executeCommand(cmd);
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors group',
                              isSelected
                                ? 'bg-zinc-900 text-[#ea580c] border-l-2 border-[#ea580c]'
                                : 'text-zinc-400 hover:bg-zinc-900/50 border-l-2 border-transparent'
                            )}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span className="text-xs flex-1 font-mono">{cmd.label}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePin(cmd.id);
                              }}
                              className={cn(
                                'shrink-0 p-1 rounded transition-opacity',
                                isPinned ? 'text-[#ea580c]' : 'text-zinc-600 group-hover:text-zinc-500'
                              )}
                              title={isPinned ? 'Unpin' : 'Pin'}
                            >
                              <Star className={cn('w-3 h-3', isPinned && 'fill-[#ea580c]')} />
                            </button>
                            {isSelected && <ArrowRight className="w-3 h-3 text-[#ea580c]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Distress confirmation */}
            {confirmingDistress && (
              <div className="border-t border-zinc-800 bg-red-950/20 p-3 text-center">
                <p className="text-xs text-red-400 mb-2 font-bold">CONFIRM DISTRESS SIGNAL?</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setConfirmingDistress(false)}
                    className="px-2 py-1 text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleAction('sendDistress');
                      setIsOpen(false);
                      setConfirmingDistress(false);
                    }}
                    className="px-2 py-1 text-xs bg-red-900 text-red-100 hover:bg-red-800"
                  >
                    Confirm Send
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="border-t border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[9px] text-zinc-600 font-mono flex items-center justify-between">
              <span>↑↓ navigate • ↵ select • esc close</span>
              <span>READY</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}