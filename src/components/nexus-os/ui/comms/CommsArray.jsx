import React, { useState, useMemo } from 'react';
import { MessageSquare, Users, Radio, Settings, Eye, Zap, Network, ChevronDown, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { NexusButton, NexusBadge } from '../primitives';

/**
 * CommsArray — Integrated communications hub
 * Provides Discord-like channels, presence, topology diagram, and comms controls
 */
export default function CommsArray({
  isOpen,
  bridgeId,
  activeAppId,
  operations,
  focusOperationId,
  trayNotifications,
  unreadCount,
  online,
}) {
  const [activeTab, setActiveTab] = useState('network');
  const [expandedSection, setExpandedSection] = useState('channels');
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // Simulated channel data (in production, would come from backend)
  const channels = useMemo(() => [
    { id: 'general', name: 'general', type: 'text', unread: 0 },
    { id: 'operations', name: 'operations', type: 'text', unread: 2 },
    { id: 'command-net', name: 'command-net', type: 'voice', online: 3 },
    { id: 'logistics', name: 'logistics', type: 'text', unread: 0 },
  ], []);

  // Simulated presence data
  const onlineUsers = useMemo(() => [
    { id: 'ce-warden', callsign: 'CE-Warden', status: 'active', role: 'Commander' },
    { id: 'gce-alpha', callsign: 'GCE-Alpha', status: 'idle', role: 'Operations' },
    { id: 'gce-bravo', callsign: 'GCE-Bravo', status: 'in-call', role: 'Field' },
    { id: 'gce-charlie', callsign: 'GCE-Charlie', status: 'away', role: 'Logistics' },
  ], []);

  const totalUnread = channels.reduce((sum, ch) => sum + (ch.unread || 0), 0);
  const activeVoiceChannels = channels.filter(ch => ch.type === 'voice' && ch.online > 0);

  return (
    <aside className={`nx-comms-array nexus-surface ${isOpen ? 'is-open' : 'is-collapsed'}`}>
      {isOpen && (
        <div className="nx-comms-inner">
          {/* Header */}
          <div className="nx-comms-header">
            <div className="flex items-center gap-2">
              <Network className="w-3.5 h-3.5 text-red-500" />
              <h2 className="text-xs font-black uppercase tracking-[0.15em] text-zinc-100">Comms Array</h2>
            </div>
            <div className="flex items-center gap-1">
              {totalUnread > 0 && (
                <NexusBadge tone="warning" className="text-[10px]">{totalUnread}</NexusBadge>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="nx-comms-tabs">
            <button
              onClick={() => setActiveTab('network')}
              className={`nx-comms-tab ${activeTab === 'network' ? 'is-active' : ''}`}
              title="Comms network topology and channels"
            >
              <Radio className="w-3 h-3" />
              <span>Network</span>
            </button>
            <button
              onClick={() => setActiveTab('presence')}
              className={`nx-comms-tab ${activeTab === 'presence' ? 'is-active' : ''}`}
              title="Online users and status"
            >
              <Users className="w-3 h-3" />
              <span>Presence</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`nx-comms-tab ${activeTab === 'settings' ? 'is-active' : ''}`}
              title="Notifications and audio settings"
            >
              <Settings className="w-3 h-3" />
              <span>Config</span>
            </button>
          </div>

          {/* Network Tab — Topology & Channels */}
          {activeTab === 'network' && (
            <div className="nx-comms-content">
              {/* Topology Diagram */}
              <div className="nx-comms-topology">
                <svg viewBox="0 0 200 100" className="w-full h-auto">
                  {/* Central hub */}
                  <circle cx="100" cy="50" r="12" className="fill-red-600/40 stroke-red-500 stroke-1" />
                  <text x="100" y="55" textAnchor="middle" className="text-[8px] fill-red-300 font-bold">
                    HUB
                  </text>

                  {/* Voice nets */}
                  <circle cx="40" cy="30" r="8" className="fill-blue-600/30 stroke-blue-500 stroke-1" />
                  <line x1="92" y1="42" x2="48" y2="32" className="stroke-blue-400 stroke-[0.5] opacity-50" />
                  <text x="40" y="50" textAnchor="middle" className="text-[7px] fill-blue-300">VOICE</text>

                  {/* Text channels */}
                  <circle cx="160" cy="30" r="8" className="fill-green-600/30 stroke-green-500 stroke-1" />
                  <line x1="108" y1="42" x2="152" y2="32" className="stroke-green-400 stroke-[0.5] opacity-50" />
                  <text x="160" y="50" textAnchor="middle" className="text-[7px] fill-green-300">TEXT</text>

                  {/* Operations ops */}
                  <circle cx="100" cy="80" r="8" className="fill-orange-600/30 stroke-orange-500 stroke-1" />
                  <line x1="100" y1="62" x2="100" y2="72" className="stroke-orange-400 stroke-[0.5]" />
                  <text x="100" y="95" textAnchor="middle" className="text-[7px] fill-orange-300">OPS</text>

                  {/* Participants */}
                  <circle cx="30" cy="70" r="6" className="fill-zinc-600/50 stroke-zinc-400 stroke-1" />
                  <line x1="92" y1="58" x2="36" y2="74" className="stroke-zinc-500 stroke-[0.5] opacity-30" />

                  <circle cx="170" cy="70" r="6" className="fill-zinc-600/50 stroke-zinc-400 stroke-1" />
                  <line x1="108" y1="58" x2="164" y2="74" className="stroke-zinc-500 stroke-[0.5] opacity-30" />
                </svg>
                <div className="nx-comms-legend">
                  <div className="text-[10px] text-zinc-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5" />Voice Nets
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />Text
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5" />Ops
                  </div>
                </div>
              </div>

              {/* Channel List */}
              <div className="nx-comms-section">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'channels' ? null : 'channels')}
                  className="nx-comms-section-header"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Channels ({channels.length})</span>
                  <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${expandedSection === 'channels' ? 'rotate-180' : ''}`} />
                </button>
                {expandedSection === 'channels' && (
                  <div className="nx-comms-list">
                    {channels.map((ch) => (
                      <div key={ch.id} className="nx-comms-item">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-zinc-500">{ch.type === 'voice' ? '🎤' : '#'}</span>
                          <span className="text-xs text-zinc-300 truncate">{ch.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {ch.type === 'voice' && ch.online > 0 && (
                            <NexusBadge tone="active" className="text-[9px] px-1.5">{ch.online}</NexusBadge>
                          )}
                          {ch.unread > 0 && (
                            <NexusBadge tone="warning" className="text-[9px] px-1.5">{ch.unread}</NexusBadge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Voice Nets */}
              {activeVoiceChannels.length > 0 && (
                <div className="nx-comms-section">
                  <div className="nx-comms-section-header">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span>Live Voice ({activeVoiceChannels.length})</span>
                  </div>
                  <div className="nx-comms-list">
                    {activeVoiceChannels.map((ch) => (
                      <div key={ch.id} className="nx-comms-item">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                          <span className="text-xs text-yellow-300 truncate font-semibold">{ch.name}</span>
                        </div>
                        <NexusBadge tone="active" className="text-[9px] px-1.5">{ch.online} users</NexusBadge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Presence Tab */}
          {activeTab === 'presence' && (
            <div className="nx-comms-content">
              <div className="nx-comms-section">
                <div className="nx-comms-section-header">
                  <Eye className="w-3 h-3" />
                  <span>Online ({onlineUsers.length})</span>
                </div>
                <div className="nx-comms-list">
                  {onlineUsers.map((user) => {
                    const statusColor = {
                      active: 'bg-green-500',
                      idle: 'bg-yellow-500',
                      'in-call': 'bg-blue-500',
                      away: 'bg-zinc-500',
                    }[user.status] || 'bg-zinc-600';

                    return (
                      <div key={user.id} className="nx-comms-item">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`inline-block w-2 h-2 rounded-full ${statusColor}`} />
                          <div className="min-w-0">
                            <div className="text-xs text-zinc-100 truncate">{user.callsign}</div>
                            <div className="text-[10px] text-zinc-500">{user.role}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-zinc-600">{user.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="nx-comms-content">
              <div className="nx-comms-section space-y-2">
                {/* Notification Toggle */}
                <button
                  onClick={() => setMuteNotifications(!muteNotifications)}
                  className="nx-comms-toggle-item"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {muteNotifications ? (
                      <BellOff className="w-3 h-3 text-zinc-500" />
                    ) : (
                      <Bell className="w-3 h-3 text-red-500" />
                    )}
                    <span className="text-xs">Notifications</span>
                  </div>
                  <div className={`w-6 h-3 rounded-full transition-colors ${muteNotifications ? 'bg-zinc-700' : 'bg-red-600/60'}`} />
                </button>

                {/* Voice Toggle */}
                <button
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="nx-comms-toggle-item"
                >
                  <div className="flex items-center gap-2 flex-1">
                    {voiceEnabled ? (
                      <Volume2 className="w-3 h-3 text-blue-500" />
                    ) : (
                      <VolumeX className="w-3 h-3 text-zinc-500" />
                    )}
                    <span className="text-xs">Voice</span>
                  </div>
                  <div className={`w-6 h-3 rounded-full transition-colors ${voiceEnabled ? 'bg-blue-600/60' : 'bg-zinc-700'}`} />
                </button>

                {/* Network Status */}
                <div className="rounded border border-zinc-800/60 bg-zinc-900/40 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Network</span>
                    <NexusBadge tone={online ? 'ok' : 'danger'} className="text-[9px]">
                      {online ? 'Active' : 'Offline'}
                    </NexusBadge>
                  </div>
                </div>

                {/* Bridge Info */}
                <div className="rounded border border-zinc-800/60 bg-zinc-900/40 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Bridge</span>
                    <span className="text-xs text-zinc-200 font-mono">{bridgeId}</span>
                  </div>
                </div>

                {/* Active App */}
                <div className="rounded border border-zinc-800/60 bg-zinc-900/40 px-2 py-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500">Active App</span>
                    <span className="text-xs text-zinc-200 font-mono uppercase">{activeAppId || 'none'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}