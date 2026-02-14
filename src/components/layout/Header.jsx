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
import { Radio, MessageSquare, Activity, Users, Settings, Command, PanelRightOpen } from 'lucide-react';
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
      </header>);

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
      </header>);

  }

  // Admin users have special display
  const isAdmin = isAdminUser(authUser);
  const rankLabel = isAdmin ? 'System Admin' : getRankLabel(user.rank || 'VAGRANT');

  return null;



















































































































}