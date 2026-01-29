import React, { useEffect } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { createPageUrl } from '@/utils';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { getRankLabel, getMembershipLabel, getRoleLabel } from '@/components/constants/labels';
import { Radio, Search, PanelRight, MessageSquare, Mic, Activity, Calendar, Users, Wifi, WifiOff, Zap, Settings, Command, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';
import VerseClock from '@/components/header/VerseClock';

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

  // Telemetry hooks (non-blocking, with safe fallbacks)
  const readinessData = useReadiness();
  const latencyData = useLatency();
  const presenceData = usePresenceRoster();
  const unreadData = useUnreadCounts(user?.id);
  const voiceNet = useVoiceNet();
  const activeOpData = useActiveOp();

  // Extract with safe defaults
  const readiness = readinessData?.state || 'INITIALIZING';
  const reason = readinessData?.reason || 'Starting up...';
  const latencyMs = latencyData?.latencyMs || 0;
  const isHealthy = latencyData?.isHealthy ?? true;
  const onlineCount = presenceData?.onlineCount || 0;
  const unreadByTab = unreadData?.unreadByTab || { comms: 0, polls: 0, riggsy: 0, inbox: 0 };
  const activeEvent = activeOpData?.activeEvent || null;

  if (loading || !user) {
    return (
      <header className="h-16 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4">
        <div className="text-xs text-zinc-600">Loading...</div>
      </header>
    );
  }

  // Admin users have special display
  const isAdmin = user.role === 'admin';
  const rankLabel = isAdmin ? 'System Admin' : getRankLabel(user.rank || 'VAGRANT');

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-zinc-900 via-zinc-925 to-zinc-950 border-b border-orange-500/30 backdrop-blur-xl shadow-lg shadow-orange-500/5 overflow-hidden z-50">
      <div className="h-full px-6 flex items-center justify-between gap-4 overflow-hidden max-w-full">
        {/* Left: Identity — Compact Single-Row */}
        <div className="flex items-center gap-2.5 flex-shrink-0 min-w-max">
          <div className={`w-1.5 h-8 rounded-sm ${isAdmin ? 'bg-gradient-to-b from-red-500 to-red-600' : 'bg-gradient-to-b from-orange-500 to-orange-600'} shadow-lg`} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-wider uppercase leading-none">{user.callsign || 'Nomad'}</span>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${isAdmin ? 'text-red-300 border-red-500/40 bg-red-500/10' : 'text-orange-300 border-orange-500/40 bg-orange-500/10'}`}>{rankLabel}</span>
            {user.membership && <span className="text-[10px] font-mono font-semibold uppercase border rounded px-1.5 py-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/50">{getMembershipLabel(user.membership)}</span>}
          </div>
        </div>

        {/* Center: Active Op + Command Palette */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {activeEvent && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-500/15 to-amber-500/15 rounded border border-orange-500/40 text-xs font-semibold text-orange-200 flex-shrink-0 whitespace-nowrap shadow-sm shadow-orange-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 animate-pulse" />
              <span className="max-w-[150px] truncate">{activeEvent.title}</span>
            </div>
          )}
          <button
            onClick={openPalette}
            className="flex-1 h-8 flex items-center gap-2 px-3 bg-gradient-to-r from-zinc-900/50 via-zinc-900/40 to-zinc-950/50 border border-orange-500/20 hover:border-orange-500/60 text-zinc-500 hover:text-zinc-100 transition-all duration-300 group rounded-md relative overflow-hidden shadow-lg shadow-orange-500/0 hover:shadow-orange-500/20"
            title="Universal Command Palette — Search, navigate, execute • Ctrl+K or Cmd+K"
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/30 to-transparent animate-shimmer pointer-events-none" />
            </div>

            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 rounded-md border border-orange-500/40 shadow-inset shadow-orange-400/20 blur-sm" />
              <div className="absolute inset-0 rounded-md border-2 border-transparent bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-orange-500/20 group-hover:animate-pulse" />
            </div>
            
            <Command className="w-3.5 h-3.5 text-zinc-500 group-hover:text-orange-400 transition-all duration-300 flex-shrink-0 relative z-10 group-hover:scale-110" />
            <span className="text-xs font-semibold tracking-tight uppercase text-zinc-400 group-hover:text-zinc-100 min-w-0 truncate relative z-10 flex-1 text-left transition-colors duration-300">Ctrl+K</span>
            <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-orange-400 transition-all duration-300 flex-shrink-0 relative z-10 opacity-0 group-hover:opacity-100 group-hover:translate-x-1" />
          </button>
        </div>

        {/* Right: Telemetry + Controls — Live Status */}
        <div className="flex items-center gap-2 justify-end flex-shrink-0 min-w-max">
          {/* Verse Clock */}
          <VerseClock />

          {/* Telemetry Chips — Compact */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {voiceNet?.activeNetId && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border h-7 ${
                voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                voiceNet.connectionState === VOICE_CONNECTION_STATE.RECONNECTING ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'
              }`}>
                <Mic className="w-3 h-3" />
                <span className="font-mono text-[11px]">{voiceNet.participants?.length || 0}</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800/50 text-zinc-400 rounded text-xs font-semibold border border-zinc-700/50 h-7">
              <Users className="w-3 h-3" />
              <span className="font-mono text-[11px]">{onlineCount}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold border h-7 ${
              isHealthy ? 'bg-green-500/15 text-green-300 border-green-500/30' : 'bg-red-500/15 text-red-300 border-red-500/30'
            }`}>
              {isHealthy ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="font-mono text-[11px]">{latencyMs}ms</span>
            </div>
          </div>

          <div className="w-px h-5 bg-zinc-700/40" />

          {/* Panel Toggles */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleContextPanel}
              className="h-8 w-8 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/15 transition-all duration-200 rounded"
              title="Voice Control Panel (Right)"
            >
              <Radio className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleCommsDock}
              className="h-8 w-8 text-zinc-500 hover:text-orange-400 hover:bg-orange-500/15 relative transition-all duration-200 rounded"
              title="Text Comms Dock (Bottom)"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadByTab?.comms > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-gradient-to-br from-red-500 to-red-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold leading-none shadow-lg">
                  {unreadByTab.comms > 9 ? '9+' : unreadByTab.comms}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}