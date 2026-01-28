import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Radio, Users, MessageSquare, Signal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CommsIntegrationPanel({ voiceNets, channels, selectedEvent, userRole }) {
  const canManageComms = userRole.permissions.includes('comms_management');
  const canControlNets = userRole.permissions.includes('net_control');
  
  const activeNets = voiceNets.filter(n => n.status === 'active');
  const commandNets = activeNets.filter(n => n.type === 'command');
  const squadNets = activeNets.filter(n => n.type === 'squad');

  return (
    <div className="space-y-4">
      {/* Permission Indicator */}
      {(canManageComms || canControlNets) && (
        <div className="border border-blue-900/50 bg-blue-950/20 p-3">
          <p className="text-xs text-blue-300 font-bold">
            ✓ You have communications {canManageComms ? 'management' : 'control'} authority
          </p>
        </div>
      )}

      {/* Voice Net Status Grid */}
      <div className="border border-zinc-800 bg-zinc-950/50">
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">
            Voice Networks — {selectedEvent.title}
          </h3>
          <Link to={createPageUrl('CommsConsole')}>
            <Button size="sm" variant="outline" className="text-xs h-7">
              Open Comms Console
            </Button>
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Command Nets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Signal className="w-3.5 h-3.5 text-orange-500" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase">Command Nets</h4>
                <Badge variant="outline" className="text-[10px]">{commandNets.length}</Badge>
              </div>
              {commandNets.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No active command nets</p>
              ) : (
                commandNets.map(net => (
                  <NetCard key={net.id} net={net} />
                ))
              )}
            </div>

            {/* Squad Nets */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                <h4 className="text-xs font-bold text-zinc-300 uppercase">Squad Nets</h4>
                <Badge variant="outline" className="text-[10px]">{squadNets.length}</Badge>
              </div>
              {squadNets.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">No active squad nets</p>
              ) : (
                squadNets.slice(0, 5).map(net => (
                  <NetCard key={net.id} net={net} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Text Channels */}
      <div className="border border-zinc-800 bg-zinc-950/50">
        <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wide">Text Channels</h3>
          <Link to={createPageUrl('Channels')}>
            <Button size="sm" variant="outline" className="text-xs h-7">
              Open Channels
            </Button>
          </Link>
        </div>
        <div className="p-4 space-y-2">
          {channels.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No channels available</p>
          ) : (
            channels.slice(0, 8).map(channel => (
              <Link key={channel.id} to={createPageUrl('Channels')}>
                <div className="flex items-center justify-between p-2 border border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-xs text-zinc-200">{channel.name}</span>
                  </div>
                  {channel.is_private && (
                    <Badge variant="outline" className="text-[10px]">Private</Badge>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>



      {/* Quick Comms Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={createPageUrl('CommsConsole')}>
          <Button className="w-full h-16 flex flex-col gap-2 bg-blue-950/50 border border-blue-900/50 hover:bg-blue-900/30">
            <Radio className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold">VOICE NETS</span>
          </Button>
        </Link>
        <Link to={createPageUrl('Channels')}>
          <Button className="w-full h-16 flex flex-col gap-2 bg-purple-950/50 border border-purple-900/50 hover:bg-purple-900/30">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold">TEXT CHANNELS</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}

function NetCard({ net }) {
  const priorityColors = {
    1: 'border-red-900/50 bg-red-950/20',
    2: 'border-orange-900/50 bg-orange-950/20',
    3: 'border-zinc-800 bg-zinc-900/30'
  };

  return (
    <div className={`p-2 border ${priorityColors[net.priority] || priorityColors[3]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-zinc-400" />
          <div>
            <div className="text-xs font-bold text-zinc-200">{net.code}</div>
            <div className="text-[10px] text-zinc-500">{net.label}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${net.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          <span className="text-[10px] text-zinc-400">{net.discipline}</span>
        </div>
      </div>
    </div>
  );
}