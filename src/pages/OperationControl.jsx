import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Users, Target, Clock, AlertCircle, Settings, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import OperationHeader from '@/components/operations/OperationHeader';
import OperationVoiceNetPanel from '@/components/operations/OperationVoiceNetPanel';
import OperationObjectives from '@/components/operations/OperationObjectives';
import OperationParticipants from '@/components/operations/OperationParticipants';
import OperationTimeline from '@/components/operations/OperationTimeline';
import HierarchicalCommsVisualizer from '@/components/operations/HierarchicalCommsVisualizer';
import HailingSystem from '@/components/operations/HailingSystem';
import CommsNetworkManager from '@/components/operations/CommsNetworkManager';
import LoadingState from '@/components/feedback/LoadingState';

/**
 * Operation Control - Bespoke space for conducting operations
 * Immersive dashboard with voice nets, objectives, participants, and tactical info
 */
export default function OperationControlPage() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get('id');

  const [activePanel, setActivePanel] = useState('hierarchy'); // hierarchy, network, hailing, objectives, participants, timeline
  const [expandedNet, setExpandedNet] = useState(null);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch event with all related data
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['operation-detail', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const e = await base44.entities.Event.filter({ id: eventId });
      return e[0] || null;
    },
    enabled: !!eventId
  });

  const { data: voiceNets } = useQuery({
    queryKey: ['operation-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: squads } = useQuery({
    queryKey: ['operation-squads', eventId],
    queryFn: () => base44.entities.Squad.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { data: participants } = useQuery({
    queryKey: ['operation-participants', eventId],
    queryFn: async () => {
      if (!event?.assigned_user_ids) return [];
      const users = await Promise.all(
        event.assigned_user_ids.map(uid => base44.entities.User.list().then(all => all.find(u => u.id === uid)))
      );
      return users.filter(Boolean);
    },
    enabled: !!event
  });

  const { data: logs } = useQuery({
    queryKey: ['operation-logs', eventId],
    queryFn: () => base44.entities.EventLog.filter({ event_id: eventId }).then(all => 
      all.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    ),
    enabled: !!eventId
  });

  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#ea580c] mx-auto" />
          <p className="text-sm font-bold">OPERATION NOT FOUND</p>
          <Button onClick={() => navigate('/events')} variant="outline" className="text-xs h-7">
            BACK TO OPERATIONS
          </Button>
        </div>
      </div>
    );
  }

  if (eventLoading) return <LoadingState message="LOADING OPERATION DATA" />;
  if (!event) return <LoadingState message="OPERATION NOT ACCESSIBLE" />;

  const commandNet = voiceNets?.find(n => n.type === 'command');
  const squadNets = voiceNets?.filter(n => n.type === 'squad') || [];
  const generalNet = voiceNets?.find(n => n.type === 'general');

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col overflow-hidden">
      {/* Header with operation context */}
      <OperationHeader 
        event={event}
        participants={participants || []}
        onBack={() => navigate('/events')}
      />

      {/* Main Grid: Voice Nets (Left) + Content (Right) */}
      <div className="flex-1 overflow-hidden flex gap-2 p-2">
        {/* Voice Net Sidebar - Immersive */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-64 flex flex-col gap-2 overflow-hidden flex-shrink-0"
        >
          <OperationVoiceNetPanel
            commandNet={commandNet}
            squadNets={squadNets}
            generalNet={generalNet}
            expandedNet={expandedNet}
            onSelectNet={setExpandedNet}
          />
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-hidden flex flex-col border border-zinc-800 bg-zinc-950/50"
        >
          {/* Panel Tabs */}
          <div className="flex gap-0 border-b border-zinc-800 overflow-x-auto shrink-0 bg-zinc-900/30">
            {[
              { id: 'hierarchy', label: 'HIERARCHY', icon: Radio },
              { id: 'network', label: 'MANAGER', icon: Settings },
              { id: 'hailing', label: 'HAILING', icon: Volume2 },
              { id: 'objectives', label: 'OBJECTIVES', icon: Target },
              { id: 'participants', label: 'ROSTER', icon: Users },
              { id: 'timeline', label: 'TIMELINE', icon: Clock },
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActivePanel(tab.id)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-[7px] font-bold uppercase tracking-wider transition-all duration-100 whitespace-nowrap border-b-2',
                    activePanel === tab.id
                      ? 'text-white bg-zinc-900 border-b-[#ea580c]'
                      : 'text-zinc-500 border-b-transparent hover:text-zinc-300'
                  )}
                >
                  <TabIcon className="w-3 h-3" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              {activePanel === 'hierarchy' && (
                <motion.div
                  key="hierarchy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  <HierarchicalCommsVisualizer eventId={eventId} currentUser={currentUser} />
                </motion.div>
              )}

              {activePanel === 'network' && (
                <motion.div
                  key="network"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  <CommsNetworkManager 
                    eventId={eventId} 
                    currentUser={currentUser} 
                    canEdit={event?.command_staff?.commander_id === currentUser?.id}
                  />
                </motion.div>
              )}

              {activePanel === 'hailing' && (
                <motion.div
                  key="hailing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 h-full overflow-auto"
                >
                  <HailingSystem eventId={eventId} currentUser={currentUser} />
                </motion.div>
              )}

              {activePanel === 'objectives' && (
                <motion.div
                  key="objectives"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3"
                >
                  <OperationObjectives event={event} />
                </motion.div>
              )}

              {activePanel === 'participants' && (
                <motion.div
                  key="participants"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3"
                >
                  <OperationParticipants 
                    participants={participants || []}
                    squads={squads || []}
                  />
                </motion.div>
              )}

              {activePanel === 'timeline' && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3"
                >
                  <OperationTimeline logs={logs || []} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/**
 * Voice Net Detail Card
 */
function NetDetailCard({ net, isCommand, isGeneral }) {
  const [isJoined, setIsJoined] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'border rounded p-2.5 transition-all group cursor-pointer',
        isCommand && 'border-red-900/50 bg-red-950/20 hover:bg-red-950/40',
        isGeneral && 'border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50',
        !isCommand && !isGeneral && 'border-blue-900/50 bg-blue-950/20 hover:bg-blue-950/40'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Radio className={cn(
            'w-3 h-3',
            isCommand && 'text-red-400',
            isGeneral && 'text-zinc-400',
            !isCommand && !isGeneral && 'text-blue-400'
          )} />
          <div>
            <div className="font-bold text-xs text-white">{net.code}</div>
            <div className="text-[8px] text-zinc-400">{net.label}</div>
          </div>
        </div>
        <Badge className={cn(
          'text-[7px] px-1.5 py-0.5',
          isCommand && 'bg-red-900/50 text-red-300',
          isGeneral && 'bg-zinc-800 text-zinc-300',
          !isCommand && !isGeneral && 'bg-blue-900/50 text-blue-300'
        )}>
          {net.discipline.toUpperCase()}
        </Badge>
      </div>

      {net.description && (
        <p className="text-[8px] text-zinc-400 mb-2">{net.description}</p>
      )}

      <div className="flex items-center gap-1 text-[7px]">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsJoined(!isJoined)}
          className={cn(
            'h-5 text-[7px] px-2 flex-1',
            isJoined && 'bg-[#ea580c] text-white border-[#ea580c]'
          )}
        >
          <Volume2 className="w-2.5 h-2.5 mr-0.5" />
          {isJoined ? 'IN NET' : 'JOIN'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-5 w-5 p-0"
        >
          <Settings className="w-2.5 h-2.5" />
        </Button>
      </div>
    </motion.div>
  );
}