import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Radio, BookOpen, AlertCircle, Shield, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import OperationQuickActions from '@/components/command/OperationQuickActions';
import OperationPlaybook from '@/components/command/OperationPlaybook';
import CommsIntegrationPanel from '@/components/command/CommsIntegrationPanel';
import { getUserRankValue } from '@/components/utils/rankUtils';

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState('operations');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-created_date', 50),
    refetchInterval: 5000
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date', 50),
    refetchInterval: 5000
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voiceNets'],
    queryFn: () => base44.entities.VoiceNet.list(),
    refetchInterval: 3000
  });

  const { data: channels = [] } = useQuery({
    queryKey: ['channels'],
    queryFn: () => base44.entities.Channel.list(),
    refetchInterval: 5000
  });

  const activeEvents = events.filter(e => e.status === 'active' || e.status === 'scheduled');
  const selectedEvent = activeEvents.find(e => e.id === selectedEventId) || activeEvents[0];
  const activeIncidents = incidents.filter(i => i.status === 'active');
  const criticalIncidents = activeIncidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');

  // Determine user's role in the selected operation
  const userRole = useMemo(() => {
    if (!user || !selectedEvent) return { type: 'participant', permissions: [] };

    const rankValue = getUserRankValue(user.rank);
    const isCommander = selectedEvent.command_staff?.commander_id === user.id;
    const isXO = selectedEvent.command_staff?.xo_id === user.id;
    const isCommsOfficer = selectedEvent.command_staff?.comms_officer_id === user.id;
    const isAssigned = selectedEvent.assigned_user_ids?.includes(user.id);

    // Determine role type and permissions
    if (isCommander) {
      return {
        type: 'commander',
        label: 'EVENT COMMANDER',
        permissions: ['full_control', 'phase_transitions', 'comms_management', 'personnel_assignment', 'broadcast']
      };
    } else if (isXO) {
      return {
        type: 'xo',
        label: 'EXECUTIVE OFFICER',
        permissions: ['tactical_control', 'personnel_assignment', 'comms_management', 'broadcast']
      };
    } else if (isCommsOfficer) {
      return {
        type: 'comms',
        label: 'COMMS OFFICER',
        permissions: ['comms_management', 'broadcast', 'net_control']
      };
    } else if (rankValue >= 4) { // Voyager or higher
      return {
        type: 'leadership',
        label: user.rank.toUpperCase(),
        permissions: ['tactical_view', 'broadcast', 'incident_response']
      };
    } else if (isAssigned) {
      return {
        type: 'assigned',
        label: 'ASSIGNED PERSONNEL',
        permissions: ['tactical_view', 'status_updates']
      };
    } else {
      return {
        type: 'observer',
        label: 'OBSERVER',
        permissions: ['tactical_view']
      };
    }
  }, [user, selectedEvent]);

  const roleColors = {
    commander: 'text-red-400 border-red-900/50 bg-red-950/30',
    xo: 'text-orange-400 border-orange-900/50 bg-orange-950/30',
    comms: 'text-blue-400 border-blue-900/50 bg-blue-950/30',
    leadership: 'text-purple-400 border-purple-900/50 bg-purple-950/30',
    assigned: 'text-emerald-400 border-emerald-900/50 bg-emerald-950/30',
    observer: 'text-zinc-400 border-zinc-800 bg-zinc-900/30'
  };

  if (!selectedEvent) {
    return (
      <div className="h-full flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-zinc-400 mb-2">NO ACTIVE OPERATIONS</h2>
          <p className="text-xs text-zinc-600">Command Center requires an active operation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#09090b] overflow-hidden">
      {/* Command Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-zinc-200 tracking-wide">COMMAND CENTER</h1>
            <p className="text-xs text-zinc-500 font-mono">Operational Control Interface</p>
          </div>

          {/* Operation Selector */}
          <div className="flex items-center gap-3">
            <Select value={selectedEventId || selectedEvent.id} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-64 bg-zinc-900 border-zinc-800">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs font-bold truncate">{selectedEvent.title}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {activeEvents.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{event.title}</span>
                      <Badge variant="outline" className="text-[10px]">{event.status}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* User Role Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 border ${roleColors[userRole.type]}`}>
              <Shield className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{userRole.label}</span>
            </div>

            {criticalIncidents.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-red-900/50 bg-red-950/30">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-300">Critical:</span>
                <span className="text-sm font-bold text-red-200">{criticalIncidents.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start border-b border-zinc-800 bg-zinc-950/50 rounded-none px-4 h-10">
          <TabsTrigger value="operations" className="gap-2">
            <Zap className="w-3.5 h-3.5" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="comms" className="gap-2">
            <Radio className="w-3.5 h-3.5" />
            Communications
          </TabsTrigger>
          <TabsTrigger value="playbook" className="gap-2">
            <BookOpen className="w-3.5 h-3.5" />
            Playbook
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto">
          <TabsContent value="operations" className="h-full m-0 p-4">
            <OperationQuickActions 
              user={user}
              selectedEvent={selectedEvent}
              events={events}
              incidents={incidents}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="comms" className="h-full m-0 p-4">
            <CommsIntegrationPanel 
              voiceNets={voiceNets.filter(n => n.event_id === selectedEvent.id)}
              channels={channels}
              selectedEvent={selectedEvent}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="playbook" className="h-full m-0 p-4">
            <OperationPlaybook 
              user={user} 
              selectedEvent={selectedEvent}
              userRole={userRole}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}