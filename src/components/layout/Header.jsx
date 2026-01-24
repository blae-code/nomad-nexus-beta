import React, { useState, useEffect } from 'react';
import { Search, Clock, Bell, User as UserIcon, LogOut, Settings, Command, Radio } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { Link } from 'react-router-dom';
import { HEADER_BASE_CLASS, HEADER_SURFACE_STYLE } from '@/components/layout/headerStyles';

/**
 * ⚠️ DEPRECATED: Header (Legacy)
 * 
 * Do not use this component. Use HeaderV3 instead.
 * This component will be removed in a future version.
 * 
 * Header v2: Canonical grid-aligned top bar (56px)
 * - Matches AppShell grid columns exactly (rail / main / right)
 * - Perfect 1px dividers at seams only (no double borders)
 * - Safe data queries (current user only, no privileged data)
 */

export default function Header({ isRailExpanded, showRightPanel }) {
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch current user (safe, already authenticated)
  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Command palette hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('openCommandPalette'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setUserMenuOpen(false);
    base44.auth.logout();
  };

  const railWidth = isRailExpanded ? 'var(--rail-w-expanded)' : 'var(--rail-w-collapsed)';
  const rightWidth = showRightPanel ? '280px' : '0';

  return (
    <header
      className={cn(HEADER_BASE_CLASS, 'z-40')}
      style={{
        ...HEADER_SURFACE_STYLE,
        display: 'grid',
        gridTemplateColumns: `${railWidth} 1fr ${rightWidth}`,
        gap: '0',
      }}
    >
      {/* Col A: Rail column (logo) */}
      <div className="flex items-center justify-center shrink-0 border-r border-zinc-800/70">
        <div className="flex items-center justify-center gap-1">
          <Radio className="w-5 h-5 text-[#ea580c]" />
          <span className="text-[10px] font-black uppercase text-zinc-400 hidden sm:inline">R</span>
        </div>
      </div>

      {/* Col B: Main column (search + command palette) */}
      <div className="flex items-center justify-center gap-3 px-[var(--gutter)]">
        {/* Global Search */}
        <div className="flex-1 max-w-md">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search protocols, events, nets…"
              className={cn(
                'w-full h-8 px-3 py-1 bg-zinc-900 border border-zinc-800 text-xs',
                'placeholder-zinc-600 text-zinc-200',
                'focus:outline-none focus:border-[#ea580c] focus:ring-0',
                'transition-colors'
              )}
            />
            <Search className="absolute right-2 w-4 h-4 text-zinc-600 pointer-events-none" />
          </div>
        </div>

        {/* Command Palette Hint */}
        <button
          onClick={() => document.dispatchEvent(new CustomEvent('openCommandPalette'))}
          className={cn(
            'flex items-center gap-1 px-2 py-1 h-8 shrink-0',
            'bg-zinc-900 border border-zinc-800',
            'text-xs text-zinc-500 font-mono',
            'hover:border-zinc-700 hover:text-zinc-400',
            'transition-colors'
          )}
          title="⌘K / Ctrl+K"
        >
          <Command className="w-3 h-3" />
          <span className="hidden sm:inline">⌘K</span>
        </button>
      </div>

      {/* Col C: Right column (status + time + notifications + user) */}
      {showRightPanel && (
        <div className="flex items-center justify-end gap-3 px-[var(--gutter)] border-l border-zinc-800/70">
          {/* Connection Status */}
          <div className="flex items-center gap-1 h-8 px-2 bg-zinc-900 border border-zinc-800">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">OPTIMAL</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-1 h-8 px-2">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span className="text-[10px] text-zinc-500 font-mono hidden sm:inline">
              {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Notifications */}
          <NotificationCenter user={user} />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'flex items-center gap-1 h-8 px-2 border border-2 transition-colors',
                userMenuOpen
                  ? 'bg-zinc-800 border-[#ea580c] text-[#ea580c]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              )}
            >
              <UserIcon className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase hidden sm:inline">
                {user?.callsign || user?.full_name?.split(' ')[0] || 'OP'}
              </span>
            </button>

            {/* User Menu Dropdown */}
            {userMenuOpen && (
              <div className="absolute top-full right-0 mt-1 bg-zinc-900 border border-zinc-800 z-50 min-w-max">
                <div className="py-1">
                  {user && (
                    <div className="px-3 py-2 border-b border-zinc-800">
                      <div className="text-xs font-bold text-white">{user.full_name || 'Unknown'}</div>
                      <div className={cn('text-[10px] font-mono', getRankColorClass(user.rank, 'text'))}>
                        {user.rank || 'VAGRANT'}
                      </div>
                    </div>
                  )}
                  <Link
                    to={createPageUrl('Profile')}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    <UserIcon className="w-3 h-3" />
                    Profile
                  </Link>
                  <Link
                    to={createPageUrl('Profile')}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
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
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
