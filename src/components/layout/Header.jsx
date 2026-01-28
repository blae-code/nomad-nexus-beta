import React, { useEffect } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import { getRankLabel, getMembershipLabel, getRoleLabel } from '@/components/constants/labels';
import { Radio, Search } from 'lucide-react';

/**
 * Header — Control plane v1
 * Single-row layout: Callsign | Rank Badge | Membership Tag | Role Pills | Telemetry | Cmd Palette
 * No horizontal scroll, responsive padding
 */
export default function Header() {
  const { user, loading } = useCurrentUser();
  const paletteContext = useCommandPalette();
  
  // Fallback if hook not in provider scope
  if (!paletteContext) {
    return (
      <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4">
        <div className="text-sm text-zinc-400">Header (palette unavailable)</div>
      </header>
    );
  }

  const { openPalette } = paletteContext;

  // Ctrl/⌘+K global handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openPalette]);

  if (loading || !user) {
    return (
      <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4">
        <div className="text-xs text-zinc-600">Loading...</div>
      </header>
    );
  }

  const rankLabel = getRankLabel(user.rank);
  const membershipLabel = getMembershipLabel(user.membership);
  const roleLabels = (user.roles || []).map(getRoleLabel);

  return (
    <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 backdrop-blur-sm">
      <div className="h-full px-4 flex items-center justify-between gap-4 overflow-hidden">
        {/* Left: Callsign + Badges */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Callsign */}
          <div className="truncate">
            <h1 className="text-lg font-bold text-white tracking-wider">
              {user.callsign || 'Nomad'}
            </h1>
          </div>

          {/* Rank Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/15 border border-orange-500/30 rounded-full text-xs font-semibold text-orange-400 whitespace-nowrap">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
            {rankLabel}
          </div>

          {/* Membership Tag */}
          <div className="hidden sm:flex items-center px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 rounded-full text-xs font-semibold text-blue-400 whitespace-nowrap">
            {membershipLabel}
          </div>

          {/* Role Pills */}
          {roleLabels.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5">
              {roleLabels.slice(0, 2).map((roleLabel) => (
                <span
                  key={roleLabel}
                  className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs font-medium whitespace-nowrap"
                >
                  {roleLabel}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: Telemetry + Command Palette */}
        <div className="flex items-center gap-4 ml-auto">
          {/* Telemetry Strip (placeholder) */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-zinc-500 border-r border-zinc-700 pr-4">
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-green-500" />
              <span>Comms OK</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Ops: 2</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Latency: 24ms</span>
            </div>
          </div>

          {/* Command Palette Trigger */}
          <button
            onClick={openPalette}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
            title="Open command palette (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline text-xs">Ctrl K</span>
          </button>
        </div>
      </div>
    </header>
  );
}