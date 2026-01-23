import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Settings, Radio, Zap, Activity, AlertCircle, Wifi, VolumeX, Headphones, MicOff, UserCheck, MessageSquare, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [aiOptIn, setAiOptIn] = useState(true);
  const [aiTranscription, setAiTranscription] = useState(false);
  const [aiStatusInference, setAiStatusInference] = useState(false);
  const [aiAnomalyDetection, setAiAnomalyDetection] = useState(false);

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
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col bg-zinc-950/50 rounded overflow-hidden">
      {/* Main Controls - Compact */}
      <div className="space-y-0">
        {/* PTT & Quick Actions */}
        <div className="px-3 py-2 border-b border-zinc-800">
          {/* Single Row - Three Compact Buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => {
                // Toggle PTT mode on/off without triggering mic
                setMicEnabled(!micEnabled);
              }}
              disabled={isMuted}
              className={cn(
                'flex-1 flex items-center justify-center h-8 rounded font-bold uppercase text-[9px] transition-all gap-1.5',
                micEnabled && !isMuted
                  ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                  : isMuted
                  ? 'bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )}
              title="Toggle Push-to-Talk Mode"
            >
              <Radio className="w-3.5 h-3.5" />
              PTT
            </button>
            <button
              onClick={handleMute}
              className={cn(
                'flex-1 flex items-center justify-center h-8 rounded font-bold uppercase text-[9px] transition-all gap-1.5',
                isMuted
                  ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              {isMuted ? 'MUTED' : 'MUTE'}
            </button>
            <button
              onClick={handleDeafen}
              className={cn(
                'flex-1 flex items-center justify-center h-8 rounded font-bold uppercase text-[9px] transition-all gap-1.5',
                isDeafened
                  ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              {isDeafened ? <VolumeX className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
              {isDeafened ? 'DEAF' : 'DEAFEN'}
            </button>
          </div>
          
          {/* Input Level - Compact */}
          {micEnabled && !isMuted && (
            <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mt-2">
              <div
                className={cn("h-full transition-all rounded-full", 
                  inputLevel > 200 ? 'bg-red-500' : 
                  inputLevel > 100 ? 'bg-yellow-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(inputLevel, 255) / 255 * 100}%` }}
              />
            </div>
          )}

          {/* AI PTT Features Row - Only visible when AI is enabled */}
          {aiOptIn && (
            <div className="flex gap-1 mt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setAiTranscription(!aiTranscription)}
                    disabled={!aiOptIn}
                    className={cn(
                      'flex-1 flex items-center justify-center h-8 rounded font-bold uppercase text-[9px] transition-all gap-1.5',
                      aiTranscription && aiOptIn
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    )}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    TX
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-400">Real-time Transcription</p>
                    <p className="text-[10px] text-zinc-300">Automatically transcribes all PTT transmissions and voice communications in real-time. Useful for accessibility and maintaining chat logs.</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setAiStatusInference(!aiStatusInference)}
                    disabled={!aiOptIn}
                    className={cn(
                      'flex-1 flex items-center justify-center h-8 rounded font-bold uppercase text-[9px] transition-all gap-1.5',
                      aiStatusInference && aiOptIn
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    INF
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-400">Status Inference</p>
                    <p className="text-[10px] text-zinc-300">AI analyzes voice patterns and content to automatically update your status (Available, In-Call, AFK, etc.) without manual intervention.</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setAiAnomalyDetection(!aiAnomalyDetection)}
                    disabled={!aiOptIn}
                    className={cn(
                      'flex-1 flex items-center justify-center h-8 rounded font-bold uppercase text-[9px] transition-all gap-1.5',
                      aiAnomalyDetection && aiOptIn
                        ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    )}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    ADT
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-400">Anomaly Detection</p>
                    <p className="text-[10px] text-zinc-300">Monitors communication patterns for unusual activity, interference, jamming, or security threats. Alerts you to comms anomalies automatically.</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
          </div>

        {/* Audio Processing - Minimal Toggles */}
        <div className="px-3 py-2 border-b border-zinc-800">
          <div className="text-[7px] font-bold text-zinc-500 uppercase mb-1.5 tracking-wider">PROCESSING</div>
          <div className="flex gap-1">
            {[
              { 
                id: 'noise', 
                label: 'Noise', 
                state: noiseGate, 
                setState: setNoiseGate,
                description: 'Noise Gate: Automatically suppresses background noise below a threshold. Ideal for reducing ambient sounds like keyboard clicks and fan noise.',
                status: noiseGate ? 'Active' : 'Inactive'
              },
              { 
                id: 'echo', 
                label: 'Echo', 
                state: echoCancellation, 
                setState: setEchoCancellation,
                description: 'Echo Cancellation: Removes audio feedback loops and reverberations. Essential when using speakers instead of headphones.',
                status: echoCancellation ? 'Active' : 'Inactive'
              },
              { 
                id: 'gain', 
                label: 'Gain', 
                state: autoGain, 
                setState: setAutoGain,
                description: 'Auto Gain: Automatically adjusts microphone input levels to maintain consistent volume. Prevents sudden level spikes.',
                status: autoGain ? 'Active' : 'Inactive'
              }
            ].map(item => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => item.setState(!item.state)}
                    className={cn(
                      'flex-1 py-1 text-[8px] font-medium rounded transition-all',
                      item.state
                        ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50'
                        : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-400'
                    )}
                  >
                    {item.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-xs text-[#ea580c]">{item.label}</p>
                    <p className="text-xs text-zinc-200">{item.description}</p>
                    <p className="text-[10px] text-zinc-400 pt-1">Status: <span className={item.state ? 'text-emerald-400' : 'text-zinc-500'}>{item.status}</span></p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Volume Sliders - Compact */}
        <div className="px-3 py-2 space-y-2">
          {/* Mic */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Mic className="w-3 h-3 text-zinc-500" />
                <span className="text-[8px] text-zinc-400 uppercase">Input</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">{micVolume}%</span>
            </div>
            <Slider
              value={[micVolume]}
              onValueChange={(val) => setMicVolume(val[0])}
              max={100}
              step={1}
              disabled={isMuted}
              className="h-1"
            />
          </div>

          {/* Speaker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-zinc-500" />
                <span className="text-[8px] text-zinc-400 uppercase">Output</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-400">{speakerVolume}%</span>
            </div>
            <Slider
              value={[speakerVolume]}
              onValueChange={(val) => setSpeakerVolume(val[0])}
              max={100}
              step={1}
              disabled={isDeafened}
              className="h-1"
            />
          </div>
        </div>
      </div>

      {/* Footer - Communications & Shortcuts */}
      <div className="w-full border-t border-zinc-800 bg-zinc-900/50 py-2 space-y-1.5 px-3">
        {/* Keybind Hints */}
        <div className="text-[6px] text-zinc-600 font-mono flex items-center justify-center gap-3 whitespace-nowrap">
          <span>CTRL+V: PTT</span>
          <span>•</span>
          <span>CTRL+M: MUTE</span>
        </div>
        
        {/* Communication Tools */}
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex-1 py-1.5 px-2 text-[8px] font-medium rounded bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>DM</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-bold">Direct Messages</p>
              <p className="text-[10px] text-zinc-300">Quick access to 1-on-1 comms</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex-1 py-1.5 px-2 text-[8px] font-medium rounded bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center gap-1">
                <Radio className="w-3 h-3" />
                <span>CHANNEL</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-bold">Channel Chat</p>
              <p className="text-[10px] text-zinc-300">Text comms in current operation</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex-1 py-1.5 px-2 text-[8px] font-medium rounded bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all flex items-center justify-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>WHISPER</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-bold">Classified Comms</p>
              <p className="text-[10px] text-zinc-300">Encrypted role/rank targeted messages</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}