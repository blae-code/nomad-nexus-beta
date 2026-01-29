import React, { useEffect } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { getRankLabel, getMembershipLabel, getRoleLabel } from '@/components/constants/labels';
import { Radio, Search, PanelRight, MessageSquare, Mic, Activity, Calendar, Users, Wifi, WifiOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

/**
 * Header — Control plane v1
 * Single-row layout: Callsign | Rank Badge | Membership Tag | Role Pills | Telemetry | Cmd Palette
 * No horizontal scroll, responsive padding
 */
export default function Header() {
  const { user, loading } = useCurrentUser();
  const paletteContext = useCommandPalette();
  const shellUI = useShellUI();
  
  // Fallback if hooks not in provider scope
  if (!paletteContext || !shellUI) {
    return (
      <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4">
        <div className="text-sm text-zinc-400">Header (providers unavailable)</div>
      </header>
    );
  }

  const { openPalette, filteredActions } = paletteContext;
  const { toggleContextPanel, toggleCommsDock } = shellUI;
  const flatActions = filteredActions || [];

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

  // Telemetry hooks (non-blocking)
  const { readiness, reason } = useReadiness();
  const { latencyMs, isHealthy } = useLatency();
  const { onlineCount } = usePresenceRoster();
  const { unreadByTab } = useUnreadCounts(user?.id);
  const voiceNet = useVoiceNet();
  const { activeEvent } = useActiveOp();

  if (loading || !user) {
    return (
      <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4">
        <div className="text-xs text-zinc-600">Loading...</div>
      </header>
    );
  }

  // Admin users have special display
  const isAdmin = user.role === 'admin';
  const rankLabel = isAdmin ? 'System Admin' : getRankLabel(user.rank);
  const membershipLabel = isAdmin ? 'Administrator' : getMembershipLabel(user.membership);
  const roleLabels = isAdmin ? [] : (user.roles || []).map(getRoleLabel);

  // Derive comms status from readiness
  const commsStatus = readiness === 'OPERATIONAL' ? 'Online' : 'Offline';

  return (
    <header className="h-14 bg-zinc-950 border-b border-orange-500/20 backdrop-blur-lg">
      <div className="h-full px-4 flex items-center gap-4">
        {/* Left: Identity */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className={`w-1.5 h-8 ${isAdmin ? 'bg-red-500' : 'bg-orange-500'}`} />
          <div className="flex flex-col leading-none">
            <span className="text-sm font-black text-white tracking-wider uppercase">{user.callsign || 'Nomad'}</span>
            <span className={`text-xs font-mono ${isAdmin ? 'text-red-400' : 'text-orange-400'}`}>{rankLabel}</span>
          </div>
        </div>

        {/* Center: Command Interface */}
        <div className="flex-1 max-w-3xl">
          <button
            onClick={openPalette}
            className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-900/30 border border-zinc-800/50 hover:border-orange-500/50 text-zinc-500 hover:text-zinc-300 transition-all group"
            title="Command palette • Ctrl+K"
          >
            <Search className="w-4 h-4 text-zinc-600 group-hover:text-orange-500 transition-colors" />
            <span className="text-xs font-mono tracking-wider">SEARCH COMMANDS • NAVIGATE • EXECUTE</span>
            <div className="ml-auto flex items-center gap-3">
              {activeEvent && (
                <div className="flex items-center gap-1 text-xs font-mono text-orange-400">
                  <div className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                  <span className="max-w-[120px] truncate">{activeEvent.title}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-700">
                <span>{flatActions.length}</span>
              </div>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-500 border border-zinc-700 rounded">⌘K</kbd>
            </div>
          </button>
        </div>

        {/* Right: System Status & Controls */}
        <div className="flex items-center gap-3 min-w-[280px] justify-end">
          {/* Status Indicators */}
          <div className="flex items-center gap-2 text-xs font-mono">
            {voiceNet.activeNetId && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'bg-green-500/10 text-green-400' :
                voiceNet.connectionState === VOICE_CONNECTION_STATE.RECONNECTING ? 'bg-orange-500/10 text-orange-400' : 'bg-red-500/10 text-red-400'
              }`}>
                <Mic className="w-3 h-3" />
                <span>{voiceNet.participants.length}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 text-zinc-500 rounded">
              <Users className="w-3 h-3" />
              <span>{onlineCount}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${
              isHealthy ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {isHealthy ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{latencyMs}</span>
            </div>
          </div>

          <div className="w-px h-6 bg-zinc-800" />

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleCommsDock}
              className="h-8 w-8 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 relative"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadByTab.comms > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadByTab.comms > 9 ? '9+' : unreadByTab.comms}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleContextPanel}
              className="h-8 w-8 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10"
            >
              <PanelRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}