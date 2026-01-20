import React, { useState, useEffect, useMemo } from 'react';
import { Clock, User as UserIcon, LogOut, Settings, Radio, Wifi, AlertCircle, CheckCircle2, Cog } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { Link, useLocation } from 'react-router-dom';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import CommandPaletteV3 from '@/components/layout/CommandPaletteV3';
import { useQuery } from '@tanstack/react-query';

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
  '/events': 'OPERATIONS BOARD',
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

  // Fetch user and initialize presence
  useEffect(() => {
    const initUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Fetch or create user presence
        const presences = await base44.entities.UserPresence.list();
        let userPres = presences.find((p) => p.user_id === currentUser.id);
        
        // Create if doesn't exist
        if (!userPres) {
          userPres = await base44.entities.UserPresence.create({
            user_id: currentUser.id,
            status: 'online',
            last_activity: new Date().toISOString(),
          });
        }
        setUserPresence(userPres);
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
      const presences = await base44.entities.UserPresence.list();
      const online = presences.filter((p) => p.status !== 'offline').length;
      setOnlineCount(online);
      // Store total for display
      window.headerTotalUsers = presences.length;

      // Get current user's presence
      if (user) {
        const userPres = presences.find((p) => p.user_id === user.id);
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

  const handleLogout = () => {
    setUserMenuOpen(false);
    base44.auth.logout();
  };

  // Get current page breadcrumb
  const breadcrumb = PAGE_BREADCRUMBS[location.pathname.toLowerCase()] || 'OPERATIONS';

  // Determine presence pill color/label
  const getPresenceInfo = () => {
    if (!userPresence) return { label: 'OFFLINE', color: 'bg-zinc-600', dotColor: 'bg-zinc-500' };
    
    const status = userPresence.status || 'online';
    const transmitting = userPresence.is_transmitting;
    
    if (transmitting) {
      return { label: 'TRANSMITTING', color: 'bg-red-950/30 border-red-700/50 text-red-300', dotColor: 'bg-red-500' };
    }
    
    switch (status) {
      case 'in-call':
        return { label: 'IN-CALL', color: 'bg-blue-950/30 border-blue-700/50 text-blue-300', dotColor: 'bg-blue-500' };
      case 'online':
        return { label: 'ONLINE', color: 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300', dotColor: 'bg-emerald-500' };
      case 'idle':
        return { label: 'IDLE', color: 'bg-yellow-950/30 border-yellow-700/50 text-yellow-300', dotColor: 'bg-yellow-500' };
      case 'away':
        return { label: 'AWAY', color: 'bg-orange-950/30 border-orange-700/50 text-orange-300', dotColor: 'bg-orange-500' };
      default:
        return { label: 'OFFLINE', color: 'bg-zinc-900/50 border-zinc-700 text-zinc-300', dotColor: 'bg-zinc-600' };
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
    if (!userPresence?.id) {
      console.error('No presence record to update');
      return;
    }
    try {
      const updated = await base44.entities.UserPresence.update(userPresence.id, { 
        status: newStatus,
        last_activity: new Date().toISOString(),
      });
      setUserPresence(updated);
      setStatusMenuOpen(false);
    } catch (e) {
      console.error('Failed to update status:', e);
      alert(`Failed to update status: ${e.message}`);
    }
  };

  return (
    <header className="h-16 shrink-0 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-[var(--gutter)] z-40 gap-3 fixed top-0 left-0 right-0"
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* LEFT: Brand + Callsign + Presence */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        {/* Brand */}
        <div className="flex items-center gap-2 shrink-0">
          <Radio className="w-4 h-4 text-[#ea580c]" />
          <span className="text-[9px] font-black uppercase text-zinc-500 hidden sm:inline tracking-widest">NEXUS</span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-800/50 hidden sm:block" />

        {/* Callsign + Rank */}
        <div className="hidden sm:flex items-baseline gap-2 min-w-0">
          <span className="text-[11px] font-bold uppercase text-zinc-100 truncate tracking-tight">{userCallsign}</span>
          <span className={cn('text-[9px] font-mono', user?.rank ? getRankColorClass(user.rank, 'text') : 'text-zinc-600')}>
            {user?.rank || 'VAGRANT'}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-800/50 hidden sm:block" />

        {/* Status Pill */}
        <div className="relative">
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono font-bold uppercase shrink-0 transition-all duration-100',
              presenceInfo.color,
              'hover:shadow-sm'
            )}
            title="Click to change status"
          >
            <div className={cn('w-1.5 h-1.5 rounded-full', presenceInfo.dotColor, 
              userPresence?.is_transmitting && 'animate-pulse'
            )} />
            <span className="hidden md:inline">{presenceInfo.label}</span>
          </button>

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
      </div>

      {/* CENTER: Command Palette */}
      <div className="flex-1 flex items-center justify-center max-w-[560px]">
        <CommandPaletteV3 />
      </div>



      {/* RIGHT: Telemetry + User Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Connection Status / Diagnostics Trigger */}
        <button
          onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-2 border text-[9px] font-mono font-bold uppercase hidden lg:flex transition-all duration-100 cursor-pointer',
            connectionStatus === 'OPTIMAL'
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-400 hover:border-emerald-600/70'
              : 'bg-red-950/30 border-red-700/50 text-red-400 hover:border-red-600/70',
            netDataTickActive && 'border-[#ea580c]/50 bg-[#ea580c]/10'
          )}
          title="Click for detailed diagnostics"
        >
          <Wifi className="w-2.5 h-2.5" />
          <span>{latency}ms</span>
        </button>

        {/* Online Count */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 border border-zinc-800/50 bg-zinc-900/40 text-[9px] font-mono hidden md:flex transition-colors hover:border-zinc-700/50 text-zinc-500">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <span className="font-bold uppercase tracking-wider">{onlineCount}/{window.headerTotalUsers || onlineCount}</span>
        </div>

        {/* Notifications */}
        <div className="scale-125 origin-right">
          <NotificationCenter user={user} />
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'flex items-center justify-center w-8 h-8 border text-[9px] font-mono transition-all duration-100',
              userMenuOpen
                ? 'bg-[#ea580c]/20 border-[#ea580c]/60 text-[#ea580c]'
                : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-500 hover:border-zinc-700/50 hover:text-zinc-400'
            )}
            title="User Menu"
          >
            <Cog className="w-3.5 h-3.5" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-2 bg-zinc-950 border border-zinc-800/60 z-50 min-w-max overflow-hidden"
              style={{
                backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
                backgroundSize: '100% 2px',
              }}
            >
              {user && (
                <div className="px-2.5 py-1.5 border-b border-zinc-800/40">
                  <div className="text-[9px] font-bold text-white uppercase tracking-tight">{userCallsign}</div>
                  <div className={cn('text-[8px] font-mono', getRankColorClass(user.rank, 'text'))}>
                    {user.rank || 'VAGRANT'}
                  </div>
                </div>
              )}
              <Link
                to={createPageUrl('Profile')}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[9px] text-zinc-400 hover:bg-zinc-900/50 transition-colors whitespace-nowrap border-b border-zinc-800/40"
              >
                <UserIcon className="w-3 h-3" />
                Profile
              </Link>
              <Link
                to={createPageUrl('Profile')}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[9px] text-zinc-400 hover:bg-zinc-900/50 transition-colors whitespace-nowrap border-b border-zinc-800/40"
              >
                <Settings className="w-3 h-3" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[9px] text-zinc-400 hover:bg-zinc-900/50 transition-colors"
              >
                <LogOut className="w-3 h-3" />
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
            <div className="px-2.5 py-1.5 border-b border-zinc-800/40 bg-zinc-900/50">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">diagnostics</span>
                <button
                  onClick={() => setDiagnosticsOpen(false)}
                  className="text-zinc-600 hover:text-zinc-400 text-sm leading-none"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-2.5 space-y-1.5 text-[8px] font-mono">
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
  );
}