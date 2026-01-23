import React, { useState, useEffect, useMemo } from 'react';
import { Clock, User as UserIcon, LogOut, Settings, Radio, Wifi, AlertCircle, CheckCircle2, Cog, Coins, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { base44 } from '@/api/base44Client';
import { formatAUEC } from '@/components/utils/formatCurrency';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { Link, useLocation } from 'react-router-dom';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import CommandPaletteV3 from '@/components/layout/CommandPaletteV3';
import TimeClock from '@/components/layout/TimeClock';
import RitualBonfireWidget from '@/components/dashboard/RitualBonfireWidget';
import { useQuery } from '@tanstack/react-query';
import { useEffect as useReactEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

/**
 * HeaderV3: "Living intranet" command surface
 * - Fixed 56px height, never wraps, never scrolls
 * - Left: brand + callsign + presence pill
 * - Center: command palette trigger
 * - Right: net telemetry, presence overview, time, user menu
 * - Crisp 1px dividers, compact typography
 * - No privileged queries; safe data only
 */

const PAGE_BREADCRUMBS = {
  '/hub': 'COMMAND HUB',
  '/nomadopsdashboard': 'NOMAD OPS',
  '/events': 'OPERATIONS',
  '/commsconsole': 'COMMS ARRAY',
  '/intelligence': 'INTELLIGENCE',
  '/adminconsole': 'SYSTEM ADMIN',
  '/admin': 'SYSTEM ADMIN',
};

export default function HeaderV3() {
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [userPresence, setUserPresence] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('OPTIMAL');
  const [latency, setLatency] = useState(0);
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [netDataTickActive, setNetDataTickActive] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [readinessState, setReadinessState] = useState('green'); // green, amber, red
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const location = useLocation();
  
  // Safe callsign/rank resolution via directory
  const { userById } = useUserDirectory(user?.id ? [user.id] : []);
  const userCallsign = useMemo(() => {
    if (user?.callsign) return user.callsign;
    if (user?.id && userById[user.id]) return userById[user.id].callsign || user.full_name?.split(' ')[0];
    return 'UNKNOWN OPERATIVE';
  }, [user, userById]);

  // Initialize presence via backend function for reliability
  useEffect(() => {
    const initUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        // Fetch all users for total count
        const users = await base44.entities.User.list();
        window.headerTotalUsers = users.length;

        // Initialize presence via backend function
        const response = await base44.functions.invoke('updateUserPresence', {
          status: 'online',
          netId: null,
          eventId: null,
          isTransmitting: false
        });

        if (response.data?.presence) {
          setUserPresence(response.data.presence);
        }

        // Fetch all presences for online count
        const presences = await base44.entities.UserPresence.list();
        const userIds = new Set(users.map(u => u.id));
        const validPresences = presences.filter(p => userIds.has(p.user_id));

        // Count unique online users (only one presence per user)
        const onlineUserIds = new Set(
          validPresences
            .filter((p) => p.status !== 'offline')
            .map(p => p.user_id)
        );
        setOnlineCount(onlineUserIds.size);
      } catch (e) {
        console.error('Failed to initialize presence:', e);
      }
    };

    initUser();
  }, []);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      setUser(event.detail);
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdate);
  }, []);

  // Determine readiness state based on connection/comms health
  useEffect(() => {
    let state = 'green';
    
    // Check connection status
    if (connectionStatus !== 'OPTIMAL') {
      state = 'red';
    }
    
    // Check latency (>150ms = amber, >300ms = red)
    if (latency > 300) {
      state = state === 'red' ? 'red' : 'red';
    } else if (latency > 150) {
      state = state === 'red' ? 'red' : 'amber';
    }
    
    setReadinessState(state);
  }, [connectionStatus, latency]);

  // Track page visibility to pause polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch presence on demand (called from voice channel join)
  const fetchPresence = async () => {
    try {
      const [presences, users] = await Promise.all([
        base44.entities.UserPresence.list(),
        base44.entities.User.list()
      ]);

      const userIds = new Set(users.map(u => u.id));
      const validPresences = presences.filter(p => userIds.has(p.user_id));

      // Count unique online users
      const onlineUserIds = new Set(
        validPresences
          .filter((p) => p.status !== 'offline')
          .map(p => p.user_id)
      );

      setOnlineCount(onlineUserIds.size);
      window.headerTotalUsers = users.length;

      // Get current user's presence
      if (user) {
        const userPres = validPresences.find((p) => p.user_id === user.id);
        setUserPresence(userPres || null);
      }
    } catch (e) {
      console.error('Failed to fetch presence:', e);
    }
  };

  // Expose for manual triggering from voice events
  useEffect(() => {
    window.headerFetchPresence = fetchPresence;
  }, [user]);

  // Subscribe to ALL UserPresence changes for real-time online count
  useEffect(() => {
    if (!user?.id) return;
    
    const unsubscribe = base44.entities.UserPresence.subscribe(async (event) => {
      // Update current user's presence
      if (event.id === userPresence?.id || event.data?.user_id === user.id) {
        setUserPresence(event.data || event);
      }

      // Refresh online count on any presence change
      try {
        const [presences, users] = await Promise.all([
          base44.entities.UserPresence.list(),
          base44.entities.User.list()
        ]);
        
        const userIds = new Set(users.map(u => u.id));
        const validPresences = presences.filter(p => userIds.has(p.user_id));
        
        const onlineUserIds = new Set(
          validPresences
            .filter((p) => p.status !== 'offline')
            .map(p => p.user_id)
        );
        
        setOnlineCount(onlineUserIds.size);
      } catch (e) {
        console.error('Failed to refresh online count:', e);
      }
    });

    return () => unsubscribe?.();
  }, [user?.id, userPresence?.id]);

  // Ping for latency on demand (called from voice channel events)
  const ping = async () => {
    const start = performance.now();
    try {
      await base44.auth.me();
      setLatency(Math.round(performance.now() - start));
      setConnectionStatus('OPTIMAL');
      // Trigger data tick effect
      setNetDataTickActive(true);
      setTimeout(() => setNetDataTickActive(false), 150);
    } catch (e) {
      setConnectionStatus('DEGRADED');
    }
  };

  // Expose for manual triggering from voice events
  useEffect(() => {
    window.headerPing = ping;
  }, []);

  // Heartbeat to keep presence alive and update last_activity
  useEffect(() => {
    if (!user?.id || !userPresence) return;

    const heartbeat = setInterval(async () => {
      try {
        await base44.functions.invoke('updateUserPresence', {
          status: userPresence.status,
          netId: userPresence.net_id || null,
          eventId: userPresence.event_id || null,
          isTransmitting: userPresence.is_transmitting || false
        });
      } catch (e) {
        console.error('[PRESENCE] Heartbeat failed:', e);
      }
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeat);
  }, [user?.id, userPresence?.status, userPresence?.net_id, userPresence?.event_id, userPresence?.is_transmitting]);

  // Set offline on window unload
  useEffect(() => {
    if (!user?.id) return;

    const handleBeforeUnload = () => {
      // Use synchronous beacon to ensure it fires
      if (navigator.sendBeacon && userPresence) {
        const data = new Blob([JSON.stringify({
          status: 'offline',
          netId: null,
          eventId: null,
          isTransmitting: false
        })], { type: 'application/json' });
        navigator.sendBeacon('/api/functions/updateUserPresence', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.id, userPresence]);

  const handleLogout = () => {
    setUserMenuOpen(false);
    base44.auth.logout();
  };

  // Get current page breadcrumb
  const breadcrumb = PAGE_BREADCRUMBS[location.pathname.toLowerCase()] || 'OPERATIONS';

  // Fetch operational context
  const { data: activeEvent } = useQuery({
    queryKey: ['header-active-event', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const events = await base44.entities.Event.filter({ 
        assigned_user_ids: user.id,
        status: ['active', 'pending']
      });
      return events[0] || null;
    },
    enabled: !!user,
    refetchInterval: 15000
  });

  const { data: activeSquadMemberships } = useQuery({
    queryKey: ['header-squad-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.SquadMembership.filter({ 
        user_id: user.id, 
        status: 'active' 
      });
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  const { data: activeNet } = useQuery({
    queryKey: ['header-active-net', userPresence?.net_id],
    queryFn: async () => {
      if (!userPresence?.net_id) return null;
      return await base44.entities.VoiceNet.get(userPresence.net_id);
    },
    enabled: !!userPresence?.net_id,
    refetchInterval: 10000
  });

  // Determine presence pill color/label with operational context
  const getPresenceInfo = () => {
    if (!userPresence) return { 
      label: 'OFFLINE', 
      sublabel: null,
      color: 'bg-zinc-600', 
      dotColor: 'bg-zinc-500' 
    };
    
    const status = userPresence.status || 'online';
    const transmitting = userPresence.is_transmitting;
    
    // Determine operational context sublabel
    let sublabel = null;
    if (activeNet) {
      sublabel = `NET: ${activeNet.code}`;
    } else if (activeEvent) {
      sublabel = `OP: ${activeEvent.title.slice(0, 12)}`;
    } else if (activeSquadMemberships?.length > 0) {
      sublabel = `${activeSquadMemberships.length} SQUAD${activeSquadMemberships.length > 1 ? 'S' : ''}`;
    }
    
    if (transmitting) {
      return { 
        label: 'TRANSMITTING', 
        sublabel,
        color: 'bg-red-950/30 border-red-700/50 text-red-300', 
        dotColor: 'bg-red-500' 
      };
    }
    
    switch (status) {
      case 'in-call':
        return { 
          label: 'IN-CALL', 
          sublabel,
          color: 'bg-blue-950/30 border-blue-700/50 text-blue-300', 
          dotColor: 'bg-blue-500' 
        };
      case 'online':
        return { 
          label: 'ONLINE', 
          sublabel,
          color: 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300', 
          dotColor: 'bg-emerald-500' 
        };
      case 'idle':
        return { 
          label: 'IDLE', 
          sublabel,
          color: 'bg-yellow-950/30 border-yellow-700/50 text-yellow-300', 
          dotColor: 'bg-yellow-500' 
        };
      case 'away':
        return { 
          label: 'AWAY', 
          sublabel,
          color: 'bg-orange-950/30 border-orange-700/50 text-orange-300', 
          dotColor: 'bg-orange-500' 
        };
      default:
        return { 
          label: 'OFFLINE', 
          sublabel: null,
          color: 'bg-zinc-900/50 border-zinc-700 text-zinc-300', 
          dotColor: 'bg-zinc-600' 
        };
    }
  };

  const presenceInfo = getPresenceInfo();

  // Determine ops context based on route
  const getOpsContext = () => {
    const pathname = location.pathname.toLowerCase();
    
    if (pathname.includes('events')) {
      return { label: 'NO ACTIVE OP', value: '—', hint: 'Select operation' };
    }
    if (pathname.includes('comms')) {
      return { label: 'NET STATUS', value: 'IDLE', hint: 'No active net' };
    }
    if (pathname.includes('rescue')) {
      return { label: 'DISTRESS', value: '0', hint: 'No active incidents' };
    }
    return { label: 'NO ACTIVE OP', value: '—', hint: 'Last activity' };
  };

  const opsContext = getOpsContext();

  // Readiness meter colors
  const readinessColors = {
    green: 'bg-emerald-600',
    amber: 'bg-yellow-600',
    red: 'bg-red-600'
  };

  // Dev-only: check header height constraint
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const headerEl = document.querySelector('header');
      if (headerEl && headerEl.offsetHeight !== 56) {
        console.error(`[HEADER] HEIGHT VIOLATION: expected 56px, got ${headerEl.offsetHeight}px`);
      }
      if (document.documentElement.scrollHeight > window.innerHeight) {
        console.warn('[HEADER] SCROLL VIOLATION: document overflow detected');
      }
    }
  }, []);

  const handleStatusChange = async (newStatus) => {
    try {
      // Optimistically update UI first
      const optimisticPresence = { ...userPresence, status: newStatus, last_activity: new Date().toISOString() };
      setUserPresence(optimisticPresence);
      setStatusMenuOpen(false);
      
      // Update via backend function for reliability
      const response = await base44.functions.invoke('updateUserPresence', {
        status: newStatus,
        netId: userPresence?.net_id || null,
        eventId: userPresence?.event_id || null,
        isTransmitting: userPresence?.is_transmitting || false
      });
      
      if (response.data?.presence) {
        setUserPresence(response.data.presence);
      }
      
      // Trigger presence refresh for all users
      if (window.headerFetchPresence) {
        window.headerFetchPresence();
      }
    } catch (e) {
      console.error('Failed to update status:', e);
      // Revert optimistic update on error
      fetchPresence();
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <header className="h-16 shrink-0 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-[var(--gutter)] z-40 gap-3 fixed top-0 left-0 right-0"
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* LEFT: Brand + Callsign + Presence */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        {/* NOMAD NEXUS Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-[#ea580c] border-2 border-[#ea580c] flex items-center justify-center shadow-lg shadow-[#ea580c]/20">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black uppercase tracking-tighter text-white drop-shadow-lg">NOMAD NEXUS</h1>
                <p className="text-[7px] font-mono text-zinc-500 tracking-widest">OPERATIONS</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Nomad Nexus Command & Control</p>
          </TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-10 bg-zinc-800/50" />

        {/* User Identity Badges */}
        <div className="flex flex-col gap-1 shrink-0">
          {/* Row 1: Callsign/Username */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={cn('text-[10px] font-bold', getRankColorClass(user?.rank, 'bg'))}>
                {user?.callsign || user?.rsi_handle || 'OPERATIVE'}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Your Callsign</p>
            </TooltipContent>
          </Tooltip>
          
          {/* Row 2: Rank and Role */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge className="text-[9px] bg-zinc-800 text-zinc-200 border-zinc-700">{user?.rank || 'VAGRANT'}</Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Organization Rank</p>
              </TooltipContent>
            </Tooltip>
            
            {user?.role === 'admin' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="text-[9px] bg-[#ea580c] text-white border-[#ea580c]">ADMIN</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">System Administrator Access</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-800/50 hidden sm:block" />

        {/* Status Pill */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono font-bold uppercase shrink-0 transition-all duration-100',
                  presenceInfo.color,
                  'hover:shadow-sm'
                )}
              >
                <div className={cn('w-1.5 h-1.5 rounded-full', presenceInfo.dotColor, 
                  userPresence?.is_transmitting && 'animate-pulse'
                )} />
                <div className="hidden md:flex flex-col items-start gap-0.5">
                  <span>{presenceInfo.label}</span>
                  {presenceInfo.sublabel && (
                    <span className="text-[7px] text-zinc-500 font-medium tracking-wider">{presenceInfo.sublabel}</span>
                  )}
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Click to change your status</p>
            </TooltipContent>
          </Tooltip>

          {statusMenuOpen && (
            <div className="absolute top-full left-0 mt-2 bg-zinc-950 border border-zinc-800/60 z-50 min-w-max overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
                backgroundSize: '100% 2px',
              }}
            >
              <div className="px-2.5 py-1.5 border-b border-zinc-800/40 bg-zinc-900/60 text-[8px] font-mono text-zinc-600 uppercase tracking-wider">
                presence
              </div>
              <div className="space-y-0 min-w-[140px]">
                {['online', 'idle', 'away', 'offline'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-[9px] transition-colors duration-100 border-l-2',
                      userPresence?.status === status
                        ? 'bg-zinc-900/80 text-[#ea580c] border-l-[#ea580c]'
                        : 'text-zinc-500 hover:bg-zinc-900/40 border-l-transparent hover:text-zinc-400'
                    )}
                  >
                    <div className={cn(
                      'w-1 h-1 rounded-full shrink-0',
                      status === 'online' && 'bg-emerald-500',
                      status === 'idle' && 'bg-yellow-500',
                      status === 'away' && 'bg-orange-500',
                      status === 'offline' && 'bg-zinc-700'
                    )} />
                    <span className="font-mono uppercase">{status}</span>
                  </button>
                ))}
              </div>
              <div className="border-t border-zinc-800/40 bg-zinc-900/60 px-2.5 py-1 text-[7px] text-zinc-700 font-mono uppercase tracking-wider">
                ↵ apply • esc
              </div>
            </div>
          )}
        </div>

        {/* Personal Ledger - Right of Presence */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.08 }}
              onClick={() => window.location.href = createPageUrl('Treasury')}
              className="hover:opacity-90 transition-opacity cursor-pointer group hidden sm:flex"
            >
              <Badge className="text-[10px] bg-[#ea580c]/20 text-[#ea580c] border-2 border-[#ea580c]/50 group-hover:bg-[#ea580c]/30 group-hover:border-[#ea580c] px-3 py-1.5 transition-all flex items-center gap-1.5">
                <Coins className="w-3 h-3" />
                <span className="font-mono font-bold">{formatAUEC(user?.aUEC || 0)}</span>
                <span className="text-[8px] text-[#ea580c]/80">aUEC</span>
              </Badge>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Personal Treasury Balance</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* CENTER: Command Palette */}
      <div className="flex-1 flex items-center justify-center max-w-[560px]">
        <CommandPaletteV3 />
      </div>

      {/* RIGHT: Telemetry + User Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Ritual Bonfire Widget */}
        <RitualBonfireWidget />
        
        {/* Time Clocks */}
        <TimeClock />

        {/* Connection Status / Diagnostics Trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono font-bold uppercase hidden lg:flex transition-all duration-100 cursor-pointer',
                connectionStatus === 'OPTIMAL'
                  ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400 hover:border-emerald-600/70'
                  : 'bg-red-950/30 border-red-700/50 text-red-400 hover:border-red-600/70',
                netDataTickActive && 'border-[#ea580c]/50 bg-[#ea580c]/10'
              )}
            >
              <Wifi className="w-2.5 h-2.5" />
              <span>{latency}ms</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Connection Status · Click for diagnostics</p>
          </TooltipContent>
        </Tooltip>

        {/* Online Count */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2.5 py-2 border border-zinc-800/50 bg-zinc-900/40 text-[9px] font-mono hidden md:flex transition-colors hover:border-zinc-700/50 text-zinc-500">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              <span className="font-bold uppercase tracking-wider">{onlineCount}/{window.headerTotalUsers || onlineCount}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Online Members / Total</p>
          </TooltipContent>
        </Tooltip>

        {/* Notifications */}
        <div className="scale-125 origin-right">
          <NotificationCenter user={user} />
        </div>

        {/* User Menu */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  'flex items-center justify-center w-9 h-9 border text-[10px] font-mono transition-all duration-100',
                  userMenuOpen
                    ? 'bg-[#ea580c]/20 border-[#ea580c]/60 text-[#ea580c]'
                    : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-500 hover:border-zinc-700/50 hover:text-zinc-400'
                )}
              >
                <Cog className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">User Menu & Settings</p>
            </TooltipContent>
          </Tooltip>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-zinc-950 border border-zinc-800/60 z-50 min-w-max overflow-hidden"
              style={{
                backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
                backgroundSize: '100% 2px',
              }}
            >
              {user && (
              <div className="px-3 py-2 border-b border-zinc-800/40">
              <div className="text-[10px] font-bold text-white uppercase tracking-tight">{userCallsign}</div>
              <div className={cn('text-[9px] font-mono', getRankColorClass(user.rank, 'text'))}>
                {user.rank || 'VAGRANT'}
              </div>
              </div>
              )}
              <Link
              to={createPageUrl('Profile')}
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[10px] text-zinc-400 hover:bg-zinc-900/50 transition-colors whitespace-nowrap border-b border-zinc-800/40"
              >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
              </Link>
              <Link
              to={createPageUrl('Profile')}
              onClick={() => setUserMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-[10px] text-zinc-400 hover:bg-zinc-900/50 transition-colors whitespace-nowrap border-b border-zinc-800/40"
              >
              <Settings className="w-3.5 h-3.5" />
              Settings
              </Link>
              <button
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-2 px-3 py-2 text-[10px] text-zinc-400 hover:bg-zinc-900/50 transition-colors"
              >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Panel */}
      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDiagnosticsOpen(false)}>
          <div className="absolute right-0 top-14 w-80 max-h-[calc(100vh-56px)] bg-zinc-950 border border-zinc-800/60 border-t-0 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
              backgroundSize: '100% 2px',
            }}
          >
            <div className="px-3 py-2 border-b border-zinc-800/40 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">diagnostics</span>
                <button
                  onClick={() => setDiagnosticsOpen(false)}
                  className="text-zinc-600 hover:text-zinc-400 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-3 space-y-2 text-[9px] font-mono">
              <div className="flex justify-between text-zinc-500">
                <span className="uppercase tracking-wider">CONN</span>
                <span className={connectionStatus === 'OPTIMAL' ? 'text-emerald-400' : 'text-red-400'}>{connectionStatus}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span className="uppercase tracking-wider">LATENCY</span>
                <span className={latency > 300 ? 'text-red-400' : latency > 150 ? 'text-yellow-400' : 'text-emerald-400'}>{latency}ms</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span className="uppercase tracking-wider">STATUS</span>
                <span className={
                  readinessState === 'green' ? 'text-emerald-400' :
                  readinessState === 'amber' ? 'text-yellow-400' : 'text-red-400'
                }>
                  {readinessState === 'green' ? 'NOMINAL' : readinessState === 'amber' ? 'CAUTION' : 'ALERT'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span className="uppercase tracking-wider">ONLINE</span>
                <span className="text-cyan-400">{onlineCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
    </TooltipProvider>
  );
}