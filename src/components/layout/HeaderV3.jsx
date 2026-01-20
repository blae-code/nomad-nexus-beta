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
    if (!userPresence) return;
    try {
      await base44.entities.UserPresence.update(userPresence.id, { 
        status: newStatus,
        last_activity: new Date().toISOString(),
      });
      setUserPresence({ ...userPresence, status: newStatus });
      setStatusMenuOpen(false);
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  return (
    <header className="h-14 shrink-0 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-[var(--gutter)] z-40 gap-3 fixed top-0 left-0 right-0"
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.05)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* LEFT: Brand + Callsign + Presence Pill */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        {/* Brand Mark */}
        <div className="flex items-center gap-1.5 shrink-0 h-10">
          <Radio className="w-4 h-4 text-[#ea580c]" />
          <span className="text-[9px] font-black uppercase text-zinc-400 hidden sm:inline tracking-wider">
            NOMAD NEXUS
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-800 hidden sm:block" />

        {/* Callsign + Rank (stacked, baseline-aligned) */}
        <div className="hidden sm:flex items-center h-10 min-w-0">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-zinc-100 uppercase truncate leading-tight">
              {userCallsign}
            </div>
            <div className={cn('text-[9px] uppercase font-mono leading-tight', user?.rank ? getRankColorClass(user.rank, 'text') : 'text-zinc-500')}>
              {user?.rank || 'VAGRANT'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-zinc-800 hidden sm:block" />

        {/* Presence Pill */}
        <div className="relative">
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className={cn(
              'flex items-center gap-1.5 px-3 h-10 border rounded-sm text-[9px] font-mono font-bold uppercase shrink-0 transition-colors',
              presenceInfo.color,
              'hover:opacity-80'
            )}
            title="Click to change status"
          >
            <div className={cn('w-1.5 h-1.5 rounded-full transition-opacity', presenceInfo.dotColor, 
              userPresence?.is_transmitting && 'animate-pulse'
            )} />
            <span className="hidden md:inline">{presenceInfo.label}</span>
          </button>

          {statusMenuOpen && (
            <div className="absolute top-full left-0 mt-1 bg-zinc-950 border border-zinc-800 z-50 min-w-max shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
                backgroundSize: '100% 2px',
              }}
            >
              {/* Header */}
              <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/50 text-[9px] font-mono text-zinc-500">
                SET PRESENCE
              </div>

              {/* Status Options */}
              <div className="space-y-0">
                {['online', 'idle', 'away', 'offline'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors duration-150 border-l-2',
                      userPresence?.status === status
                        ? 'bg-zinc-900 text-[#ea580c] border-l-[#ea580c]'
                        : 'text-zinc-400 hover:bg-zinc-900/50 border-l-transparent hover:text-zinc-300'
                    )}
                  >
                    <div className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      status === 'online' && 'bg-emerald-500',
                      status === 'idle' && 'bg-yellow-500',
                      status === 'away' && 'bg-orange-500',
                      status === 'offline' && 'bg-zinc-600'
                    )} />
                    <span className="font-mono uppercase">{status}</span>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[8px] text-zinc-600 font-mono">
                ↵ select • esc close
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CENTER: Command Palette */}
      <div className="flex-1 flex items-center justify-center max-w-[560px]">
        <CommandPaletteV3 />
      </div>

      {/* CENTER-RIGHT: Ops Context Strip + Readiness Meter */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
       {/* Ops Context + Readiness Meter */}
       <button
         onClick={() => setDiagnosticsOpen(true)}
         className={cn(
           'flex items-center gap-2 px-2.5 h-10 border rounded-sm transition-colors group',
           readinessState === 'green' && 'border-emerald-700/40 bg-emerald-950/20 hover:border-emerald-600/60',
           readinessState === 'amber' && 'border-yellow-700/40 bg-yellow-950/20 hover:border-yellow-600/60',
           readinessState === 'red' && 'border-red-700/40 bg-red-950/20 hover:border-red-600/60'
         )}
         title="System diagnostics: comms, readiness, health"
       >
         <div className={cn('w-1.5 h-1.5 rounded-full', readinessColors[readinessState])} />
         <span className="text-[9px] font-mono text-zinc-500">{opsContext.label}</span>
       </button>
      </div>

      {/* RIGHT: Telemetry + Online Count + Time + User Menu */}
      <div className="flex items-center gap-3 shrink-0">
        {/* NET Status with data tick effect */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-3 h-10 border rounded-sm text-[9px] font-mono font-bold uppercase hidden lg:flex transition-all duration-150',
            connectionStatus === 'OPTIMAL'
              ? 'bg-emerald-950/20 border-emerald-700/40 text-emerald-300'
              : 'bg-red-950/20 border-red-700/40 text-red-300',
            netDataTickActive && 'border-[#ea580c]/60 bg-[#ea580c]/5'
          )}
        >
          <Wifi className="w-2.5 h-2.5" />
          <span>{connectionStatus}</span>
          <span className="text-[8px] opacity-70">{latency}ms</span>
        </div>

        {/* Online Count */}
        <div className="flex items-center gap-1.5 px-3 h-10 border border-zinc-800 bg-zinc-900/30 rounded-sm text-[9px] font-mono hidden md:flex focus-within:border-zinc-700 transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <span className="font-bold text-zinc-300">ONLINE</span>
          <span className="text-zinc-500">{onlineCount}</span>
        </div>

        {/* Time: Local + UTC in 24h digital style */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 h-10 border border-zinc-800 bg-zinc-900/30 rounded-sm text-[9px] font-mono text-zinc-400 hover:border-zinc-700 transition-colors">
          <Clock className="w-2.5 h-2.5" />
          <div className="flex flex-col gap-0">
            <span className="font-bold tracking-wider text-zinc-300">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
            <span className="text-[7px] text-zinc-500 tracking-widest">UTC {time.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
        </div>

        {/* Notifications */}
        <NotificationCenter user={user} />

        {/* Settings Gear */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'flex items-center justify-center h-10 w-10 border transition-colors',
              userMenuOpen
                ? 'bg-[#ea580c]/20 border-[#ea580c]/60 text-[#ea580c]'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
            )}
            title="Settings & Profile"
          >
            <Cog className="w-4 h-4" />
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-800 z-50 min-w-max shadow-lg">
              {user && (
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <div className="text-xs font-bold text-white">{userCallsign}</div>
                      <div className={cn('text-[9px] font-mono', getRankColorClass(user.rank, 'text'))}>
                        {user.rank || 'VAGRANT'}
                      </div>
                    </div>
                  )}
              <Link
                to={createPageUrl('Profile')}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <UserIcon className="w-3 h-3" />
                Profile
              </Link>
              <Link
                to={createPageUrl('Profile')}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors whitespace-nowrap"
              >
                <Settings className="w-3 h-3" />
                Settings
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diagnostics Drawer */}
      {diagnosticsOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDiagnosticsOpen(false)}>
          <div className="absolute right-0 top-14 w-96 max-h-[calc(100vh-56px)] bg-zinc-900 border border-zinc-800 border-t-0 overflow-y-auto shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">SYSTEM DIAGNOSTICS</span>
                <button
                  onClick={() => setDiagnosticsOpen(false)}
                  className="text-zinc-400 hover:text-zinc-300 text-lg leading-none"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1 text-[9px] font-mono text-zinc-400">
                <div className="flex justify-between">
                  <span>CONNECTION:</span>
                  <span className={connectionStatus === 'OPTIMAL' ? 'text-emerald-400' : 'text-red-400'}>{connectionStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span>LATENCY:</span>
                  <span className={latency > 300 ? 'text-red-400' : latency > 150 ? 'text-yellow-400' : 'text-emerald-400'}>{latency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>READINESS:</span>
                  <span className={
                    readinessState === 'green' ? 'text-emerald-400' :
                    readinessState === 'amber' ? 'text-yellow-400' : 'text-red-400'
                  }>
                    {readinessState === 'green' ? 'NOMINAL' : readinessState === 'amber' ? 'CAUTION' : 'ALERT'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>ONLINE:</span>
                  <span className="text-cyan-400">{onlineCount}</span>
                </div>
              </div>
            </div>
            <div className="p-3 space-y-1 text-[8px] text-zinc-500 font-mono">
              <p>📡 Monitor connection health and system status.</p>
              <p>🟢 GREEN: All systems nominal</p>
              <p>🟡 AMBER: Performance degraded (high latency)</p>
              <p>🔴 RED: Critical issues detected</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}