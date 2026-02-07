import React from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useVoiceHealth, formatHealthState, getHealthColor } from '@/components/voice/health/voiceHealth';
import { useLatency } from '@/components/hooks/useLatency';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

export default function NetHealth() {
  const voiceNet = useVoiceNet();
  const latency = useLatency();
  const voiceHealth = useVoiceHealth(voiceNet, latency);

  const isDegraded = voiceHealth.connectionState === VOICE_CONNECTION_STATE.RECONNECTING ||
    (latency?.latencyMs > 150 && voiceNet.activeNetId !== null);
  const isError = voiceHealth.connectionState === VOICE_CONNECTION_STATE.ERROR;

  return (
    <div className="px-4 py-3 text-xs text-zinc-400 space-y-3 animate-in fade-in duration-200">
      {/* Status Overview */}
      <div className="p-3 bg-zinc-800/40 rounded-md border border-zinc-700/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500 font-semibold">Connection State</span>
          <span className={`text-xs font-mono font-bold ${getHealthColor(voiceHealth.connectionState)}`}>
            {formatHealthState(voiceHealth.connectionState)}
          </span>
        </div>

        {voiceNet.activeNetId && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Participants</span>
              <span className="text-zinc-300 font-mono">{voiceNet.participants?.length || 0}</span>
            </div>

            {voiceHealth.reconnectCount > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Reconnects</span>
                <span className="text-orange-400 font-mono font-semibold">{voiceHealth.reconnectCount}</span>
              </div>
            )}

            {voiceHealth.lastConnectedAt && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Connected Since</span>
                <span className="text-zinc-400 font-mono">
                  {new Date(voiceHealth.lastConnectedAt).toLocaleTimeString()}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Latency</span>
              <span className={`font-mono font-semibold ${latency?.isHealthy ? 'text-green-400' : 'text-orange-400'}`}>
                {latency?.latencyMs || 0}ms
              </span>
            </div>
          </>
        )}
      </div>

      {/* Health Indicators */}
      {voiceNet.activeNetId && (
        <div className="space-y-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold ${
            voiceHealth.connectionState === VOICE_CONNECTION_STATE.CONNECTED
              ? 'bg-green-500/10 text-green-400'
              : isDegraded
              ? 'bg-orange-500/10 text-orange-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {voiceHealth.connectionState === VOICE_CONNECTION_STATE.CONNECTED && (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            {isDegraded && <AlertCircle className="w-3.5 h-3.5" />}
            {isError && <AlertCircle className="w-3.5 h-3.5" />}
            <span>
              {voiceHealth.connectionState === VOICE_CONNECTION_STATE.CONNECTED && 'Healthy'}
              {isDegraded && 'Degraded'}
              {isError && 'Error'}
            </span>
          </div>

          {voiceHealth.lastError && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{voiceHealth.lastError}</span>
            </div>
          )}
        </div>
      )}

      {!voiceNet.activeNetId && (
        <div className="text-center py-4 text-zinc-500 text-xs">
          <Activity className="w-5 h-5 mx-auto mb-2 opacity-40" />
          <p>Join a voice net to view health stats</p>
        </div>
      )}
    </div>
  );
}
