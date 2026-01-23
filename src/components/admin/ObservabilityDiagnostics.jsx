import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Clock, AlertCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Observability Diagnostics Drawer: Admin-only real-time health monitoring
 * Shows errors, heartbeats, comms mode, LiveKit status, network metrics
 */
export default function ObservabilityDiagnostics({ isOpen, onClose }) {
  const [diagnostics, setDiagnostics] = useState({});
  const [expandedSection, setExpandedSection] = useState('overview');

  useEffect(() => {
    const updateDiagnostics = () => {
      // Access observability from window singleton
      const obs = window.__observability;
      if (!obs) return;
      
      setDiagnostics(obs.getDiagnosticsSummary?.() || {});
    };

    updateDiagnostics();
    const interval = setInterval(updateDiagnostics, 2000);
    window.addEventListener('observability:error', updateDiagnostics);

    return () => {
      clearInterval(interval);
      window.removeEventListener('observability:error', updateDiagnostics);
    };
  }, []);

  if (!isOpen) return null;

  const { healthStatus, lastHeartbeat, lastSeedWipe, recentErrors, requestsPerMin, commsMode, liveKitEnv, totalErrors } = diagnostics;

  const healthColor = {
    green: 'text-emerald-400',
    amber: 'text-yellow-400',
    red: 'text-red-400'
  }[healthStatus] || 'text-zinc-400';

  const healthLabel = {
    green: 'NOMINAL',
    amber: 'CAUTION',
    red: 'ALERT'
  }[healthStatus] || 'UNKNOWN';

  return (
    <AnimatePresence>
      <motion.div
        key="diagnostics-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60"
        onClick={onClose}
      />

      <motion.div
        key="diagnostics-drawer"
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        className="fixed right-0 top-16 bottom-0 w-96 bg-zinc-950 border-l border-zinc-800/60 z-50 flex flex-col overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%)',
          backgroundSize: '100% 2px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-zinc-800/40 bg-zinc-900/50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observability</span>
              <span className={cn('text-[8px] font-mono font-bold uppercase', healthColor)}>
                {healthLabel}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 text-sm leading-none"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto space-y-2 p-2">
          {/* Health Summary */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2 space-y-1">
            <button
              onClick={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
              className="w-full flex items-center justify-between text-[9px] font-mono font-bold uppercase hover:text-[#ea580c] transition-colors text-left py-1 px-1"
            >
              <span>Health Overview</span>
              <span className={cn('text-[8px]', healthColor)}>{healthLabel}</span>
            </button>

            {expandedSection === 'overview' && (
              <div className="space-y-1 pl-2 border-l border-zinc-800/40 text-[8px] font-mono">
                <div className="flex justify-between text-zinc-500">
                  <span>Errors (5m)</span>
                  <span className={cn('font-bold', recentErrors.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                    {recentErrors.length}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Requests/min</span>
                  <span className="text-zinc-300">{requestsPerMin}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Total Errors</span>
                  <span className="text-zinc-300">{totalErrors}</span>
                </div>
              </div>
            )}
          </div>

          {/* Subscriptions / Heartbeat */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'heartbeat' ? null : 'heartbeat')}
              className="w-full flex items-center justify-between text-[9px] font-mono font-bold uppercase hover:text-[#ea580c] transition-colors text-left py-1 px-1"
            >
              <span>Last Heartbeat</span>
              <span className="text-[8px] text-zinc-500">
                {lastHeartbeat ? '✓ ACTIVE' : '⊘ IDLE'}
              </span>
            </button>

            {expandedSection === 'heartbeat' && lastHeartbeat && (
              <div className="space-y-1 pl-2 border-l border-zinc-800/40 text-[8px] font-mono mt-1">
                <div className="flex justify-between text-zinc-500">
                  <span>Net</span>
                  <span className="text-zinc-300">{lastHeartbeat.netId || '—'}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Event</span>
                  <span className="text-zinc-300">{lastHeartbeat.eventId || '—'}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Time</span>
                  <span className="text-zinc-300">
                    {lastHeartbeat.timestamp ? new Date(lastHeartbeat.timestamp).toLocaleTimeString() : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Seed/Wipe Status */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'seedwipe' ? null : 'seedwipe')}
              className="w-full flex items-center justify-between text-[9px] font-mono font-bold uppercase hover:text-[#ea580c] transition-colors text-left py-1 px-1"
            >
              <span>Last Seed/Wipe</span>
              <span className="text-[8px] text-zinc-500">
                {lastSeedWipe ? lastSeedWipe.status.toUpperCase() : '⊘ NONE'}
              </span>
            </button>

            {expandedSection === 'seedwipe' && lastSeedWipe && (
              <div className="space-y-1 pl-2 border-l border-zinc-800/40 text-[8px] font-mono mt-1">
                <div className="flex justify-between text-zinc-500">
                  <span>Step</span>
                  <span className="text-zinc-300">{lastSeedWipe.step}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Action</span>
                  <span className="text-zinc-300">{lastSeedWipe.action}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Duration</span>
                  <span className="text-zinc-300">{lastSeedWipe.duration}ms</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Time</span>
                  <span className="text-zinc-300">
                    {new Date(lastSeedWipe.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Comms Mode */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'comms' ? null : 'comms')}
              className="w-full flex items-center justify-between text-[9px] font-mono font-bold uppercase hover:text-[#ea580c] transition-colors text-left py-1 px-1"
            >
              <span>Comms Mode</span>
              <span className="text-[8px] text-zinc-500">
                {commsMode?.mode || '⊘ UNKNOWN'}
              </span>
            </button>

            {expandedSection === 'comms' && commsMode && (
              <div className="space-y-1 pl-2 border-l border-zinc-800/40 text-[8px] font-mono mt-1">
                <div className="flex justify-between text-zinc-500">
                  <span>Mode</span>
                  <span className="text-zinc-300 uppercase">{commsMode.mode}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Time</span>
                  <span className="text-zinc-300">
                    {new Date(commsMode.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* LiveKit Environment */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'livekit' ? null : 'livekit')}
              className="w-full flex items-center justify-between text-[9px] font-mono font-bold uppercase hover:text-[#ea580c] transition-colors text-left py-1 px-1"
            >
              <span>LiveKit</span>
              <span className="text-[8px] text-zinc-500">
                {liveKitEnv?.env || '⊘ UNKNOWN'}
              </span>
            </button>

            {expandedSection === 'livekit' && liveKitEnv && (
              <div className="space-y-1 pl-2 border-l border-zinc-800/40 text-[8px] font-mono mt-1">
                <div className="flex justify-between text-zinc-500">
                  <span>Env</span>
                  <span className="text-zinc-300">{liveKitEnv.env}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Time</span>
                  <span className="text-zinc-300">
                    {new Date(liveKitEnv.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Errors */}
          <div className="bg-zinc-900/40 border border-zinc-800/50 p-2">
            <button
              onClick={() => setExpandedSection(expandedSection === 'errors' ? null : 'errors')}
              className="w-full flex items-center justify-between text-[9px] font-mono font-bold uppercase hover:text-[#ea580c] transition-colors text-left py-1 px-1"
            >
              <span>Recent Errors ({recentErrors.length})</span>
              <span className={cn('text-[8px]', recentErrors.length > 0 ? 'text-red-400' : 'text-emerald-400')}>
                {recentErrors.length > 0 ? '⚠ ACTIVE' : '✓ NONE'}
              </span>
            </button>

            {expandedSection === 'errors' && recentErrors.length > 0 && (
              <div className="space-y-1 pl-2 border-l border-red-700/30 mt-1 max-h-[200px] overflow-y-auto">
                {recentErrors.map((error, i) => (
                  <div key={i} className="text-[7px] text-red-400/80 font-mono p-1 bg-red-950/20 border border-red-800/30">
                    <div className="font-bold">{error.type}</div>
                    <div className="text-[6px] text-red-300/60 truncate">{error.message}</div>
                    {error.source && (
                      <div className="text-[6px] text-zinc-500 truncate">{error.source}:{error.line}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {expandedSection === 'errors' && recentErrors.length === 0 && (
              <div className="text-[8px] text-emerald-400 pl-2 mt-1">✓ No errors in last 5 minutes</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-zinc-800/40 bg-zinc-900/50 shrink-0">
          <div className="text-[7px] text-zinc-600 font-mono uppercase tracking-wider">
            Real-time diagnostics • Updated every 3s
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}