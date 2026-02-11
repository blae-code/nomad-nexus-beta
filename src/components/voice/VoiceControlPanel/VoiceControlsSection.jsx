import React from 'react';
import { Mic, MicOff, Radio, AlertCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAudioDevices } from '@/components/voice/hooks/useAudioDevices';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

const DISCIPLINE_MODES = ['OPEN', 'PTT', 'REQUEST_TO_SPEAK', 'COMMAND_ONLY'];

export default function VoiceControlsSection() {
  const voiceNet = useVoiceNet();
  const {
    inputDevices,
    outputDevices,
    selectedDeviceId,
    selectedOutputDeviceId,
    selectDevice,
    selectOutputDevice,
  } = useAudioDevices();
  const isConnected = voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED;

  const beginPTT = React.useCallback((event) => {
    event?.preventDefault?.();
    voiceNet.startPTT?.();
  }, [voiceNet]);

  const endPTT = React.useCallback((event) => {
    event?.preventDefault?.();
    voiceNet.stopPTT?.();
  }, [voiceNet]);

  React.useEffect(() => {
    if (selectedOutputDeviceId) {
      voiceNet.setOutputDevice?.(selectedOutputDeviceId);
    }
  }, [selectedOutputDeviceId, voiceNet]);

  if (!voiceNet.activeNetId) {
    return (
      <div className="px-4 py-3 text-center text-zinc-500 text-xs">
        <Radio className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p>Join a voice net to access controls</p>
      </div>
    );
  }

  const activeDiscipline = voiceNet.disciplineModeByNet?.[voiceNet.transmitNetId] || 'PTT';

  return (
    <div className="px-4 py-3 space-y-3 animate-in fade-in duration-200">
      <div className="space-y-1.5">
        <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">Discipline Mode</label>
        <select
          value={activeDiscipline}
          onChange={(e) => voiceNet.setDisciplineMode?.(e.target.value)}
          className="w-full text-xs px-3 py-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
        >
          {DISCIPLINE_MODES.map((mode) => (
            <option key={mode} value={mode}>{mode}</option>
          ))}
        </select>
      </div>

      {inputDevices.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">Microphone Device</label>
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => {
              selectDevice(e.target.value);
              voiceNet.setInputDevice?.(e.target.value);
            }}
            disabled={!isConnected}
            className="w-full text-xs px-3 py-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
          >
            {inputDevices.map((device, idx) => (
              <option key={device.deviceId || idx} value={device.deviceId}>
                {device.label || `Microphone ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {outputDevices.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">Output Device</label>
          <select
            value={selectedOutputDeviceId || ''}
            onChange={(e) => {
              selectOutputDevice(e.target.value);
              voiceNet.setOutputDevice?.(e.target.value);
            }}
            className="w-full text-xs px-3 py-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
          >
            {outputDevices.map((device, idx) => (
              <option key={device.deviceId || idx} value={device.deviceId}>
                {device.label || `Output ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant={voiceNet.micEnabled ? 'outline' : 'destructive'}
          className="text-xs font-semibold gap-2"
          onClick={() => voiceNet.setMicEnabled?.(!voiceNet.micEnabled)}
          disabled={!isConnected}
        >
          {voiceNet.micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          {voiceNet.micEnabled ? 'Mic Live' : 'Mic Muted'}
        </Button>
        <Button
          size="sm"
          variant={voiceNet.whisperState?.active ? 'default' : 'outline'}
          className="text-xs font-semibold"
          disabled={!isConnected}
          onMouseDown={() => voiceNet.startWhisper?.({ type: 'role', values: ['SCOUT'], label: 'Scout Priority' })}
          onMouseUp={() => voiceNet.stopWhisper?.()}
          onMouseLeave={() => voiceNet.stopWhisper?.()}
          onTouchStart={() => voiceNet.startWhisper?.({ type: 'role', values: ['SCOUT'], label: 'Scout Priority' })}
          onTouchEnd={() => voiceNet.stopWhisper?.()}
          onTouchCancel={() => voiceNet.stopWhisper?.()}
        >
          Whisper (Hold)
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={voiceNet.txSubmix || 'SQUAD'}
          onChange={(e) => voiceNet.configureSubmix?.({ tx: e.target.value, monitor: voiceNet.monitorSubmixes || ['COMMAND', 'SQUAD', 'LOCAL'] })}
          className="w-full text-xs px-3 py-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700"
        >
          <option value="COMMAND">TX: COMMAND</option>
          <option value="SQUAD">TX: SQUAD</option>
          <option value="LOCAL">TX: LOCAL</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          className="text-xs"
          onClick={() => voiceNet.setNormalization?.(!voiceNet.normalizationEnabled)}
        >
          {voiceNet.normalizationEnabled ? 'Normalization On' : 'Normalization Off'}
        </Button>
      </div>

      <div className="space-y-1.5">
        <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">Push-to-Talk</label>
        <Button
          size="sm"
          variant={voiceNet.pttActive ? 'default' : 'outline'}
          className="w-full text-xs font-semibold gap-2"
          onMouseDown={beginPTT}
          onMouseUp={endPTT}
          onMouseLeave={endPTT}
          onTouchStart={beginPTT}
          onTouchEnd={endPTT}
          onTouchCancel={endPTT}
          onKeyDown={(event) => {
            if (event.code === 'Space' || event.code === 'Enter') beginPTT(event);
          }}
          onKeyUp={(event) => {
            if (event.code === 'Space' || event.code === 'Enter') endPTT(event);
          }}
          disabled={!isConnected}
          title="Hold to transmit"
        >
          <Radio className="w-4 h-4" />
          PTT: {voiceNet.pttActive ? 'Transmitting' : 'Ready'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="text-[10px]"
          disabled={!voiceNet.transmitNetId}
          onClick={() => voiceNet.triggerPriorityOverride?.({ message: 'Priority override engaged', priority: 'CRITICAL' })}
        >
          Priority Override
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-[10px]"
          disabled={!voiceNet.transmitNetId}
          onClick={() => voiceNet.requestToSpeak?.({ reason: 'Need to transmit update' })}
        >
          Request To Speak
        </Button>
      </div>

      <div className="text-[10px] text-zinc-500 flex items-center gap-1">
        <Activity className="w-3 h-3" />
        TX bus: {voiceNet.transmitNetId || 'none'} • monitored: {(voiceNet.monitoredNetIds || []).length}
      </div>

      {!isConnected && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/30">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Connection {voiceNet.connectionState?.toLowerCase?.()}. Controls enable when connected.</span>
        </div>
      )}

      {voiceNet.error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs border border-red-500/30">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{voiceNet.error}</span>
        </div>
      )}
    </div>
  );
}
