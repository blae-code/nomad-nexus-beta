import React, { useState } from 'react';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAudioDevices } from '@/components/voice/hooks/useAudioDevices';
import { useCurrentUser } from '@/components/useCurrentUser';
import { getRankLabel, getMembershipLabel } from '@/components/constants/labels';
import { ChevronDown, X, Radio, Users, Zap, BarChart3, Lock, Mic, Activity, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';
import { useVoiceHealth, formatHealthState, getHealthColor } from '@/components/voice/health/voiceHealth';
import { useVoiceNotifications } from '@/components/voice/notifications/voiceNotifications';
import { FocusedNetConfirmationSheet } from '@/components/voice/components/FocusedNetConfirmation';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { createPageUrl } from '@/utils';
import { BUILD_INFO } from '@/components/constants/buildInfo';
import { Copy, RotateCw } from 'lucide-react';

/**
 * ContextPanel — Right sidebar with systems, contacts, voice controls
 * Supports: collapse/expand, internal scrolling, section toggles
 */
export default function ContextPanel({ isOpen, onClose }) {
  const [expandedSections, setExpandedSections] = useState({
    activeOp: true,
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
  const { inputDevices, selectedDeviceId, selectDevice } = useAudioDevices();
  const voiceHealth = useVoiceHealth(voiceNet, latency);
  const activeOp = useActiveOp();
  
  // Wire notifications
  useVoiceNotifications(voiceNet);

  // Listen for copy diagnostics event
  React.useEffect(() => {
    const handleCopyDiagnostics = () => {
      copyDiagnosticsToClipboard();
    };
    window.addEventListener('nexus:copy-diagnostics', handleCopyDiagnostics);
    return () => window.removeEventListener('nexus:copy-diagnostics', handleCopyDiagnostics);
  }, []);

  const copyDiagnosticsToClipboard = () => {
    const diagnostics = buildDiagnosticsText();
    navigator.clipboard.writeText(diagnostics).then(() => {
      alert('Diagnostics copied to clipboard');
    }).catch((err) => {
      console.error('Failed to copy diagnostics:', err);
      alert('Failed to copy diagnostics');
    });
  };

  const buildDiagnosticsText = () => {
    const lines = [];
    lines.push('=== NOMAD NEXUS DIAGNOSTICS ===');
    lines.push('');
    lines.push(`Build: ${BUILD_INFO.version} (${BUILD_INFO.phase})`);
    lines.push(`Date: ${BUILD_INFO.buildDate}`);
    lines.push('');
    lines.push(`Route: ${getCurrentRoute()}`);
    lines.push('');
    lines.push('--- User ---');
    lines.push(`Callsign: ${user?.callsign || 'Unknown'}`);
    lines.push(`Rank: ${getRankLabel(user?.rank)}`);
    lines.push(`Membership: ${getMembershipLabel(user?.membership)}`);
    lines.push('');
    lines.push('--- Active Op ---');
    if (activeOp.activeEvent) {
      lines.push(`ID: ${activeOp.activeEventId}`);
      lines.push(`Title: ${activeOp.activeEvent.title}`);
      lines.push(`Type: ${activeOp.activeEvent.event_type}`);
      lines.push(`Status: ${activeOp.activeEvent.status}`);
      lines.push(`Participants: ${activeOp.participants.length}`);
      lines.push(`Voice Net: ${activeOp.binding?.voiceNetId || 'none'}`);
      lines.push(`Comms Channel: ${activeOp.binding?.commsChannelId || 'none'}`);
    } else {
      lines.push('No active op');
    }
    lines.push('');
    lines.push('--- Presence ---');
    lines.push(`Online Count: ${onlineCount}`);
    lines.push(`Status: ${loading ? 'Loading' : 'Ready'}`);
    lines.push('');
    lines.push('--- Voice ---');
    lines.push(`Connection: ${voiceNet.connectionState}`);
    lines.push(`Active Net: ${voiceNet.activeNetId || 'none'}`);
    lines.push(`Participants: ${voiceNet.participants.length}`);
    lines.push(`Error: ${voiceNet.error || 'none'}`);
    lines.push('');
    lines.push('--- Telemetry ---');
    lines.push(`Readiness: ${readiness.state}`);
    lines.push(`Latency: ${latency.latencyMs}ms`);
    lines.push('');
    lines.push('--- Shell UI ---');
    lines.push(`SidePanel: ${expandedSections.nets ? 'open' : 'closed'}`);
    lines.push(`ContextPanel: open`);
    lines.push(`CommsDock: ${expandedSections.diagnostics ? 'open' : 'closed'}`);
    lines.push('');
    lines.push('=== END DIAGNOSTICS ===');
    return lines.join('\n');
  };

  // Fetch channels for binding dropdown
  const [channels, setChannels] = React.useState([]);
  React.useEffect(() => {
    async function loadChannels() {
      try {
        const { base44 } = await import('@/api/base44Client');
        const channelList = await base44.entities.Channel.list();
        setChannels(channelList);
      } catch (error) {
        console.error('Failed to load channels:', error);
      }
    }
    loadChannels();
  }, []);

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
        {/* Active Op Section */}
        <SectionHeader
          icon={<Activity className="w-4 h-4" />}
          label={activeOp.activeEvent ? `Active Op` : 'No Active Op'}
          sectionKey="activeOp"
          expanded={expandedSections.activeOp}
          onToggle={toggleSection}
        />
        {expandedSections.activeOp && (
          <div className="px-4 py-3 text-xs text-zinc-400 space-y-2">
            {activeOp.activeEvent ? (
              <>
                <div className="p-2 bg-zinc-800/40 rounded border border-zinc-700/50">
                  <div className="font-mono text-zinc-300 text-sm mb-1">
                    {activeOp.activeEvent.title}
                  </div>
                  <div className="flex gap-2 text-xs text-zinc-500">
                    <span>{activeOp.activeEvent.event_type === 'focused' ? 'Focused' : 'Casual'}</span>
                    <span>•</span>
                    <span>{activeOp.participants.length} participant{activeOp.participants.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-zinc-400 text-xs font-medium">Bound Voice Net</label>
                  <select
                    value={activeOp.binding?.voiceNetId || ''}
                    onChange={(e) => activeOp.bindVoiceNet(e.target.value || null)}
                    className="w-full text-xs px-2 py-1.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                  >
                    <option value="">None</option>
                    {voiceNet.voiceNets.map((net) => (
                      <option key={net.id} value={net.id}>
                        {net.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-zinc-400 text-xs font-medium">Bound Comms Channel</label>
                  <select
                    value={activeOp.binding?.commsChannelId || ''}
                    onChange={(e) => activeOp.bindCommsChannel(e.target.value || null)}
                    className="w-full text-xs px-2 py-1.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                  >
                    <option value="">None</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {activeOp.binding?.voiceNetId && voiceNet.activeNetId !== activeOp.binding.voiceNetId && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      const net = voiceNet.voiceNets.find((n) => n.id === activeOp.binding.voiceNetId);
                      if (net) voiceNet.joinNet(net.id, user);
                    }}
                  >
                    Join Bound Net
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => {
                    window.location.href = createPageUrl('Events');
                  }}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Go to Op
                </Button>
              </>
            ) : (
              <div className="text-zinc-500 text-xs">
                No active operation. Go to Events to activate one.
              </div>
            )}
          </div>
        )}

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
                <div className="p-2 bg-zinc-800/40 rounded border border-zinc-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-mono text-zinc-300">
                      {voiceNet.voiceNets.find((n) => n.id === voiceNet.activeNetId)?.name || 'Unknown'}
                    </div>
                    <div className={`text-xs font-semibold ${getHealthColor(voiceHealth.connectionState)}`}>
                      {formatHealthState(voiceHealth.connectionState)}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    {voiceNet.participants.length} participant{voiceNet.participants.length !== 1 ? 's' : ''}
                    {voiceHealth.reconnectCount > 0 && ` • ${voiceHealth.reconnectCount} reconnect${voiceHealth.reconnectCount !== 1 ? 's' : ''}`}
                  </div>
                  {voiceHealth.lastError && (
                    <div className="mt-2 text-xs text-red-400">
                      {voiceHealth.lastError}
                    </div>
                  )}
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
            {inputDevices.length > 0 && (
              <div className="space-y-1">
                <label className="block text-zinc-400 text-xs font-medium">Device</label>
                <select
                  value={selectedDeviceId || ''}
                  onChange={(e) => selectDevice(e.target.value)}
                  disabled={!voiceNet.activeNetId}
                  className="w-full text-xs px-2 py-1.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 disabled:opacity-50"
                >
                  {inputDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Mic ${inputDevices.indexOf(device) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
            ) : voiceNet.activeNetId && voiceNet.participants.length > 0 ? (
              // Show voice participants when connected
              voiceNet.participants
                .sort((a, b) => {
                  // Speaking first
                  if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
                  // Then alphabetical
                  return (a.callsign || '').localeCompare(b.callsign || '');
                })
                .map((participant) => (
                  <div key={participant.userId} className="p-2 bg-zinc-800/40 rounded border border-zinc-700/50">
                    <div className="flex items-center gap-2">
                      <div className="font-mono text-zinc-300 text-xs flex-1">{participant.callsign}</div>
                      {participant.isSpeaking && (
                        <Mic className="w-3 h-3 text-orange-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                ))
            ) : onlineUsers.length === 0 ? (
              <div className="text-zinc-500">No users online</div>
            ) : (
              // Show online roster when not connected to voice
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
          <div className="px-4 py-3 text-xs text-zinc-400 space-y-3 border-t border-zinc-800/50">
            <div className="space-y-1">
              <div className="text-zinc-500">Build</div>
              <div className="font-mono text-zinc-300 text-xs">{BUILD_INFO.version}</div>
              <div className="font-mono text-zinc-500 text-xs">{BUILD_INFO.phase}</div>
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">Route</div>
              <div className="font-mono text-zinc-300 text-xs">{getCurrentRoute()}</div>
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">User</div>
              <div className="font-mono text-zinc-300 text-xs">{user?.callsign || 'Unknown'}</div>
              <div className="font-mono text-zinc-500 text-xs">{getRankLabel(user?.rank)} • {getMembershipLabel(user?.membership)}</div>
            </div>
            {activeOp.activeEvent && (
              <div className="space-y-1">
                <div className="text-zinc-500">Active Op</div>
                <div className="font-mono text-zinc-300 text-xs truncate">{activeOp.activeEvent.title}</div>
                <div className="font-mono text-zinc-500 text-xs">
                  {activeOp.participants.length} participants
                </div>
              </div>
            )}
            <div className="space-y-1">
              <div className="text-zinc-500">Voice</div>
              <div className={`font-mono text-xs ${voiceNet.connectionState === 'CONNECTED' ? 'text-green-500' : 'text-zinc-500'}`}>
                {voiceNet.connectionState}
              </div>
              {voiceNet.activeNetId && (
                <div className="font-mono text-zinc-500 text-xs">{voiceNet.voiceNets.find(n => n.id === voiceNet.activeNetId)?.name}</div>
              )}
            </div>
            <div className="space-y-1">
              <div className="text-zinc-500">Telemetry</div>
              <div className={`font-mono text-xs ${readiness.state === 'READY' ? 'text-green-500' : 'text-yellow-500'}`}>
                {readiness.state} • {latency.latencyMs}ms
              </div>
              <div className="font-mono text-zinc-500 text-xs">{onlineCount} online</div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-800/50">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-7"
                onClick={copyDiagnosticsToClipboard}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs h-7"
                onClick={() => {
                  if (confirm('Reset UI layout? This will reload the page.')) {
                    localStorage.removeItem('nexus.shell.sidePanelOpen');
                    localStorage.removeItem('nexus.shell.contextPanelOpen');
                    localStorage.removeItem('nexus.shell.commsDockOpen');
                    window.location.reload();
                  }
                }}
              >
                <RotateCw className="w-3 h-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        )}
            </div>

            {/* Focused Net Confirmation Modal */}
            {voiceNet.focusedConfirmation?.needsConfirmation && (
            <FocusedNetConfirmationSheet
            onConfirm={() => {
            const netId = voiceNet.focusedConfirmation.confirm();
            if (netId) {
              voiceNet.joinNet(netId, user);
            }
            }}
            onCancel={() => voiceNet.focusedConfirmation.cancel()}
            />
            )}
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