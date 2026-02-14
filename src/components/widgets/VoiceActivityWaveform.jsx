import React, { useState, useEffect } from 'react';
import { Mic, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';

export default function VoiceActivityWaveform({ widgetId, onRemove, isDragging }) {
  const [waveform, setWaveform] = useState([]);
  const voiceNet = useVoiceNet();

  useEffect(() => {
    const interval = setInterval(() => {
      const isSpeaking = voiceNet?.pttActive || false;
      setWaveform(prev => {
        const amplitude = isSpeaking ? 0.5 + Math.random() * 0.5 : Math.random() * 0.1;
        return [...prev.slice(-49), amplitude];
      });
    }, 50);
    return () => clearInterval(interval);
  }, [voiceNet?.pttActive]);

  return (
    <div className="h-full flex flex-col bg-black/98 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Waveform</span>
          {voiceNet?.pttActive && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full h-24 flex items-end gap-0.5">
          {waveform.map((amplitude, i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-red-700 to-red-500 rounded-t transition-all duration-50"
              style={{ height: `${amplitude * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex justify-between text-[9px] text-zinc-500 relative z-10">
        <span className="flex items-center gap-1">
          <Volume2 className="w-2.5 h-2.5" />
          {voiceNet?.micEnabled ? 'Active' : 'Muted'}
        </span>
        <span>{voiceNet?.activeNetId || 'Offline'}</span>
      </div>
    </div>
  );
}