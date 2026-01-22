import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Settings, Radio, Zap, Activity, AlertCircle, Wifi, VolumeX, Headphones, MicOff, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY } from '@/components/utils/typographySystem';
import { useVoiceAudio } from '@/components/hooks/useVoiceAudio';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

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
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);

  // Fetch online users for presence indicator
  const { data: onlineUsers = [] } = useQuery({
    queryKey: ['userPresence'],
    queryFn: async () => {
      const presence = await base44.entities.UserPresence.list();
      return presence.filter(p => p.status !== 'offline');
    },
    refetchInterval: 5000
  });

  // PTT activation and keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'v' && e.ctrlKey && !isMuted) {
        e.preventDefault();
        setMicEnabled(true);
        setVoiceActive(true);
      }
      if (e.key === 'm' && e.ctrlKey) {
        e.preventDefault();
        handleMute();
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
  }, [isMuted]);

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

  const handleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) setMicEnabled(false);
  };

  const handleDeafen = () => {
    setIsDeafened(!isDeafened);
    if (!isDeafened) {
      setIsMuted(true);
      setMicEnabled(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border border-zinc-800 overflow-hidden">
      {/* Header with Status */}
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-[#ea580c]" />
            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">VOICE COMMS</span>
          </div>
          <Badge className="text-[7px] bg-zinc-800 text-zinc-300 border-zinc-700">
            <UserCheck className="w-2.5 h-2.5 mr-1" />
            {onlineUsers.length}
          </Badge>
        </div>
        
        {/* Quick Status Indicators */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className={cn('w-1.5 h-1.5 rounded-full', 
              voiceActive ? 'bg-red-500 animate-pulse' : 
              micEnabled && !isMuted ? 'bg-emerald-500' : 'bg-zinc-700'
            )} />
            <span className="text-[8px] text-zinc-500 font-mono">
              {voiceActive ? 'TX' : micEnabled && !isMuted ? 'READY' : 'IDLE'}
            </span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <div className="flex items-center gap-1">
            <div className={cn('w-1.5 h-1.5 rounded-full', getQualityColor())} />
            <span className="text-[8px] text-zinc-500 font-mono">{signalQuality.toUpperCase()}</span>
          </div>
          <div className="h-3 w-px bg-zinc-800" />
          <span className={cn('text-[8px] font-mono', getLatencyColor())}>{Math.round(latency)}ms</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-0">
        {/* PTT & Quick Controls */}
        <div className="px-3 py-2 border-b border-zinc-800 space-y-2">
          {/* PTT Button */}
          <button
            onMouseDown={() => {
              if (!isMuted) {
                setMicEnabled(true);
                setVoiceActive(true);
              }
            }}
            onMouseUp={() => setVoiceActive(false)}
            onMouseLeave={() => setVoiceActive(false)}
            disabled={isMuted}
            className={cn(
              'w-full h-9 font-bold uppercase text-xs transition-all border flex items-center justify-center gap-2',
              voiceActive
                ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50'
                : isMuted
                ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-zinc-900/70 border-zinc-700 text-zinc-300 hover:border-[#ea580c] hover:text-white'
            )}
          >
            <Mic className="w-3.5 h-3.5" />
            {voiceActive ? 'TRANSMITTING' : isMuted ? 'MUTED' : 'PUSH TO TALK'}
          </button>
          
          {/* Input Level Bar */}
          {micEnabled && !isMuted && (
            <div className="h-1.5 bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className={cn("h-full transition-all", 
                  inputLevel > 200 ? 'bg-red-500' : 
                  inputLevel > 100 ? 'bg-[#ea580c]' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(inputLevel, 255) / 255 * 100}%` }}
              />
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleMute}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-bold uppercase transition-all border',
                isMuted
                  ? 'bg-red-900/40 border-red-700 text-red-300'
                  : 'bg-zinc-900/70 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              )}
            >
              {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              {isMuted ? 'MUTED' : 'MUTE'}
            </button>
            <button
              onClick={handleDeafen}
              className={cn(
                'flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-bold uppercase transition-all border',
                isDeafened
                  ? 'bg-red-900/40 border-red-700 text-red-300'
                  : 'bg-zinc-900/70 border-zinc-700 text-zinc-400 hover:border-zinc-600'
              )}
            >
              {isDeafened ? <VolumeX className="w-3 h-3" /> : <Headphones className="w-3 h-3" />}
              {isDeafened ? 'DEAF' : 'DEAFEN'}
            </button>
          </div>
        </div>

        {/* Connection Stats */}
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="text-[8px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">CONNECTION</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900/50 border border-zinc-800 p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Wifi className="w-3 h-3 text-zinc-500" />
                <span className="text-[7px] text-zinc-500 uppercase">Signal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', getQualityColor())} />
                <span className="text-[9px] font-mono text-zinc-200">{signalQuality.toUpperCase()}</span>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 p-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Activity className="w-3 h-3 text-zinc-500" />
                <span className="text-[7px] text-zinc-500 uppercase">Latency</span>
              </div>
              <span className={cn('text-[9px] font-mono font-bold', getLatencyColor())}>{Math.round(latency)}ms</span>
            </div>
          </div>
        </div>

        {/* Audio Processing Section */}
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="text-[8px] font-bold text-zinc-500 uppercase mb-2 tracking-wider">AUDIO PROCESSING</div>
          <div className="space-y-1.5">
            {[
              { id: 'noise', label: 'Noise Gate', state: noiseGate, setState: setNoiseGate, desc: 'Cuts background noise' },
              { id: 'echo', label: 'Echo Cancel', state: echoCancellation, setState: setEchoCancellation, desc: 'Removes echo' },
              { id: 'gain', label: 'Auto Gain', state: autoGain, setState: setAutoGain, desc: 'Normalizes volume' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => item.setState(!item.state)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-[9px] transition-all border-l-2',
                  item.state
                    ? 'bg-emerald-950/40 text-emerald-300 border-l-emerald-500 border border-emerald-900/30'
                    : 'bg-zinc-900/50 text-zinc-500 border-l-transparent border border-zinc-800/50 hover:bg-zinc-900'
                )}
              >
                <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', item.state ? 'bg-emerald-500' : 'bg-zinc-600')} />
                <div className="flex-1 text-left">
                  <div className="font-bold">{item.label}</div>
                  <div className="text-[7px] text-zinc-600">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Volume Controls */}
        <div className="px-3 py-2 border-b border-zinc-800 space-y-3">
          <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">AUDIO LEVELS</div>
          
          {/* Mic Volume */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Mic className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] text-zinc-400 font-mono">INPUT</span>
              </div>
              <Badge className="text-[7px] bg-zinc-800 text-zinc-300 border-zinc-700 font-mono">{micVolume}%</Badge>
            </div>
            <Slider
              value={[micVolume]}
              onValueChange={(val) => setMicVolume(val[0])}
              max={100}
              step={1}
              disabled={isMuted}
              className="h-1.5"
            />
          </div>

          {/* Speaker Volume */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] text-zinc-400 font-mono">OUTPUT</span>
              </div>
              <Badge className="text-[7px] bg-zinc-800 text-zinc-300 border-zinc-700 font-mono">{speakerVolume}%</Badge>
            </div>
            <Slider
              value={[speakerVolume]}
              onValueChange={(val) => setSpeakerVolume(val[0])}
              max={100}
              step={1}
              disabled={isDeafened}
              className="h-1.5"
            />
          </div>
        </div>

        {/* Voice Command */}
        <div className="px-3 py-2">
          <button
            onClick={() => setListeningActive(!listeningActive)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-2 text-[9px] font-bold uppercase transition-all border-l-2',
              listeningActive
                ? 'bg-emerald-950/50 text-emerald-300 border-l-emerald-500 border border-emerald-900/30'
                : 'bg-zinc-900/70 text-zinc-400 border-l-transparent border border-zinc-800 hover:bg-zinc-900'
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="flex-1 text-left tracking-wider">
              {listeningActive ? 'AI LISTENING...' : 'VOICE COMMAND'}
            </span>
            <div className={cn('w-2 h-2 rounded-full', 
              listeningActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'
            )} />
          </button>
        </div>
      </div>

      {/* Footer with Keybinds */}
      <div className="border-t border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-[8px] text-zinc-500 font-mono shrink-0 space-y-0.5">
        <div className="flex items-center justify-between">
          <span>CTRL+V</span>
          <span className="text-zinc-600">Push to Talk</span>
        </div>
        <div className="flex items-center justify-between">
          <span>CTRL+M</span>
          <span className="text-zinc-600">Toggle Mute</span>
        </div>
      </div>
    </div>
  );
}