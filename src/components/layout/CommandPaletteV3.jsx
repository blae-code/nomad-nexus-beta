import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  Command,
  Search,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
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
  HelpCircle,
  AtSign,
  Gamepad2,
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
import DiagnosticsDrawer from '@/components/diagnostics/DiagnosticsDrawer';

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
  Gamepad2,
  HelpCircle,
  AtSign,
};

export default function CommandPaletteV3() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [user, setUser] = useState(null);
  const [recentCommands, setRecentCommands] = useState([]);
  const [pinnedCommands, setPinnedCommands] = useState([]);
  const [confirmingDistress, setConfirmingDistress] = useState(false);
  const [statusMenu, setStatusMenu] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [commandMode, setCommandMode] = useState(false);
  const [helpMode, setHelpMode] = useState(false);
  const [peopleMode, setPeopleMode] = useState(false);
  const [selectedCommand, setSelectedCommand] = useState(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Extract context from URL
  const contextParams = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      eventId: params.get('id') || params.get('eventId'),
      userId: params.get('userId'),
      channelId: params.get('channelId'),
    };
  }, [location.search]);

  // Fetch most recent event for comms join
  const { data: recentEvent } = useQuery({
    queryKey: ['palette-recent-event'],
    queryFn: async () => {
      const events = await base44.entities.Event.filter(
        { status: ['active', 'pending', 'scheduled'] },
        '-updated_date',
        1
      );
      return events?.[0] || null;
    },
    staleTime: 2 * 60 * 1000, // 2 min cache
  });

  // Fetch current context entity (event or user)
  const { data: contextEntity } = useQuery({
    queryKey: ['palette-context', contextParams.eventId, contextParams.userId],
    queryFn: async () => {
      if (contextParams.eventId) {
        return { type: 'event', data: await base44.entities.Event.get(contextParams.eventId) };
      }
      if (contextParams.userId) {
        return { type: 'user', data: { id: contextParams.userId } };
      }
      return null;
    },
    enabled: !!(contextParams.eventId || contextParams.userId),
  });

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

  // Parse command grammar
  const parseQuery = () => {
    const trimmed = query.trim();
    if (trimmed.startsWith('>')) {
      return { mode: 'command', term: trimmed.slice(1).trim() };
    } else if (trimmed.startsWith('?')) {
      return { mode: 'help', term: trimmed.slice(1).trim() };
    } else if (trimmed.startsWith('@')) {
      return { mode: 'people', term: trimmed.slice(1).trim() };
    }
    return { mode: 'search', term: trimmed };
  };

  const parsedQuery = parseQuery();

  // Build context-aware commands
  const getContextCommands = useMemo(() => {
    if (!contextEntity?.data) return [];

    if (contextEntity.type === 'event') {
      const event = contextEntity.data;
      return [
        {
          id: 'ctx-event-details',
          label: 'Edit Event Details',
          keywords: ['edit', 'event', 'details'],
          icon: 'Calendar',
          handler: 'editEventDetails',
          type: 'ACTION',
          section: 'CONTEXT',
          description: `Edit "${event.title}"`,
          contextId: event.id,
        },
        {
          id: 'ctx-event-invite',
          label: 'Invite Attendees',
          keywords: ['invite', 'add', 'attendees'],
          icon: 'Users',
          handler: 'inviteAttendees',
          type: 'ACTION',
          section: 'CONTEXT',
          description: `Add people to "${event.title}"`,
          contextId: event.id,
        },
        {
          id: 'ctx-event-comms',
          label: 'Configure Comms',
          keywords: ['comms', 'radio', 'voice'],
          icon: 'Radio',
          handler: 'configureComms',
          type: 'ACTION',
          section: 'CONTEXT',
          description: `Setup voice nets for "${event.title}"`,
          contextId: event.id,
        },
        {
          id: 'ctx-event-map',
          label: 'View Tactical Map',
          keywords: ['map', 'tactical', 'location'],
          icon: 'Rocket',
          handler: 'viewMap',
          type: 'ACTION',
          section: 'CONTEXT',
          description: `View operation map for "${event.title}"`,
          contextId: event.id,
        },
      ];
    }

    if (contextEntity.type === 'user') {
      return [
        {
          id: 'ctx-user-profile',
          label: 'View Profile',
          keywords: ['profile', 'user'],
          icon: 'User',
          handler: 'viewUserProfile',
          type: 'ACTION',
          section: 'CONTEXT',
          description: 'View user profile details',
          contextId: contextEntity.data.id,
        },
        {
          id: 'ctx-user-dm',
          label: 'Send Direct Message',
          keywords: ['message', 'dm', 'chat'],
          icon: 'MessageSquare',
          handler: 'sendDM',
          type: 'ACTION',
          section: 'CONTEXT',
          description: 'Send a direct message to this user',
          contextId: contextEntity.data.id,
        },
        {
          id: 'ctx-user-invite-event',
          label: 'Invite to Event',
          keywords: ['invite', 'event', 'mission'],
          icon: 'Calendar',
          handler: 'inviteToEvent',
          type: 'ACTION',
          section: 'CONTEXT',
          description: 'Invite this user to an operation',
          contextId: contextEntity.data.id,
        },
      ];
    }

    return [];
  }, [contextEntity]);

  // Search/filter with sections
  const displayCommands = useMemo(() => {
    // Help mode
    if (parsedQuery.mode === 'help') {
      return {
        'HELP': [
          { id: 'help-ctrl-k', label: 'Ctrl+K', keywords: ['open'], icon: 'Command', handler: 'none', type: 'ACTION', section: 'HELP', description: 'Open/close command palette' },
          { id: 'help-slash', label: '/', keywords: ['command'], icon: 'Radio', handler: 'none', type: 'ACTION', section: 'HELP', description: 'Enter command mode (actions first)' },
          { id: 'help-question', label: '?', keywords: ['help'], icon: 'HelpCircle', handler: 'none', type: 'ACTION', section: 'HELP', description: 'Show this help' },
          { id: 'help-at', label: '@', keywords: ['people'], icon: 'AtSign', handler: 'none', type: 'ACTION', section: 'HELP', description: 'Filter by people/presence' },
        ]
      };
    }

    if (!parsedQuery.term) {
      const result = {};

      // Context section (if applicable)
      if (getContextCommands.length > 0) {
        result['CONTEXT'] = getContextCommands;
      }

      // Pinned section
      if (pinnedCommands.length > 0) {
        const pinnedCmds = pinnedCommands
          .map((id) => availableCommands.find((c) => c.id === id))
          .filter(Boolean);
        if (pinnedCmds.length > 0) {
          result['PINNED'] = pinnedCmds;
        }
      }

      // Recent operations section
      if (recentCommands.length > 0) {
        const recentIds = recentCommands.slice(0, 4);
        const recentCmds = recentIds
          .map((id) => availableCommands.find((c) => c.id === id))
          .filter(Boolean);
        if (recentCmds.length > 0) {
          result['RECENT'] = recentCmds;
        }
      }

      // All grouped by section
      const allGrouped = groupCommandsBySection(availableCommands);
      return { ...result, ...allGrouped };
    }

    // Merge context commands with search results
    const allCmds = [...availableCommands, ...getContextCommands];
    const filtered = searchCommands(parsedQuery.term, allCmds);
    
    // In command mode, prioritize actions
    if (parsedQuery.mode === 'command') {
      const grouped = groupCommandsBySection(filtered);
      const actions = grouped[COMMAND_SECTIONS.ACTIONS] || [];
      const contextActions = (grouped['CONTEXT'] || []);
      const rest = Object.entries(grouped)
        .filter(([key]) => !['ACTIONS', 'CONTEXT'].includes(key))
        .reduce((acc, [key, cmds]) => ({ ...acc, [key]: cmds }), {});
      return { 'CONTEXT': contextActions, 'ACTIONS': actions, ...rest };
    }

    return groupCommandsBySection(filtered);
  }, [parsedQuery, availableCommands, recentCommands, pinnedCommands, getContextCommands]);

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
      // Ctrl/Cmd+K: open/close palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(!isOpen);
        if (!isOpen) {
          setTimeout(() => inputRef.current?.focus(), 0);
        }
      }
      // "/" to open palette in command mode (if not in input)
      else if (e.key === '/' && !isOpen && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setIsOpen(true);
        setQuery('>');
        setCommandMode(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      // Escape: close
      else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        setConfirmingDistress(false);
        setCommandMode(false);
        setHelpMode(false);
        setPeopleMode(false);
      }
      // Arrow keys: navigate
      else if (isOpen && flatCommands.length > 0) {
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
      navigate(createPageUrl(cmd.route));
    } else if (cmd.type === 'ACTION') {
      handleAction(cmd.handler, cmd.contextId);
    }

    setIsOpen(false);
    setQuery('');
    setConfirmingDistress(false);
  };

  // Action handlers
  const handleAction = async (handler, contextId) => {
    switch (handler) {
      case 'logout':
        base44.auth.logout();
        break;
      
      case 'setStatus':
        setStatusMenu(true);
        break;
      
      case 'sendDistress':
        console.log('Distress sent');
        break;
      
      case 'openAdminCockpit':
        navigate(createPageUrl('AdminCockpit'));
        break;

      case 'openDiagnostics':
        setDiagOpen(true);
        setIsOpen(false);
        setQuery('');
        break;
      
      case 'createEvent':
        navigate(createPageUrl('Events'));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openCreateEventForm'));
        }, 100);
        break;
      
      case 'joinComms':
        if (recentEvent) {
          navigate(createPageUrl('CommsConsole') + `?eventId=${recentEvent.id}`);
        } else {
          alert('No active operations found');
        }
        break;

      case 'toggleDemoMode':
        window.dispatchEvent(new CustomEvent('toggleDemoMode'));
        break;

      case 'seedData':
        if (confirm('Populate demo data? This will seed 7 days of sample events.')) {
          window.dispatchEvent(new CustomEvent('seedDemoData'));
        }
        break;

      case 'wipeData':
        if (confirm('WARNING: This will permanently delete ALL operational data. Continue?')) {
          window.dispatchEvent(new CustomEvent('wipeAllData'));
        }
        break;

      // Context-aware event handlers
      case 'editEventDetails':
        navigate(createPageUrl(`Events?id=${contextId}`));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openEditEventForm', { detail: { eventId: contextId } }));
        }, 100);
        break;

      case 'inviteAttendees':
        navigate(createPageUrl(`Events?id=${contextId}`));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openInviteAttendees', { detail: { eventId: contextId } }));
        }, 100);
        break;

      case 'configureComms':
        navigate(createPageUrl(`CommsConsole?eventId=${contextId}`));
        break;

      case 'viewMap':
        navigate(createPageUrl(`Events?id=${contextId}`));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('focusTab', { detail: { tab: 'map' } }));
        }, 100);
        break;

      // Context-aware user handlers
      case 'viewUserProfile':
        navigate(createPageUrl(`Profile?userId=${contextId}`));
        break;

      case 'sendDM':
        navigate(createPageUrl(`Channels?userId=${contextId}`));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openDM', { detail: { userId: contextId } }));
        }, 100);
        break;

      case 'inviteToEvent':
        navigate(createPageUrl('Events'));
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('openCreateEventForm', { detail: { inviteUserId: contextId } }));
        }, 100);
        break;
      
      default:
        console.warn('Unknown handler:', handler);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      const presenceData = {
        user_id: user.id,
        status,
        last_activity: new Date().toISOString(),
      };
      await base44.functions.invoke('updateUserPresence', presenceData);
      setStatusMenu(false);
      setIsOpen(false);
      setQuery('');
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  };

  // Memoize icon map
  const memoizedIconMap = useMemo(() => iconMap, []);

  // Get icon component
  const getIcon = (iconName) => {
    return memoizedIconMap[iconName] || Command;
  };

  // Get current page breadcrumb
  const getCurrentBreadcrumb = () => {
    const path = location.pathname.toLowerCase();
    const breadcrumbs = {
      '/': 'COMMAND HUB',
      '/hub': 'COMMAND HUB',
      '/nomadopsdashboard': 'NOMAD OPS',
      '/events': 'OPERATIONS BOARD',
      '/commsconsole': 'COMMS ARRAY',
      '/intelligence': 'INTELLIGENCE',
      '/admin': 'ADMIN COCKPIT',
      '/universemap': 'TACTICAL MAP',
      '/fleetmanager': 'FLEET MANAGER',
      '/rescue': 'RESCUE SYSTEM',
      '/channels': 'CHANNELS',
      '/profile': 'PROFILE',
    };
    return breadcrumbs[path] || 'OPERATIONS';
  };

  return (
    <>
      <div ref={containerRef} className="relative max-w-2xl flex-1">
      {/* Main Input */}
      <div className="relative group">
        {/* Pulsing outer glow when not open - draws attention */}
        <motion.div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/30 to-accent/0 blur-2xl rounded',
            isOpen ? 'hidden' : 'block'
          )}
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Bright glow when open */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/40 to-accent/0 blur-xl transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
        />

        <div className="absolute -top-[1px] -left-[1px] w-3 h-3 border-t border-l border-zinc-700 group-hover:border-accent transition-colors" />
        <div className="absolute -top-[1px] -right-[1px] w-3 h-3 border-t border-r border-zinc-700 group-hover:border-accent transition-colors" />
        <div className="absolute -bottom-[1px] -left-[1px] w-3 h-3 border-b border-l border-zinc-700 group-hover:border-accent transition-colors" />
        <div className="absolute -bottom-[1px] -right-[1px] w-3 h-3 border-b border-r border-zinc-700 group-hover:border-accent transition-colors" />

        <div
          className={cn(
            'relative flex items-center h-8 bg-zinc-900 border-2 transition-all duration-200 overflow-visible focus-within:border-accent focus-within:shadow-[0_0_25px_hsl(var(--accent)/0.4)]',
            isOpen 
              ? 'border-accent shadow-[0_0_25px_hsl(var(--accent)/0.4)]' 
              : 'border-zinc-800 hover:border-accent/50 group-hover:shadow-[0_0_15px_hsl(var(--accent)/0.2)]'
          )}
        >
          {/* Pulsing chevrons - left side (pointing inward) */}
          <motion.div
            className="absolute right-full top-1/2 -translate-y-1/2 mr-2 flex gap-0.5"
            animate={{ x: [0, -6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronRight className="w-4 h-4 text-accent/40" />
            <ChevronRight className="w-4 h-4 text-accent/60" />
            <ChevronRight className="w-4 h-4 text-accent/80" />
          </motion.div>
          {/* Pulsing chevrons - right side (pointing inward) */}
          <motion.div
            className="absolute left-full top-1/2 -translate-y-1/2 ml-2 flex gap-0.5"
            animate={{ x: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronLeft className="w-4 h-4 text-accent/80" />
            <ChevronLeft className="w-4 h-4 text-accent/60" />
            <ChevronLeft className="w-4 h-4 text-accent/40" />
          </motion.div>
          <Search className="w-3 h-3 ml-2 mr-2 text-zinc-600 pointer-events-none" />

          <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            setSelectedCommand(null);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search / > commands / ? help / @ people"
          className="flex-1 h-full bg-transparent border-none text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
          />

          <div className={cn(
           'mr-2 flex items-center gap-1 text-[9px] font-bold pointer-events-none transition-all',
           isOpen 
             ? 'text-accent' 
             : 'text-zinc-500 group-hover:text-accent'
          )}>
            <span className="text-[8px] font-bold">Ctrl</span>
            <span>+K</span>
          </div>
        </div>
      </div>

      {/* Dropdown - 2-column layout */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 shadow-xl overflow-hidden z-50 flex"
            style={{
              maxHeight: '60vh',
              backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
              backgroundSize: '100% 2px',
            }}
          >
            {/* LEFT: Command List */}
            <div className="flex-1 border-r border-zinc-800 flex flex-col">
              {/* Context Line */}
               <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/30 text-[9px] font-mono text-zinc-500 flex items-center gap-2 shrink-0">
                <span className="text-[7px] text-zinc-700">[</span>
                <span className="text-zinc-400">{getCurrentBreadcrumb()}</span>
                <span className="text-[7px] text-zinc-700">]</span>
              </div>

              <div className="flex-1 overflow-y-auto min-w-0">
              {flatCommands.length === 0 ? (
                <div className="p-8 text-center text-zinc-600 text-xs">
                  <p>No commands found</p>
                </div>
              ) : (
                Object.entries(displayCommands).map(([section, cmds]) => (
                  <div key={section}>
                     <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-600 uppercase tracking-wider border-t border-zinc-800/50">
                       {section}
                     </div>
                     <div className="space-y-0">
                       {cmds.map((cmd, idx) => {
                         const globalIdx = flatCommands.indexOf(cmd);
                         const isSelected = globalIdx === selectedIndex;
                         const isPinned = pinnedCommands.includes(cmd.id);
                         const isContext = section === 'CONTEXT';
                         const Icon = getIcon(cmd.icon);

                         return (
                           <button
                             key={cmd.id}
                             onClick={() => {
                               setSelectedIndex(globalIdx);
                               setSelectedCommand(cmd);
                               executeCommand(cmd);
                             }}
                             onMouseEnter={() => {
                               setSelectedIndex(globalIdx);
                               setSelectedCommand(cmd);
                             }}
                             className={cn(
                               'w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors duration-150 group relative focus:outline-none focus:bg-zinc-900 focus:text-accent focus:border-l-2 focus:border-accent',
                               isContext && 'bg-accent/5 border-l-2 border-accent/30',
                               isSelected
                                 ? cn('bg-zinc-900 text-accent border-l-2 border-accent', isContext && 'bg-accent/20')
                                 : cn('text-zinc-400 hover:bg-zinc-900/50 border-l-2 border-transparent', isContext && 'hover:bg-accent/10')
                             )}
                           >
                             <Icon className={cn('w-3 h-3 shrink-0', isContext && 'text-accent')} />
                             <span className="text-xs flex-1 font-mono truncate">{cmd.label}</span>
                             {isContext && <span className="text-[7px] text-accent uppercase font-bold">CTX</span>}
                             <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 togglePin(cmd.id);
                               }}
                               className={cn(
                                 'shrink-0 p-1 rounded transition-opacity',
                                 isPinned ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-500'
                               )}
                               title={isPinned ? 'Unpin' : 'Pin'}
                             >
                               <Star className={cn('w-2.5 h-2.5', isPinned && 'fill-accent')} />
                             </button>
                           </button>
                         );
                       })}
                    </div>
                  </div>
                ))
              )}
              </div>

              {/* Footer */}
               <div className="border-t border-zinc-800 bg-zinc-900/50 px-3 py-1.5 text-[9px] text-zinc-600 font-mono flex items-center justify-between shrink-0">
                <span>↑↓ nav • Enter select • Esc close</span>
                <span>READY</span>
              </div>
            </div>

            {/* RIGHT: Preview Pane */}
            <div className="w-64 border-l border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 hidden lg:flex">
              {selectedCommand ? (
                <>
                    <div className="px-4 py-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      {(() => {
                        const Icon = getIcon(selectedCommand.icon);
                        return <Icon className="w-4 h-4 text-accent" />;
                      })()}
                      <span className="text-xs font-bold text-white">{selectedCommand.label}</span>
                    </div>
                    <p className="text-[9px] text-zinc-400 leading-relaxed">
                      {selectedCommand.description || 'Execute this command (↵)'}
                    </p>
                  </div>

                  {selectedCommand.shortcut && (
                    <div className="px-4 py-1.5 border-b border-zinc-800/50">
                      <span className="text-[8px] text-zinc-600 uppercase">Shortcut</span>
                      <div className="text-[9px] font-mono text-zinc-300">{selectedCommand.shortcut}</div>
                    </div>
                  )}

                  <div className="px-4 py-1.5 border-b border-zinc-800/50">
                    <span className="text-[8px] text-zinc-600 uppercase">Type</span>
                    <div className="text-[9px] font-mono text-zinc-300">{selectedCommand.type}</div>
                  </div>

                  {selectedCommand.minRank && (
                    <div className="px-4 py-1.5 border-b border-zinc-800/50">
                      <span className="text-[8px] text-zinc-600 uppercase">Min Rank</span>
                      <div className="text-[9px] font-mono text-zinc-300">{selectedCommand.minRank}</div>
                    </div>
                  )}

                  {selectedCommand.route && (
                    <div className="px-4 py-1.5">
                      <span className="text-[8px] text-zinc-600 uppercase">Route</span>
                      <div className="text-[9px] font-mono text-zinc-300">{selectedCommand.route}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center px-4 text-center">
                  <div className="text-[9px] text-zinc-600">Select a command to see details</div>
                </div>
              )}
            </div>

            {/* Status menu */}
             {statusMenu && (
               <div className="border-t border-zinc-800 bg-zinc-900/50 p-2 space-y-0">
                <p className="text-[9px] text-zinc-500 uppercase font-bold mb-2">SET STATUS</p>
                {['online', 'idle', 'in-call', 'away', 'offline'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className="w-full px-2 py-1 text-xs text-left text-zinc-300 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors duration-150 focus:outline-none focus:bg-zinc-800 focus:border-zinc-700"
                  >
                    <span className={cn(
                      'inline-block w-2 h-2 rounded-full mr-2',
                      status === 'online' && 'bg-emerald-500',
                      status === 'idle' && 'bg-yellow-500',
                      status === 'in-call' && 'bg-blue-500',
                      status === 'away' && 'bg-orange-500',
                      status === 'offline' && 'bg-zinc-600'
                    )} />
                    {status.toUpperCase()}
                  </button>
                ))}
              </div>
            )}

            {/* Distress confirmation */}
             {confirmingDistress && (
               <div className="border-t border-zinc-800 bg-red-950/20 p-2 text-center">
                <p className="text-xs text-red-400 mb-2 font-bold">CONFIRM DISTRESS SIGNAL?</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setConfirmingDistress(false)}
                    className="px-2 py-1 text-xs border border-zinc-700 text-zinc-300 hover:bg-zinc-900 focus:outline-none focus:border-zinc-600 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleAction('sendDistress');
                      setIsOpen(false);
                      setConfirmingDistress(false);
                    }}
                    className="px-2 py-1 text-xs bg-red-900 text-red-100 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 transition-colors duration-150"
                  >
                    Confirm Send
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Diagnostics Drawer */}
      <DiagnosticsDrawer isOpen={diagOpen} onClose={() => setDiagOpen(false)} />
    </>
  );
}