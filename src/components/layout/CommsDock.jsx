import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Zap, Users, AlertCircle, X, Radio, MessageSquare } from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useVoiceNet } from '@/components/voice/VoiceNetProvider';

export default function CommsDock({ isOpen, onClose }) {
  const [channels, setChannels] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const activeOp = useActiveOp();
  const voiceNet = useVoiceNet();

  useEffect(() => {
    const loadData = async () => {
      try {
        const channelList = await base44.entities.Channel.list();
        setChannels(channelList.slice(0, 5));
        
        const users = await base44.entities.UserPresence.filter({ status: 'ONLINE' });
        setActiveUsers(users.length);
      } catch (error) {
        console.error('Error loading comms data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Dock */}
      <div
        className={`fixed lg:sticky top-0 right-0 h-screen lg:h-auto z-40 w-80 bg-zinc-900/95 border-l-2 border-zinc-800 flex flex-col transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="border-b-2 border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold uppercase tracking-wide text-white">Live Ops</h3>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Op Binding Status */}
          {activeOp.activeEvent && activeOp.binding && (
            <div className="border-l-2 border-orange-500 pl-3 py-2 bg-orange-500/5 rounded text-xs space-y-1">
              <div className="flex items-center gap-2 text-orange-400 font-semibold mb-1">
                <Activity className="w-3 h-3" />
                <span>OP BINDING</span>
              </div>
              {activeOp.binding.commsChannelId && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <MessageSquare className="w-3 h-3" />
                  <span>Channel: {channels.find((c) => c.id === activeOp.binding.commsChannelId)?.name || 'Unknown'}</span>
                </div>
              )}
              {activeOp.binding.voiceNetId && (
                <div className="flex items-center gap-2 text-zinc-400">
                  <Radio className="w-3 h-3" />
                  <span>Net: {voiceNet.voiceNets.find((n) => n.id === activeOp.binding.voiceNetId)?.name || 'Unknown'}</span>
                </div>
              )}
            </div>
          )}

          {/* Active Users */}
          <div className="border-l-2 border-orange-500 pl-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-orange-500" />
              <span className="text-xs uppercase tracking-widest text-zinc-400">Online Now</span>
            </div>
            <div className="text-2xl font-black text-white">{activeUsers}</div>
          </div>

          {/* Channels */}
          {!loading && channels.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-widest text-zinc-400 mb-2">
                Active Channels
              </div>
              <div className="space-y-1">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="px-3 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors cursor-pointer text-sm"
                  >
                    <div className="text-zinc-100">#{channel.name}</div>
                    <div className="text-xs text-zinc-500">{channel.type}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Alert */}
          <div className="border-l-2 border-red-500 pl-3 py-2 bg-red-500/5 rounded">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs uppercase tracking-widest text-zinc-400">System</span>
            </div>
            <div className="text-sm text-zinc-300">All systems nominal</div>
          </div>
        </div>
      </div>
    </>
  );
}