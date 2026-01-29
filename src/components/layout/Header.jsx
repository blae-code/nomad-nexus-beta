import React, { useEffect } from 'react';
import { useCurrentUser } from '@/components/useCurrentUser';
import { useCommandPalette } from '@/components/providers/CommandPaletteContext';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { getRankLabel, getMembershipLabel, getRoleLabel } from '@/components/constants/labels';
import { Radio, Search, PanelLeft, PanelRight, MessageSquare, Mic } from 'lucide-react';
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

  const { openPalette } = paletteContext;
  const { toggleSidePanel, toggleContextPanel, toggleCommsDock } = shellUI;

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
  const readiness = useReadiness();
  const latency = useLatency();
  const { onlineCount } = usePresenceRoster();
  const { unreadByTab } = useUnreadCounts(user?.id);
  const voiceNet = useVoiceNet();

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

  // Derive comms status from readiness
  const commsStatus = readiness.state === 'READY' ? 'Online' : 'Offline';

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

        {/* Right: Telemetry + Controls + Command Palette */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Telemetry Strip (live data) */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-zinc-500 border-r border-zinc-700 pr-4">
              <div className="flex items-center gap-1">
                <Radio className={`w-3 h-3 ${readiness.state === 'READY' ? 'text-green-500' : readiness.state === 'DEGRADED' ? 'text-yellow-500' : 'text-red-500'}`} />
                <span>Comms: {commsStatus}</span>
              </div>
              {voiceNet.activeNetId && (
                <div className="flex items-center gap-1">
                  <Mic className={`w-3 h-3 ${
                    voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'text-green-500' : 
                    voiceNet.connectionState === VOICE_CONNECTION_STATE.RECONNECTING ? 'text-orange-500' : 
                    voiceNet.connectionState === VOICE_CONNECTION_STATE.ERROR ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <span>Voice: {
                    voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'Connected' : 
                    voiceNet.connectionState === VOICE_CONNECTION_STATE.RECONNECTING ? 'Reconnecting' : 
                    voiceNet.connectionState === VOICE_CONNECTION_STATE.ERROR ? 'Error' : 'Joining'
                  }{voiceNet.participants.length > 0 ? ` (${voiceNet.participants.length})` : ''}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span>Online: {onlineCount}</span>
              </div>
              <div className="flex items-center gap-1" title={latency.lastMeasuredAt ? `Last: ${new Date(latency.lastMeasuredAt).toLocaleTimeString()}` : 'Measuring...'}>
                <span>Latency: {latency.latencyMs}ms</span>
              </div>
            </div>

          {/* Panel Toggles */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleCommsDock}
              title="Toggle comms dock"
              className="h-9 w-9 text-zinc-400 hover:text-orange-400 relative"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadByTab.comms > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {unreadByTab.comms}
                </span>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSidePanel}
              title="Toggle sidebar (Cmd+Shift+L)"
              className="h-9 w-9 text-zinc-400 hover:text-orange-400"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleContextPanel}
              title="Toggle systems panel (Cmd+Shift+R)"
              className="h-9 w-9 text-zinc-400 hover:text-orange-400"
            >
              <PanelRight className="w-4 h-4" />
            </Button>
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