import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Settings, Radio, Zap, Activity, AlertCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/components/utils/typographySystem';

export default function VoiceControlToolkit() {
  const [micEnabled, setMicEnabled] = useState(false);
  const [micVolume, setMicVolume] = useState(75);
  const [speakerVolume, setSpeakerVolume] = useState(75);
  const [voiceActive, setVoiceActive] = useState(false);
  const [listeningActive, setListeningActive] = useState(false);
  const [noiseGate, setNoiseGate] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGain, setAutoGain] = useState(true);
  const [latency, setLatency] = useState(28);
  const [signalQuality, setSignalQuality] = useState('good');

  // PTT activation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v' && e.ctrlKey) {
        e.preventDefault();
        setVoiceActive(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.key === 'v') {
        setVoiceActive(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="space-y-3 p-3 bg-zinc-950 border border-zinc-800 rounded-sm">
      {/* Title */}
      <div className="flex items-center gap-2">
        <Radio className="w-3 h-3 text-[#ea580c]" />
        <span className={cn(TYPOGRAPHY.LABEL_SM, "text-zinc-400 uppercase")}>Voice Toolkit</span>
      </div>

      {/* PTT Button */}
      <Button
        onClick={() => setVoiceActive(!voiceActive)}
        className={cn(
          'w-full h-10 font-bold uppercase text-sm transition-all',
          voiceActive
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-zinc-600'
        )}
      >
        <Mic className="w-4 h-4 mr-2" />
        {voiceActive ? 'TRANSMITTING' : 'PTT (Ctrl+V)'}
      </Button>

      {/* Voice Listening Toggle */}
      <Button
        onClick={() => setListeningActive(!listeningActive)}
        variant={listeningActive ? 'default' : 'outline'}
        className={cn(
          'w-full h-8 text-xs font-mono',
          listeningActive && 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300'
        )}
      >
        <Zap className="w-3 h-3 mr-1" />
        {listeningActive ? 'Voice Command Active' : 'Enable Voice Command'}
      </Button>

      {/* Mic Toggle */}
      <div className="flex gap-2">
        <Button
          onClick={() => setMicEnabled(!micEnabled)}
          variant={micEnabled ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'flex-1 h-8 text-xs',
            micEnabled && 'bg-blue-900/30 border-blue-700/50 text-blue-300'
          )}
        >
          <Mic className="w-3 h-3" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
        >
          <Settings className="w-3 h-3 mr-1" />
          Config
        </Button>
      </div>

      {/* Volume Controls */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        {/* Mic Volume */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={cn(TYPOGRAPHY.LABEL_SM, "text-zinc-500")}>Input</span>
            <span className="text-[10px] text-zinc-600">{micVolume}%</span>
          </div>
          <Slider
            value={[micVolume]}
            onValueChange={(val) => setMicVolume(val[0])}
            max={100}
            step={5}
            className="h-1"
          />
        </div>

        {/* Speaker Volume */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={cn(TYPOGRAPHY.LABEL_SM, "text-zinc-500")}>Output</span>
            <span className="text-[10px] text-zinc-600">{speakerVolume}%</span>
          </div>
          <Slider
            value={[speakerVolume]}
            onValueChange={(val) => setSpeakerVolume(val[0])}
            max={100}
            step={5}
            className="h-1"
          />
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-[9px] font-mono">
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded-sm">
          <div className={cn('w-1.5 h-1.5 rounded-full', micEnabled ? 'bg-blue-500' : 'bg-zinc-700')} />
          <span className={micEnabled ? 'text-blue-300' : 'text-zinc-500'}>MIC</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded-sm">
          <div className={cn('w-1.5 h-1.5 rounded-full', listeningActive ? 'bg-emerald-500' : 'bg-zinc-700')} />
          <span className={listeningActive ? 'text-emerald-300' : 'text-zinc-500'}>CMD</span>
        </div>
      </div>

      {/* Info */}
      <div className="text-[9px] text-zinc-600 pt-2 border-t border-zinc-800">
        <p>Voice command support coming soon. Hold Ctrl+V to transmit.</p>
      </div>
    </div>
  );
}