import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight, Lock, Unlock, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function VoiceChannelNavigator() {
  const [expandedEvents, setExpandedEvents] = React.useState(new Set());

  // Fetch all voice nets
  const { data: voiceNets = [] } = useQuery({
    queryKey: ['navigator-voice-nets'],
    queryFn: () => base44.entities.VoiceNet.list('-priority'),
    staleTime: 10000
  });

  // Fetch active events for context
  const { data: events = [] } = useQuery({
    queryKey: ['navigator-events'],
    queryFn: () => base44.entities.Event.filter({ status: 'active' }, '-updated_date', 50),
    staleTime: 10000
  });

  // Fetch recent messages for quick access
  const { data: recentMessages = [] } = useQuery({
    queryKey: ['navigator-recent-messages'],
    queryFn: () => base44.entities.Message.list('-updated_date', 10),
    staleTime: 30000
  });

  // Group nets by event_id (null for global/open)
  const groupedNets = React.useMemo(() => {
    const groups = { null: [] };
    
    voiceNets.forEach(net => {
      const eventId = net.event_id || null;
      if (!groups[eventId]) groups[eventId] = [];
      groups[eventId].push(net);
    });
    
    return groups;
  }, [voiceNets]);

  const toggleEventExpanded = (eventId) => {
    const newSet = new Set(expandedEvents);
    if (newSet.has(eventId)) {
      newSet.delete(eventId);
    } else {
      newSet.add(eventId);
    }
    setExpandedEvents(newSet);
  };

  const handleNetClick = (net) => {
    toast.info(`Joining ${net.code}...`, { duration: 2000 });
  };

  const getNetAccessBadge = (net) => {
    if (net.require_approval) {
      return <Lock className="w-2.5 h-2.5 text-amber-500" />;
    }
    if (net.discipline === 'focused') {
      return <Lock className="w-2.5 h-2.5 text-red-500" />;
    }
    return <Unlock className="w-2.5 h-2.5 text-emerald-500" />;
  };

  const getOpTypeBadge = (opType) => {
    const colors = {
      casual: 'bg-blue-950/40 text-blue-300 border-blue-700/30',
      focused: 'bg-red-950/40 text-red-300 border-red-700/30'
    };
    return colors[opType] || 'bg-zinc-800/40 text-zinc-300 border-zinc-700/30';
  };

  if (voiceNets.length === 0) {
    return (
      <div className="text-[10px] text-zinc-600 italic py-4 px-2">
        No active voice channels available.
      </div>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      {/* Voice Comms Management */}
      <div className="space-y-1 border-b border-zinc-800/50 pb-2">
        <div className="px-2 py-1 text-[8px] font-bold uppercase text-zinc-500 tracking-wider">
          Manage Comms
        </div>
        <div className="flex gap-1 px-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[8px] border-zinc-700 hover:border-[#ea580c] hover:text-[#ea580c]"
            onClick={() => toast.info('Create voice net coming soon', { duration: 2000 })}
          >
            <Plus className="w-3 h-3 mr-1" />
            Create Net
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-[8px] border-zinc-700 hover:border-zinc-600"
            onClick={() => toast.info('Net settings coming soon', { duration: 2000 })}
          >
            <Settings className="w-3 h-3 mr-1" />
            Settings
          </Button>
        </div>
      </div>

      {/* Global/Open Channels */}
      {groupedNets[null]?.length > 0 && (
        <div className="space-y-1">
          <div className="px-2 py-1 text-[8px] font-bold uppercase text-zinc-500 tracking-wider">
            Global
          </div>
          {groupedNets[null].map(net => (
            <button
              key={net.id}
              onClick={() => handleNetClick(net)}
              className={cn(
                'w-full px-2.5 py-1.5 rounded text-left transition-colors flex items-center justify-between gap-2',
                'bg-zinc-900/30 hover:bg-zinc-800/60 border border-zinc-800/50 hover:border-zinc-700/80'
              )}
              title={`${net.code}: ${net.label}`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full shrink-0',
                  net.discipline === 'focused' ? 'bg-red-600' : 'bg-emerald-600'
                )} />
                <span className="truncate text-zinc-300 font-medium">{net.code}</span>
              </div>
              {getNetAccessBadge(net)}
            </button>
          ))}
        </div>
      )}

      {/* Event-Grouped Channels */}
      {Object.entries(groupedNets)
        .filter(([eventId]) => eventId !== 'null' && eventId !== null)
        .map(([eventId, nets]) => {
          const event = events.find(e => e.id === eventId);
          const isExpanded = expandedEvents.has(eventId);
          
          return (
            <div key={eventId} className="space-y-1">
              <button
                onClick={() => toggleEventExpanded(eventId)}
                className={cn(
                  'w-full px-2 py-1 rounded text-left transition-colors flex items-center gap-1.5',
                  'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/40 border border-transparent hover:border-zinc-800/50'
                )}
              >
                <ChevronRight className={cn(
                  'w-3 h-3 shrink-0 transition-transform',
                  isExpanded && 'rotate-90'
                )} />
                <span className="text-[8px] font-bold uppercase truncate">
                  {event?.title || 'Event'}
                </span>
              </button>

              {isExpanded && (
                <div className="pl-3 space-y-1 border-l border-zinc-800/50">
                  {nets.map(net => (
                    <button
                      key={net.id}
                      onClick={() => handleNetClick(net)}
                      className={cn(
                        'w-full px-2 py-1 rounded text-left transition-colors flex items-center justify-between gap-2',
                        'bg-zinc-900/20 hover:bg-zinc-800/40 border border-zinc-800/30 hover:border-zinc-700/60'
                      )}
                      title={`${net.code}: ${net.label}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          net.discipline === 'focused' ? 'bg-red-500' : 'bg-emerald-500'
                        )} />
                        <span className="truncate text-zinc-300 text-[9px] font-medium">
                          {net.code}
                        </span>
                      </div>
                      {getNetAccessBadge(net)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}