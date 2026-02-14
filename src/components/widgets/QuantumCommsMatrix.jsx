import React, { useState, useEffect } from 'react';
import { Radio, X, Volume2, Mic as MicIcon, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';
import { base44 } from '@/api/base44Client';

export default function QuantumCommsMatrix({ widgetId, onRemove, isDragging }) {
  const voiceNet = useVoiceNet();
  const [channels, setChannels] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    loadChannels();
    const interval = setInterval(loadUnread, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadChannels = async () => {
    try {
      const chans = await base44.entities.Channel.filter({ type: 'text' }, '-last_message_at', 5);
      setChannels(chans || []);
    } catch (err) {
      console.error('Channels load failed:', err);
    }
  };

  const loadUnread = async () => {
    // Simulated unread logic - replace with actual implementation
    const counts = {};
    channels.forEach(ch => counts[ch.id] = Math.floor(Math.random() * 5));
    setUnreadCounts(counts);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(220,38,38,0.02)_0px,rgba(220,38,38,0.02)_1px,transparent_1px,transparent_4px)] pointer-events-none" />
      
      {/* Header */}
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Comms Matrix</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Voice Status */}
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/40 border-b border-zinc-800/60 relative z-10">
        {voiceNet?.activeNetId ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider">
                {voiceNet.activeNetId}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500">
              <UsersIcon className="w-2.5 h-2.5" />
              <span>{voiceNet.participants?.length || 0}</span>
              <MicIcon className={`w-2.5 h-2.5 ml-1 ${voiceNet.pttActive ? 'text-red-500' : ''}`} />
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-zinc-600 uppercase tracking-wider text-center">
            Voice Offline
          </div>
        )}
      </div>

      {/* Text Channels */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {channels.map(channel => {
          const unread = unreadCounts[channel.id] || 0;
          return (
            <div
              key={channel.id}
              className="p-2 bg-zinc-900/40 border border-zinc-700/40 hover:border-red-700/60 rounded cursor-pointer transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-red-500 transition-colors" />
                  <span className="text-xs text-zinc-300 group-hover:text-red-300 font-mono">
                    #{channel.name}
                  </span>
                </div>
                {unread > 0 && (
                  <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">{unread}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {channels.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            No channels available
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm flex gap-2 relative z-10">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] border-red-700/40 hover:border-red-500/60">
          <Volume2 className="w-3 h-3 mr-1" /> Voice
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-7 text-[10px] border-red-700/40 hover:border-red-500/60">
          <Radio className="w-3 h-3 mr-1" /> Nets
        </Button>
      </div>
    </div>
  );
}