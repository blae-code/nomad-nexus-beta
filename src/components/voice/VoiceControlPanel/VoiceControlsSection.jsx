import React from 'react';
import { Mic, MicOff, Radio, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { useAudioDevices } from '@/components/voice/hooks/useAudioDevices';
import { VOICE_CONNECTION_STATE } from '@/components/constants/voiceNet';

export default function VoiceControlsSection() {
  const voiceNet = useVoiceNet();
  const { inputDevices, selectedDeviceId, selectDevice } = useAudioDevices();
  const isConnected = voiceNet.connectionState === VOICE_CONNECTION_STATE.CONNECTED;

  React.useEffect(() => {
    if (selectedDeviceId) {
      localStorage.setItem('nexus.voicePanel.selectedDeviceId', selectedDeviceId);
    }
  }, [selectedDeviceId]);

  if (!voiceNet.activeNetId) {
    return (
      <div className="px-4 py-3 text-center text-zinc-500 text-xs">
        <Radio className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p>Join a voice net to access controls</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-3 animate-in fade-in duration-200">
      {/* Microphone Device Selector */}
      {inputDevices.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">
            Microphone Device
          </label>
          <select
            value={selectedDeviceId || ''}
            onChange={(e) => selectDevice(e.target.value)}
            disabled={!isConnected}
            className="w-full text-xs px-3 py-2 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50"
          >
            {inputDevices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${inputDevices.indexOf(device) + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Microphone Toggle */}
      <div className="space-y-1.5">
        <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          Microphone Status
        </label>
        <Button
          size="sm"
          variant={voiceNet.micEnabled ? 'outline' : 'destructive'}
          className="w-full text-xs font-semibold gap-2"
          onClick={() => voiceNet.setMicEnabled(!voiceNet.micEnabled)}
          disabled={!isConnected}
        >
          {voiceNet.micEnabled ? (
            <>
              <Mic className="w-4 h-4" />
              Microphone: On
            </>
          ) : (
            <>
              <MicOff className="w-4 h-4" />
              Microphone: Off
            </>
          )}
        </Button>
      </div>

      {/* PTT Controls */}
      <div className="space-y-1.5">
        <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          Push-to-Talk
        </label>
        <Button
          size="sm"
          variant={voiceNet.pttActive ? 'default' : 'outline'}
          className="w-full text-xs font-semibold gap-2"
          onClick={() => voiceNet.togglePTT()}
          disabled={!isConnected}
          title="Space bar for quick PTT"
        >
          <Radio className="w-4 h-4" />
          PTT: {voiceNet.pttActive ? 'Active' : 'Ready'}
        </Button>
        <p className="text-[10px] text-zinc-500 italic">Hold Space for quick activation</p>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-yellow-500/10 text-yellow-400 text-xs border border-yellow-500/30">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Connection {voiceNet.connectionState.toLowerCase()}. Controls will be enabled when connected.</span>
        </div>
      )}

      {/* Error Display */}
      {voiceNet.error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs border border-red-500/30">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{voiceNet.error}</span>
        </div>
      )}
    </div>
  );
}