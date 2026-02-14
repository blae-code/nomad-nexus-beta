import React from 'react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useShellUI } from '@/components/providers/ShellUIContext';
import { useReadiness } from '@/components/hooks/useReadiness';
import { Radio, Calendar, MessageSquare, PanelRight, Activity, Shield } from 'lucide-react';

/**
 * NexusFooter — Anchored global status bar
 * Shows: Readiness State, Active Op, Voice Net, UI Shell Status
 * Clean, informative, command-grade design
 */
export default function NexusFooter() {
  const voiceNet = useVoiceNet();
  const activeOp = useActiveOp();
  const shellUI = useShellUI();
  const readinessData = useReadiness();

  const readiness = readinessData?.state || 'INITIALIZING';
  const reason = readinessData?.reason || 'Starting up...';
  
  const readinessConfig = {
    READY: { color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30', icon: Shield },
    DEGRADED: { color: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/30', icon: Activity },
    OFFLINE: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', icon: Activity },
    INITIALIZING: { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', icon: Activity },
  };

  const config = readinessConfig[readiness] || readinessConfig.INITIALIZING;
  const StatusIcon = config.icon;

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-[700] border-t-2 border-red-700/40 bg-black/95 backdrop-blur-xl shadow-lg shadow-black/50">
      <div className="px-6 py-2">
        <div className="flex items-center justify-between gap-4 text-[11px] font-mono">
          {/* Left: System Readiness */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${config.bg} ${config.border}`}>
              <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
              <span className={`font-bold uppercase tracking-[0.15em] ${config.color}`}>
                {readiness}
              </span>
              <div className={`w-1 h-1 rounded-full ${config.color.replace('text-', 'bg-')} animate-pulse`} />
            </div>
            <span className="text-zinc-600 text-[10px] max-w-xs truncate">{reason}</span>
          </div>

          {/* Center: Active Context */}
          <div className="flex items-center gap-4 flex-1 justify-center min-w-0">
            {/* Active Operation */}
            {activeOp?.activeEvent ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded">
                <Calendar className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 font-bold uppercase tracking-wider text-[10px] truncate max-w-[200px]">
                  {activeOp.activeEvent.title}
                </span>
                <div className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/40 border border-zinc-800/60 rounded">
                <Calendar className="w-3 h-3 text-zinc-600" />
                <span className="text-zinc-600 text-[10px] uppercase tracking-wider">No Active Op</span>
              </div>
            )}

            {/* Voice Net Status */}
            {voiceNet?.activeNetId ? (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded">
                <Radio className="w-3 h-3 text-green-400" />
                <span className="text-green-300 font-bold text-[10px] uppercase tracking-wider">
                  {voiceNet.activeNetId}
                </span>
                <span className="text-green-500 text-[9px] font-mono">
                  ({voiceNet.participants?.length || 0})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900/40 border border-zinc-800/60 rounded">
                <Radio className="w-3 h-3 text-zinc-600" />
                <span className="text-zinc-600 text-[10px] uppercase tracking-wider">No Voice Net</span>
              </div>
            )}
          </div>

          {/* Right: Shell UI Status */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider ${
              shellUI?.isCommsDockOpen 
                ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' 
                : 'bg-zinc-900/40 border border-zinc-800/60 text-zinc-600'
            }`}>
              <MessageSquare className="w-3 h-3" />
              <span>Comms</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] uppercase tracking-wider ${
              shellUI?.isContextPanelOpen 
                ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' 
                : 'bg-zinc-900/40 border border-zinc-800/60 text-zinc-600'
            }`}>
              <PanelRight className="w-3 h-3" />
              <span>Panel</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}