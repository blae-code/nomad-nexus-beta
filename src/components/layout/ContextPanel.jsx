import React, { useState } from 'react';
import { usePresenceRoster } from '@/components/hooks/usePresenceRoster';
import { useReadiness } from '@/components/hooks/useReadiness';
import { useLatency } from '@/components/hooks/useLatency';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAudioDevices } from '@/components/voice/hooks/useAudioDevices';
import { useAuth } from '@/components/providers/AuthProvider';
import { getRankLabel, getMembershipLabel } from '@/components/constants/labels';
import { ChevronDown, X, Radio, Users, Mic, BarChart3, Activity, ExternalLink, Copy, RotateCcw, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP_VERSION, APP_BUILD_PHASE, APP_BUILD_DATE } from '@/components/constants/appVersion';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { useNotification } from '@/components/providers/NotificationContext';
import { useUnreadCounts } from '@/components/hooks/useUnreadCounts';
import { canJoinVoiceNet } from '@/components/utils/voiceAccessPolicy';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';
import { useVoiceHealth, formatHealthState, getHealthColor } from '@/components/voice/health/voiceHealth';
import { useVoiceNotifications } from '@/components/voice/notifications/voiceNotifications';
import { FocusedNetConfirmationSheet } from '@/components/voice/FocusedNetConfirmation';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { createPageUrl } from '@/utils';
import ActiveNets from '@/components/voice/VoiceControlPanel/ActiveNets';
import NetHealth from '@/components/voice/VoiceControlPanel/NetHealth';
import NetRoster from '@/components/voice/VoiceControlPanel/NetRoster';
import VoiceControlsSection from '@/components/voice/VoiceControlPanel/VoiceControlsSection';
import CommsDiscipline from '@/components/voice/VoiceControlPanel/CommsDiscipline';
import VoiceParticipantIndicator from '@/components/voice/VoiceParticipantIndicator';
import AIInsightsPanel from '@/components/ai/AIInsightsPanel';

/**
 * ContextPanel — Right sidebar with systems, contacts, voice controls
 * Supports: collapse/expand, internal scrolling, section toggles
 */
