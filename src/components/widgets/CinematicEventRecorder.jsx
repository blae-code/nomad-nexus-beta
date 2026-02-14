import React, { useState } from 'react';
import { Video, X, Play, Square, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CinematicEventRecorder({ widgetId, onRemove, isDragging }) {
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState([
    { id: 1, title: 'Combat Highlight', duration: '00:45', size: '2.3 MB' },
    { id: 2, title: 'Landing Sequence', duration: '01:12', size: '4.1 MB' }
  ]);

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Video className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Recorder</span>
          {recording && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {clips.map(clip => (
          <div key={clip.id} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="text-xs font-bold text-zinc-300">{clip.title}</div>
                <div className="text-[9px] text-zinc-600 font-mono">{clip.duration} • {clip.size}</div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-5 w-5 text-zinc-600 hover:text-red-400">
                  <Play className="w-2.5 h-2.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-5 w-5 text-zinc-600 hover:text-red-400">
                  <Download className="w-2.5 h-2.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button
          size="sm"
          onClick={() => setRecording(!recording)}
          className={`w-full h-7 text-xs ${recording ? 'bg-red-600 hover:bg-red-500' : 'bg-zinc-800 hover:bg-zinc-700'}`}
        >
          {recording ? <Square className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
          {recording ? 'Stop Recording' : 'Start Recording'}
        </Button>
      </div>
    </div>
  );
}