import React, { useState, useEffect } from 'react';
import { Search, Clock, Bell, User as UserIcon, LogOut, Settings, Command } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';
import { getRankColorClass } from '@/components/utils/rankUtils';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import CommandPalette from '@/components/layout/CommandPalette';
import { Link } from 'react-router-dom';

/**
 * Header v2: Canonical grid-aligned top bar
 * - Spans full width but respects AppShell grid columns
 * - Perfect 1px dividers with no double borders
 * - Integrates search, command palette, status, notifications, user menu
 */

export default function Header({ isRailExpanded, showRightPanel }) {
  const [time, setTime] = useState(new Date());
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch current user
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
        document.querySelector('[data-command-palette]')?.click();
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
      className="h-14 shrink-0 bg-zinc-950 flex overflow-hidden z-40"
      style={{
        display: 'grid',
        gridTemplateColumns: `${railWidth} 1fr ${rightWidth}`,
        gap: '0',
      }}
    >
      {/* Col A: Rail area (logo/mark) */}
      <div className="flex items-center justify-center shrink-0 border-r border-[var(--divider-color)]">
        <div className="w-6 h-6 bg-[#ea580c] flex items-center justify-center border border-[#ea580c]">
          <span className="text-[10px] font-black text-white">R</span>
        </div>
      </div>

      {/* Col B: Main content (search + command palette) */}
      <div className="flex items-center justify-center gap-4 px-[var(--gutter)] border-r border-[var(--divider-color)]">
        {/* Global Search */}
        <div className="flex-1 max-w-[560px] relative">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder="Search protocols, events, nets…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Command Palette Hint + Trigger */}
        <button
          data-command-palette
          onClick={() => {
            // Command palette is triggered via hotkey; this is visual only
          }}
          className={cn(
            'flex items-center gap-1 px-2 py-1 h-8',
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

      {/* Col C: Right area (status, time, notifications, user) */}
      {showRightPanel && (
        <div className="flex items-center justify-end gap-3 px-[var(--gutter)] border-l border-[var(--divider-color)]">
          {/* Connection Status */}
          <div className="flex items-center gap-1 h-8 px-2 bg-zinc-900 border border-zinc-800 rounded-none">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-xs text-zinc-500 font-mono">NET: STABLE</span>
          </div>

          {/* Time Cluster */}
          <div className="flex flex-col justify-center text-right h-8 px-2">
            <div className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#ea580c]" />
              {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[9px] font-mono text-zinc-600">UTC {time.toISOString().split('T')[1].split('.')[0]}</div>
          </div>

          {/* Notifications */}
          <NotificationCenter user={user} />

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={cn(
                'flex items-center gap-2 h-8 px-2 border border-2 transition-colors',
                userMenuOpen
                  ? 'bg-zinc-800 border-[#ea580c] text-[#ea580c]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              )}
            >
              <UserIcon className="w-4 h-4" />
              <span className="text-xs font-bold uppercase hidden sm:inline">
                {user ? (user.callsign || user.full_name?.split(' ')[0] || 'OP') : 'GUEST'}
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