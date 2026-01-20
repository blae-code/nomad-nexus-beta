import React, { useState, useEffect } from 'react';
import { Command, Bell, User as UserIcon, LogOut, Settings, Radio, Wifi, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import { Link, useLocation } from 'react-router-dom';
import CommandPaletteV3 from './CommandPaletteV3';
import NotificationCenter from '@/components/notifications/NotificationCenter';

/**
 * HeaderV3: Navigation & telemetry surface
 * - Fixed 56px height (h-14)
 * - Prominent Ctrl+K palette trigger + breadcrumb
 * - NET status + latency + ONLINE count
 * - "You" presence pill (Online/In-call/Transmitting)
 * - Page visibility API pauses polling
 */

const PAGE_NAMES = {
  '/hub': 'Hub',
  '/nomadopsdashboard': 'Mission Control',
  '/events': 'Operations',
  '/commsconsole': 'Comms',
  '/intelligence': 'Intelligence',
  '/adminconsole': 'Admin',
  '/': 'Hub',
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
  const location = useLocation();

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

  const utcTime = new Date(time.toLocaleString('en-US', { timeZone: 'UTC' }));

  return (
    <header className="h-14 shrink-0 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-[var(--gutter)] z-40 gap-3">
      {/* Left: Branding + Palette */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <Radio className="w-4 h-4 text-[#ea580c]" />
          <span className="text-[10px] font-black uppercase text-zinc-400 hidden sm:inline tracking-wider">
            NOMAD OPS
          </span>
        </div>

        <div className="hidden sm:block w-px h-6 bg-zinc-800" />

        {/* Command Palette */}
        <div className="flex-1 max-w-sm">
          <CommandPaletteV3 />
        </div>
      </div>

      {/* Right: Telemetry + User */}
      <div className="flex items-center gap-2 shrink-0">
        {/* NET Status */}
        <div
          className={cn(
            'flex items-center gap-1 px-2 h-7 border text-[9px] font-mono font-bold uppercase',
            connectionStatus === 'OPTIMAL'
              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-300'
              : 'bg-red-950/30 border-red-700/50 text-red-300'
          )}
        >
          <Wifi className="w-2.5 h-2.5" />
          <span className="hidden sm:inline">{connectionStatus}</span>
          <span className="hidden lg:inline text-[8px] opacity-60 ml-1">{latency}ms</span>
        </div>

        {/* Presence */}
        <div className="flex items-center gap-1 px-2 h-7 border border-zinc-700 bg-zinc-900/50 text-[9px] font-mono">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="font-bold text-zinc-300">ONLINE: {onlineCount}</span>
        </div>

        {/* Notifications */}
        <NotificationCenter user={user} />

        {/* Time */}
        <div className="hidden lg:flex items-center gap-1 px-2 h-7 border border-zinc-800 bg-zinc-900/50 text-[8px] text-zinc-500 font-mono">
          <Clock className="w-2.5 h-2.5" />
          <span>{time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
        </div>

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
          >
            <UserIcon className="w-3 h-3" />
            <span className="hidden sm:inline uppercase">{user?.callsign || user?.full_name?.split(' ')[0] || 'OP'}</span>
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