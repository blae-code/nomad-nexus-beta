import React, { useEffect } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { createPageUrl, isAdminUser } from '@/utils';
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
  const { user: authUser, loading } = useAuth();
  const user = authUser?.member_profile_data || authUser;
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
  const isAdmin = isAdminUser(authUser);
  const rankLabel = isAdmin ? 'System Admin' : getRankLabel(user.rank || 'VAGRANT');

  return (
    <header className="fixed top-0 left-0 right-0 h-12 bg-black/98 border-b-2 border-red-700/50 backdrop-blur-xl shadow-2xl shadow-red-500/10 overflow-hidden z-[800]">
      <div className="h-full px-6 flex items-center justify-between gap-4 overflow-hidden max-w-full">
        {/* Left: Identity — Compact Single-Row */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-max">
          <div className={`w-1 h-6 rounded-sm ${isAdmin ? 'bg-red-500' : 'bg-orange-500'}`} />
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-[0.2em] uppercase leading-none">{user.callsign || 'Nomad'}</span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.15em] px-2 py-0.5 rounded border ${isAdmin ? 'text-red-300 border-red-500/30 bg-red-500/10' : 'text-orange-300 border-orange-500/30 bg-orange-500/10'}`}>{rankLabel}</span>
            {user.membership && <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] border rounded px-2 py-0.5 bg-zinc-900/40 text-zinc-400 border-zinc-800/60">{getMembershipLabel(user.membership)}</span>}
          </div>
        </div>

        {/* Center: Active Op + Command Palette */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {activeEvent && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/15 rounded border border-orange-500/30 text-[10px] font-bold text-orange-300 flex-shrink-0 whitespace-nowrap uppercase tracking-[0.15em]">
              <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
              <span className="max-w-[150px] truncate">{activeEvent.title}</span>
            </div>
          )}
          <button
            onClick={openPalette}
            className="flex-1 h-7 flex items-center gap-2 px-2.5 bg-zinc-900/40 border border-red-700/40 hover:border-red-500/60 text-zinc-500 hover:text-red-300 transition-all group rounded relative"
            title="Command Palette • Ctrl+K"
          >
            <Command className="w-3 h-3 text-red-400 group-hover:text-red-300 transition-all flex-shrink-0 relative z-10" />
            <span className="text-[10px] font-mono font-bold tracking-[0.15em] uppercase text-zinc-400 group-hover:text-zinc-200 min-w-0 truncate relative z-10 flex-1 text-left transition-colors">CMD+K</span>
          </button>
        </div>

        {/* Right: Critical System Status + Controls */}
        <div className="flex items-center gap-2 justify-end flex-shrink-0 min-w-max">
          {/* Verse Clock */}
          <VerseClock />

          {/* Critical Telemetry Bar */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-zinc-900/40 border border-zinc-800/60 rounded">
            {/* Voice Net Status */}
            {voiceNet?.activeNetId ? (
              <div className={`flex items-center gap-1.5 ${
                voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'text-green-400' :
                voiceNet.connectionState === VOICE_CONNECTION_STATE.RECONNECTING ? 'text-orange-400' : 'text-red-400'
              }`}>
                <Radio className="w-3 h-3" />
                <span className="font-mono text-[10px] font-bold">{voiceNet.participants?.length || 0}</span>
                <div className="w-1 h-1 rounded-full bg-current animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-600">
                <Radio className="w-3 h-3" />
                <span className="font-mono text-[10px]">—</span>
              </div>
            )}
            
            <div className="w-px h-3 bg-zinc-700/40" />
            
            {/* Online Members */}
            <div className="flex items-center gap-1.5 text-orange-400">
              <Users className="w-3 h-3" />
              <span className="font-mono text-[10px] font-bold">{onlineCount}</span>
            </div>
            
            <div className="w-px h-3 bg-zinc-700/40" />
            
            {/* Network Health */}
            <div className={`flex items-center gap-1.5 ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
              <Activity className="w-3 h-3" />
              <span className="font-mono text-[10px] font-bold">{latencyMs}<span className="text-[9px] ml-0.5">ms</span></span>
            </div>
          </div>

          <div className="w-px h-4 bg-zinc-700/40" />

          {/* Panel Toggles */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleContextPanel}
              aria-label="Toggle voice control panel"
              className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded"
              title="Voice Control Panel"
            >
              <Radio className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleCommsDock}
              aria-label="Toggle text comms dock"
              className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 relative transition-all rounded"
              title="Text Comms Dock"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {unreadByTab?.comms > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold leading-none animate-pulse">
                  {unreadByTab.comms > 9 ? '9+' : unreadByTab.comms}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.location.href = createPageUrl('Settings')}
              aria-label="Settings"
              className="hidden md:flex h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all rounded"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}