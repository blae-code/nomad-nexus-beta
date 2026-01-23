import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zap, Radio, BookOpen, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OperationQuickActions from '@/components/command/OperationQuickActions';
import OperationPlaybook from '@/components/command/OperationPlaybook';
import CommsIntegrationPanel from '@/components/command/CommsIntegrationPanel';

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState('operations');

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

  const activeEvents = events.filter(e => e.status === 'active');
  const activeIncidents = incidents.filter(i => i.status === 'active');
  const criticalIncidents = activeIncidents.filter(i => i.severity === 'CRITICAL' || i.severity === 'HIGH');

  return (
    <div className="h-full flex flex-col bg-[#09090b] overflow-hidden">
      {/* Command Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-200 tracking-wide">COMMAND CENTER</h1>
            <p className="text-xs text-zinc-500 font-mono">Operational Control Interface</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 border border-zinc-800 bg-zinc-900/50">
              <Zap className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs text-zinc-400">Active Ops:</span>
              <span className="text-sm font-bold text-zinc-200">{activeEvents.length}</span>
            </div>
            {criticalIncidents.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-red-900/50 bg-red-950/30">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-red-300">Critical Incidents:</span>
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
              events={events}
              incidents={incidents}
            />
          </TabsContent>

          <TabsContent value="comms" className="h-full m-0 p-4">
            <CommsIntegrationPanel 
              voiceNets={voiceNets}
              channels={channels}
              events={activeEvents}
            />
          </TabsContent>

          <TabsContent value="playbook" className="h-full m-0 p-4">
            <OperationPlaybook user={user} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}