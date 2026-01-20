import React, { useState, useEffect, useMemo } from 'react';
import { Clock, User as UserIcon, LogOut, Settings, Radio, Wifi } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { Link, useLocation } from 'react-router-dom';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';
import NotificationCenter from '@/components/notifications/NotificationCenter';

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
  const location = useLocation();
  
  // Safe callsign/rank resolution via directory
  const { userById } = useUserDirectory(user?.id ? [user.id] : []);
  const userCallsign = useMemo(() => {
    if (user?.callsign) return user.callsign;
    if (user?.id && userById[user.id]) return userById[user.id].callsign || user.full_name?.split(' ')[0];
    return 'UNKNOWN OPERATIVE';
  }, [user, userById]);

  // Fetch user
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  // Fetch presence count every 15s (pauses if hidden)
  useEffect(() => {
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

    if (isVisible) {
      fetchPresence();
      const interval = setInterval(fetchPresence, 15000);
      return () => clearInterval(interval);
    }
  }, [isVisible, user]);

  // Ping for latency (pauses if hidden)
  useEffect(() => {
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

    if (isVisible) {
      ping();
      const interval = setInterval(ping, 30000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

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
        <div className={cn(
          'flex items-center gap-1.5 px-3 h-10 border rounded-sm text-[9px] font-mono font-bold uppercase shrink-0',
          presenceInfo.color
        )}>
          <div className={cn('w-1.5 h-1.5 rounded-full transition-opacity', presenceInfo.dotColor, 
            userPresence?.is_transmitting && 'animate-pulse'
          )} />
          <span className="hidden md:inline">{presenceInfo.label}</span>
        </div>
      </div>

      {/* CENTER: Command Palette Trigger */}
      <div className="flex-1 flex items-center justify-center max-w-[560px]">
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
            document.dispatchEvent(event);
          }}
          className="w-full flex items-center gap-2 px-3 h-10 border border-zinc-800 bg-zinc-900/40 rounded-sm text-[9px] text-zinc-400 hover:border-zinc-700 focus-visible:border-[#ea580c]/50 focus-visible:ring-1 focus-visible:ring-[#ea580c]/30 transition-all duration-150"
          title="Command/Search protocols, events, nets… (Ctrl+K)"
        >
          <span className="flex-1 text-left">Command / Search protocols…</span>
          <span className="text-[8px] text-zinc-600 shrink-0">⌘K</span>
        </button>
      </div>

      {/* RIGHT: Telemetry + Online Count + Time + User Menu */}
      <div className="flex items-center gap-2 shrink-0">
        {/* NET Status with refresh pulse */}
        <div
          className={cn(
            'flex items-center gap-1 px-2 h-7 border text-[9px] font-mono font-bold uppercase hidden lg:flex transition-all duration-200',
            connectionStatus === 'OPTIMAL'
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
              : 'bg-red-950/30 border-red-700/50 text-red-300'
          )}
        >
          <Wifi className={cn('w-2.5 h-2.5', connectionStatus === 'OPTIMAL' && 'animate-pulse')} />
          <span>{connectionStatus}</span>
          <span className="text-[8px] opacity-60">{latency}ms</span>
        </div>

        {/* Online Count */}
        <div className="flex items-center gap-1.5 px-2 h-7 border border-zinc-700 bg-zinc-900/50 text-[9px] font-mono hidden md:flex focus-within:border-cyan-600 transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-zinc-300">ONLINE: {onlineCount}</span>
        </div>

        {/* Time: Local + UTC in 24h digital style */}
        <div className="hidden xl:flex items-center gap-1 px-3 h-7 border border-zinc-700 bg-zinc-900/50 text-[9px] font-mono text-zinc-400 hover:border-zinc-600 transition-colors group">
          <Clock className="w-2.5 h-2.5" />
          <div className="flex flex-col gap-0.5">
            <span className="font-bold tracking-wider">{time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
            <span className="text-[7px] text-zinc-500 tracking-widest">UTC {time.toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
        </div>

        {/* Notifications */}
        <NotificationCenter user={user} />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={cn(
              'flex items-center gap-1 px-2 h-7 border transition-colors font-bold text-[9px]',
              userMenuOpen
                ? 'bg-zinc-800 border-[#ea580c] text-[#ea580c]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
            )}
            title={user?.full_name}
          >
            <UserIcon className="w-3 h-3" />
            <span className="hidden sm:inline uppercase">{userCallsign}</span>
          </button>

          {userMenuOpen && (
            <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-800 z-50 min-w-max shadow-lg">
              {user && (
                <div className="px-3 py-2 border-b border-zinc-800">
                  <div className="text-xs font-bold text-white">{user.full_name || 'Unknown'}</div>
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
    </header>
  );
}