export default function ContextPanel({ isOpen, onClose, isMinimized, onMinimize }) {
  const [expandedSections, setExpandedSections] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus.contextPanel.expanded');
      return saved ? JSON.parse(saved) : {
        activeOp: true,
        nets: true,
        voice: true,
        health: false,
        contacts: true,
        aiInsights: true,
        riggsy: false,
        diagnostics: false,
      };
    } catch {
      return {
        activeOp: true,
        nets: true,
        voice: true,
        health: false,
        contacts: true,
        aiInsights: true,
        riggsy: false,
        diagnostics: false,
      };
    }
  });

  // Live telemetry data
  const { onlineUsers, onlineCount, loading } = usePresenceRoster();
  const readiness = useReadiness();
  const latency = useLatency();
  const voiceNet = useVoiceNet();
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const { inputDevices, selectedDeviceId, selectDevice } = useAudioDevices();
  const voiceHealth = useVoiceHealth(voiceNet, latency);
  const activeOp = useActiveOp();
  const shellUI = useShellUI();
  const { addNotification } = useNotification();
  const { unreadByTab } = useUnreadCounts(user?.id);
  
  // Wire notifications
  useVoiceNotifications(voiceNet);



  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('nexus.contextPanel.expanded', JSON.stringify(updated));
      return updated;
    });
  };

  const copyDiagnostics = () => {
    const diagnostics = generateDiagnosticsText({
      user,
      activeOp,
      voiceNet,
      voiceHealth,
      latency,
      readiness,
      onlineCount,
      shellUI,
      unreadByTab,
    });

    navigator.clipboard.writeText(diagnostics).then(() => {
      addNotification({
        type: 'success',
        title: 'Diagnostics copied',
        message: 'Diagnostic data copied to clipboard',
      });
    });
  };

  const resetUILayout = () => {
    if (confirm('Reset UI layout? This will clear panel positions and reload the page.')) {
      localStorage.removeItem('nexus.shell.contextPanelOpen');
      localStorage.removeItem('nexus.shell.commsDockOpen');
      window.location.reload();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`${isMinimized ? 'w-12' : 'w-80'} bg-zinc-900/95 border-l border-orange-500/20 flex flex-col overflow-hidden z-[900] relative transition-all duration-200`}>
      {/* Header */}
       <div className="h-16 border-b border-orange-500/20 flex items-center justify-between px-5 flex-shrink-0 bg-gradient-to-r from-zinc-900/50 to-transparent">
         {!isMinimized && (
           <div>
             <h2 className="text-xs font-black uppercase text-orange-400 tracking-widest">Voice Operations</h2>
             <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold mt-0.5">Tactical Comms Control</p>
           </div>
         )}
         <div className="flex items-center gap-1 ml-auto">
           <Button
             size="icon"
             variant="ghost"
             onClick={() => onMinimize(!isMinimized)}
             className="h-6 w-6 text-zinc-400 hover:text-orange-500"
             title={isMinimized ? "Expand" : "Minimize"}
           >
             <ChevronLeft className={`w-4 h-4 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
           </Button>
           {!isMinimized && (
             <Button
               size="icon"
               variant="ghost"
               onClick={onClose}
               className="h-6 w-6 text-zinc-400 hover:text-orange-500"
             >
               <X className="w-4 h-4" />
             </Button>
           )}
         </div>
       </div>

      {/* Scrollable Content */}
       <div className={`flex-1 overflow-y-auto ${isMinimized ? 'hidden' : ''}`}>
        {/* Active Operation Section */}
         <SectionHeader
           icon={<Activity className="w-4 h-4" />}
           label="Active Operation"
           sectionKey="activeOp"
           expanded={expandedSections.activeOp}
           onToggle={toggleSection}
         />
         {expandedSections.activeOp && (
           <div className="px-4 py-3 text-xs text-zinc-400 space-y-2 animate-in fade-in duration-200 border-b border-orange-500/10">
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
               <div className="text-zinc-600 text-xs py-3 text-center">
                 <div className="text-[10px] opacity-50 mb-1">—</div>
                 <p>No operation active.</p>
                 <p>Go to <span className="text-orange-400">Events</span> to launch one.</p>
               </div>
             )}
           </div>
         )}

         {/* Active Nets Section */}
         <SectionHeader
           icon={<Radio className="w-4 h-4" />}
           label={`Active Nets (${voiceNet.participants.length})`}
           sectionKey="nets"
           expanded={expandedSections.nets}
           onToggle={toggleSection}
         />
         {expandedSections.nets && <div className="border-b border-orange-500/10"><ActiveNets /></div>}

         {/* Roster Section */}
         <SectionHeader
           icon={<Users className="w-4 h-4" />}
           label={`Roster (${voiceNet.participants.length})`}
           sectionKey="contacts"
           expanded={expandedSections.contacts}
           onToggle={toggleSection}
         />
         {expandedSections.contacts && (
           <div className="max-h-72 overflow-y-auto border-b border-orange-500/10">
             <NetRoster />
           </div>
         )}

         {/* Voice Controls Section */}
         <SectionHeader
           icon={<Mic className="w-4 h-4" />}
           label="Voice Controls"
           sectionKey="voice"
           expanded={expandedSections.voice}
           onToggle={toggleSection}
         />
         {expandedSections.voice && (
           <div className="border-b border-orange-500/10">
             <VoiceControlsSection />
             <CommsDiscipline />
           </div>
         )}

         {/* Net Health Section */}
         <SectionHeader
           icon={<BarChart3 className="w-4 h-4" />}
           label="Net Health"
           sectionKey="health"
           expanded={expandedSections.health || false}
           onToggle={toggleSection}
         />
         {expandedSections.health && <div className="border-b border-orange-500/10"><NetHealth /></div>}

         {/* AI Insights Section */}
         <SectionHeader
           icon={<Activity className="w-4 h-4" />}
           label="AI Insights"
           sectionKey="aiInsights"
           expanded={expandedSections.aiInsights}
           onToggle={toggleSection}
         />
         {expandedSections.aiInsights && (
           <div className="px-4 py-3 border-b border-orange-500/10 animate-in fade-in duration-200">
             <AIInsightsPanel />
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
           <div className="px-4 py-3 text-xs text-zinc-400 space-y-2 border-b border-orange-500/10 animate-in fade-in duration-200">
            {/* Build Info */}
            <div className="space-y-1">
              <div className="text-zinc-500">Build</div>
              <div className="font-mono text-zinc-300 text-xs">{APP_VERSION}</div>
              <div className="font-mono text-zinc-500 text-xs">{APP_BUILD_DATE}</div>
            </div>

            {/* Current User */}
            <div className="space-y-1">
              <div className="text-zinc-500">User</div>
              <div className="font-mono text-zinc-300 text-xs">{user?.callsign || 'Unknown'}</div>
              <div className="text-zinc-500 text-xs">
                {getRankLabel(user?.rank)} • {getMembershipLabel(user?.membership)}
              </div>
            </div>

            {/* Route */}
            <div className="space-y-1">
              <div className="text-zinc-500">Route</div>
              <div className="font-mono text-zinc-300 text-xs">{getCurrentRoute()}</div>
            </div>

            {/* Active Op */}
            {activeOp.activeEvent && (
              <div className="space-y-1">
                <div className="text-zinc-500">Active Op</div>
                <div className="font-mono text-zinc-300 text-xs truncate">{activeOp.activeEvent.title}</div>
                <div className="text-zinc-500 text-xs">
                  {activeOp.binding?.voiceNetId && `Net: ${activeOp.binding.voiceNetId.slice(0, 8)}`}
                </div>
              </div>
            )}

            {/* Voice Status */}
            <div className="space-y-1">
              <div className="text-zinc-500">Voice</div>
              <div className={`font-mono text-xs ${getHealthColor(voiceHealth.connectionState)}`}>
                {formatHealthState(voiceHealth.connectionState)}
              </div>
              {voiceHealth.reconnectCount > 0 && (
                <div className="text-zinc-500 text-xs">Reconnects: {voiceHealth.reconnectCount}</div>
              )}
            </div>

            {/* Presence */}
            <div className="space-y-1">
              <div className="text-zinc-500">Presence</div>
              <div className="font-mono text-zinc-300 text-xs">{onlineCount} online</div>
            </div>

            {/* System Health */}
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

            {/* Shell UI State */}
            <div className="space-y-1">
              <div className="text-zinc-500">UI State</div>
              <div className="text-zinc-500 text-xs">
                Ctx: {shellUI.isContextPanelOpen ? 'Open' : 'Closed'} • 
                Dock: {shellUI.isCommsDockOpen ? 'Open' : 'Closed'}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1 pt-2 border-t border-zinc-800/50">
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={copyDiagnostics}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy Diagnostics
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={resetUILayout}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Reset UI Layout
              </Button>
            </div>
            </div>
            )}

            {/* Riggsy AI Section - Collapsed by default */}
            {expandedSections.riggsy && (
            <>
            <SectionHeader
              icon={<Radio className="w-4 h-4" />}
              label="Riggsy AI"
              sectionKey="riggsy"
              expanded={expandedSections.riggsy}
              onToggle={toggleSection}
            />
            <div className="px-4 py-3 text-xs text-zinc-500 animate-in fade-in duration-200 text-center border-b border-orange-500/10">
              <div className="text-[10px] opacity-50 mb-2">🤖</div>
              <div className="text-xs">AI Assistant (coming soon)</div>
            </div>
            </>
            )}

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
    </div>
  );
}

function SectionHeader({ icon, label, sectionKey, expanded, onToggle }) {
  return (
    <button
      onClick={() => onToggle(sectionKey)}
      className="w-full px-5 py-3 flex items-center gap-3 border-t border-orange-500/10 hover:bg-orange-500/5 hover:border-orange-500/20 transition-all text-left group"
    >
      <div className="text-orange-500/70 group-hover:text-orange-500 transition-colors">{icon}</div>
      <span className="text-[11px] font-black uppercase text-zinc-300 group-hover:text-orange-300 flex-1 tracking-widest transition-colors truncate">{label}</span>
      <ChevronDown
        className={`w-3 h-3 text-orange-500/50 group-hover:text-orange-500 transition-all ${expanded ? 'rotate-180' : ''}`}
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

function generateDiagnosticsText({ user, activeOp, voiceNet, voiceHealth, latency, readiness, onlineCount, shellUI, unreadByTab }) {
  const timestamp = new Date().toISOString();
  const route = getCurrentRoute();

  return `NOMAD NEXUS DIAGNOSTICS
Generated: ${timestamp}

BUILD INFO
Version: ${APP_VERSION}
Phase: ${APP_BUILD_PHASE}
Date: ${APP_BUILD_DATE}

USER
Callsign: ${user?.callsign || 'Unknown'}
Rank: ${getRankLabel(user?.rank)}
Membership: ${getMembershipLabel(user?.membership)}
User ID: ${user?.id || 'N/A'}

ROUTE
Current: ${route}

ACTIVE OPERATION
${activeOp.activeEvent ? `
ID: ${activeOp.activeEvent.id}
Title: ${activeOp.activeEvent.title}
Type: ${activeOp.activeEvent.event_type}
Status: ${activeOp.activeEvent.status}
Participants: ${activeOp.participants.length}
Bindings:
  Voice Net: ${activeOp.binding?.voiceNetId || 'None'}
` : 'No active operation'}

VOICE STATUS
Connection: ${formatHealthState(voiceHealth.connectionState)}
Active Net: ${voiceNet.activeNetId || 'None'}
Participants: ${voiceNet.participants.length}
Reconnects: ${voiceHealth.reconnectCount}
Mic Enabled: ${voiceNet.micEnabled}
PTT Active: ${voiceNet.pttActive}
${voiceHealth.lastError ? `Last Error: ${voiceHealth.lastError}` : ''}

PRESENCE
Online Users: ${onlineCount}

SYSTEM HEALTH
Readiness: ${readiness.state}
Latency: ${latency.latencyMs}ms
Latency Healthy: ${latency.isHealthy}

SHELL UI STATE
Side Panel: ${shellUI.isSidePanelOpen ? 'Open' : 'Closed'}
Context Panel: ${shellUI.isContextPanelOpen ? 'Open' : 'Closed'}
Comms Dock: ${shellUI.isCommsDockOpen ? 'Open' : 'Closed'}

COMMS
Unread (Voice): ${unreadByTab?.voice || 0}
Unread (Comms): ${unreadByTab?.comms || 0}
Unread (Events): ${unreadByTab?.events || 0}

END DIAGNOSTICS`;
}