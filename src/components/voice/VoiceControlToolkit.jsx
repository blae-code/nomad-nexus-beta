import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Settings, Radio, Zap, Activity, AlertCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/components/utils/typographySystem';
import { useVoiceAudio } from '@/components/hooks/useVoiceAudio';

export default function VoiceControlToolkit() {
  const {
    micEnabled,
    setMicEnabled,
    micVolume,
    setMicVolume,
    speakerVolume,
    setSpeakerVolume,
    inputLevel,
    latency,
    signalQuality,
    noiseGate,
    setNoiseGate,
    echoCancellation,
    setEchoCancellation,
    autoGain,
    setAutoGain,
  } = useVoiceAudio();

  const [voiceActive, setVoiceActive] = useState(false);
  const [listeningActive, setListeningActive] = useState(false);

  // PTT activation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v' && e.ctrlKey) {
        e.preventDefault();
        setMicEnabled(true);
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

  const getQualityColor = () => {
    if (signalQuality === 'excellent') return 'bg-emerald-600';
    if (signalQuality === 'good') return 'bg-cyan-500';
    if (signalQuality === 'fair') return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getLatencyColor = () => {
    if (latency < 50) return 'text-emerald-400';
    if (latency < 100) return 'text-cyan-400';
    if (latency < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 overflow-hidden"
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-[#ea580c]" />
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">VOICE CONTROL</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-0">
        {/* PTT Section */}
        <div className="px-3 py-2 border-b border-zinc-800/50 space-y-1.5">
          <button
            onClick={() => setVoiceActive(!voiceActive)}
            className={cn(
              'w-full h-10 font-bold uppercase text-xs transition-all border flex items-center justify-center gap-2',
              voiceActive
                ? 'bg-red-900/40 border-red-700/60 text-red-300 animate-pulse'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-[#ea580c]/40'
            )}
          >
            <Mic className="w-3 h-3" />
            {voiceActive ? 'TRANSMITTING' : 'PTT (Ctrl+V)'}
          </button>
        </div>

        {/* Diagnostics Section */}
        <div className="px-3 py-2 border-b border-zinc-800/50">
          <div className="text-[8px] font-bold text-zinc-600 uppercase mb-1.5">DIAGNOSTICS</div>
          <div className="space-y-1">
            {/* Signal Quality */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500">Signal</span>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-2 h-2 rounded-full', getQualityColor())} />
                <span className="text-[9px] font-mono text-zinc-400">{signalQuality.toUpperCase()}</span>
              </div>
            </div>
            {/* Latency */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-zinc-500">Latency</span>
              <span className={cn('text-[9px] font-mono', getLatencyColor())}>{latency}ms</span>
            </div>
          </div>
        </div>

        {/* Audio Processing Section */}
        <div className="px-3 py-2 border-b border-zinc-800/50">
          <div className="text-[8px] font-bold text-zinc-600 uppercase mb-1.5">PROCESSING</div>
          <div className="space-y-1">
            {[
              { id: 'noise', label: 'Noise Gate', state: noiseGate, setState: setNoiseGate },
              { id: 'echo', label: 'Echo Cancel', state: echoCancellation, setState: setEchoCancellation },
              { id: 'gain', label: 'Auto Gain', state: autoGain, setState: setAutoGain }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => item.setState(!item.state)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 text-[9px] transition-colors border border-l-2',
                  item.state
                    ? 'bg-zinc-900 text-[#ea580c] border-l-[#ea580c] border-zinc-800'
                    : 'bg-zinc-900/50 text-zinc-500 border-l-transparent border-zinc-800/50 hover:bg-zinc-900/70'
                )}
              >
                <div className={cn('w-1 h-1 rounded-full', item.state ? 'bg-[#ea580c]' : 'bg-zinc-600')} />
                <span className="font-mono">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Volume Controls */}
        <div className="px-3 py-2 border-b border-zinc-800/50 space-y-2">
          <div className="text-[8px] font-bold text-zinc-600 uppercase mb-1">LEVELS</div>
          
          {/* Mic Volume */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-zinc-500 font-mono">INPUT</span>
              <span className="text-[9px] font-mono text-zinc-400">{micVolume}%</span>
            </div>
            <Slider
              value={[micVolume]}
              onValueChange={(val) => setMicVolume(val[0])}
              max={100}
              step={1}
              className="h-1"
            />
          </div>

          {/* Speaker Volume */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-zinc-500 font-mono">OUTPUT</span>
              <span className="text-[9px] font-mono text-zinc-400">{speakerVolume}%</span>
            </div>
            <Slider
              value={[speakerVolume]}
              onValueChange={(val) => setSpeakerVolume(val[0])}
              max={100}
              step={1}
              className="h-1"
            />
          </div>
        </div>

        {/* Voice Command */}
        <div className="px-3 py-2 border-b border-zinc-800/50">
          <button
            onClick={() => setListeningActive(!listeningActive)}
            className={cn(
              'w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-colors border-l-2',
              listeningActive
                ? 'bg-emerald-900/30 text-emerald-300 border-l-emerald-600'
                : 'bg-zinc-900/50 text-zinc-400 border-l-transparent hover:bg-zinc-900/70'
            )}
          >
            <Zap className="w-3 h-3" />
            <span className="font-mono uppercase flex-1 text-left">{listeningActive ? 'Listening' : 'Voice Command'}</span>
            <div className={cn('w-1.5 h-1.5 rounded-full', listeningActive ? 'bg-emerald-500' : 'bg-zinc-700')} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 bg-zinc-900/50 px-3 py-1 text-[8px] text-zinc-600 font-mono shrink-0">
        Ctrl+V PTT • ⚙ config
      </div>
    </div>
  );
}