import React, { useState } from 'react';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useCurrentUser } from '@/components/useCurrentUser';
import { getRankLabel, getMembershipLabel } from '@/components/constants/labels';
import { ChevronDown, X, Radio, Users, Zap, BarChart3, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

/**
 * ContextPanel — Right sidebar with systems, contacts, voice controls
 * Supports: collapse/expand, internal scrolling, section toggles
 */
export default function ContextPanel({ isOpen, onClose }) {
  const [expandedSections, setExpandedSections] = useState({
    nets: true,
    voice: true,
    contacts: true,
    riggsy: true,
    diagnostics: true,
  });

  // Live telemetry data
  const { onlineUsers, onlineCount, loading } = usePresenceRoster();
  const readiness = useReadiness();
  const latency = useLatency();
  const voiceNet = useVoiceNet();
  const { user } = useCurrentUser();

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-64 bg-zinc-900/90 border-l border-zinc-800 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-4 flex-shrink-0">
        <h2 className="text-sm font-bold uppercase text-zinc-300 tracking-wide">Systems</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 text-zinc-400 hover:text-orange-400"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Active Nets Section */}
        <SectionHeader
          icon={<Radio className="w-4 h-4" />}
          label={`Voice Nets (${voiceNet.participants.length})`}
          sectionKey="nets"
          expanded={expandedSections.nets}
          onToggle={toggleSection}
        />
        {expandedSections.nets && (
          <div className="px-4 py-3 text-xs text-zinc-400 space-y-2">
            {voiceNet.activeNetId ? (
              <>
                <div className="p-2 bg-green-900/20 rounded border border-green-700/50">
                  <div className="font-mono text-green-400">
                    {voiceNet.voiceNets.find((n) => n.id === voiceNet.activeNetId)?.name || 'Unknown'}
                  </div>
                  <div className="text-xs text-green-500 mt-1">
                    {voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED ? 'Connected' : 'Connecting...'}
                    ({voiceNet.participants.length} participants)
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full text-xs"
                  onClick={() => voiceNet.leaveNet()}
                >
                  Leave Net
                </Button>
              </>
            ) : (
              voiceNet.voiceNets.map((net) => {
                const canJoin = canJoinVoiceNet(user, net);
                return (
                  <div key={net.id} className="p-2 bg-zinc-800/40 rounded border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-zinc-300 flex-1">{net.name}</div>
                      {!canJoin && <Lock className="w-3 h-3 text-zinc-500" />}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{net.description}</div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs mt-2"
                      disabled={!canJoin}
                      onClick={() => canJoin && voiceNet.joinNet(net.id, user)}
                      title={!canJoin ? 'Insufficient membership' : ''}
                    >
                      {canJoin ? 'Join' : 'Locked'}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Voice Controls Section */}
        <SectionHeader
          icon={<Zap className="w-4 h-4" />}
          label="Voice Controls"
          sectionKey="voice"
          expanded={expandedSections.voice}
          onToggle={toggleSection}
        />
        {expandedSections.voice && (
          <div className="px-4 py-3 text-xs text-zinc-400 space-y-2">
            <div className="space-y-1">
              <label className="block text-zinc-400 text-xs font-medium">Microphone</label>
              <Button
                size="sm"
                variant={voiceNet.micEnabled ? 'outline' : 'destructive'}
                className="w-full text-xs"
                onClick={() => voiceNet.setMicEnabled(!voiceNet.micEnabled)}
                disabled={!voiceNet.activeNetId}
              >
                {voiceNet.micEnabled ? 'Mic: On' : 'Mic: Off'}
              </Button>
            </div>
            <div className="space-y-1">
              <label className="block text-zinc-400 text-xs font-medium">PTT</label>
              <Button
                size="sm"
                variant={voiceNet.pttActive ? 'default' : 'outline'}
                className="w-full text-xs"
                onClick={() => voiceNet.togglePTT()}
                disabled={!voiceNet.activeNetId}
              >
                {voiceNet.pttActive ? 'PTT: Active' : 'PTT: Ready'}
              </Button>
            </div>
            {voiceNet.error && (
              <div className="p-2 bg-red-900/20 rounded text-red-400 text-xs">
                {voiceNet.error}
              </div>
            )}
          </div>
        )}

        {/* Contacts / Roster Section */}
        <SectionHeader
          icon={<Users className="w-4 h-4" />}
          label={`Roster (${onlineCount})`}
          sectionKey="contacts"
          expanded={expandedSections.contacts}
          onToggle={toggleSection}
        />
        {expandedSections.contacts && (
          <div className="px-4 py-3 text-xs text-zinc-400 space-y-2">
            {loading ? (
              <div className="text-zinc-500">Loading...</div>
            ) : onlineUsers.length === 0 ? (
              <div className="text-zinc-500">No users online</div>
            ) : (
              onlineUsers.map((user) => (
                <div key={user.userId} className="p-2 bg-zinc-800/40 rounded border border-zinc-700/50">
                  <div className="font-mono text-zinc-300 text-xs">{user.callsign}</div>
                  <div className="flex gap-2 text-xs text-zinc-500 mt-1">
                    <span>{getRankLabel(user.rank)}</span>
                    <span>{getMembershipLabel(user.membership)}</span>
                    <span className="ml-auto text-green-500">● Online</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Riggsy / AI Section */}
        <SectionHeader
          icon={<Radio className="w-4 h-4" />}
          label="Riggsy"
          sectionKey="riggsy"
          expanded={expandedSections.riggsy}
          onToggle={toggleSection}
        />
        {expandedSections.riggsy && (
          <div className="px-4 py-3 text-xs text-zinc-400">
            <Button size="sm" variant="outline" className="w-full text-xs" disabled>
              Ask Riggsy
            </Button>
          </div>
        )}

        {/* Diagnostics Section */}
        <SectionHeader
          icon={<BarChart3 className="w-4 h-4" />}
          label="Diagnostics"
          sectionKey="diagnostics"
          expanded={expandedSections.diagnostics}
          onToggle={toggleSection}
        />
        {expandedSections.diagnostics && (
          <div className="px-4 py-3 text-xs text-zinc-400 space-y-2 border-t border-zinc-800/50">
            <div className="space-y-1">
              <div className="text-zinc-500">Route</div>
              <div className="font-mono text-zinc-300 text-xs">{getCurrentRoute()}</div>
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">Readiness</div>
              <div className={`font-mono text-xs ${readiness.state === 'READY' ? 'text-green-500' : readiness.state === 'DEGRADED' ? 'text-yellow-500' : 'text-red-500'}`}>
                {readiness.state}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">Latency</div>
              <div className={`font-mono text-xs ${latency.isHealthy ? 'text-green-500' : 'text-yellow-500'}`}>
                {latency.latencyMs}ms
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">Online Users</div>
              <div className="font-mono text-zinc-300 text-xs">{onlineCount}</div>
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">Build</div>
              <div className="font-mono text-zinc-300 text-xs">Phase 3A</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ icon, label, sectionKey, expanded, onToggle }) {
  return (
    <button
      onClick={() => onToggle(sectionKey)}
      className="w-full px-4 py-3 flex items-center gap-2 border-t border-zinc-800/50 hover:bg-zinc-800/30 transition-colors text-left"
    >
      {icon}
      <span className="text-xs font-semibold uppercase text-zinc-300 flex-1">{label}</span>
      <ChevronDown
        className={`w-3 h-3 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
      />
    </button>
  );
}

function getCurrentRoute() {
  try {
    const path = window.location.pathname;
    const match = path.match(/\/pages\/([^/?]+)/);
    return match ? match[1] : 'Hub';
  } catch {
    return 'Unknown';
  }
}