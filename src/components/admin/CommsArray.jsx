import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Radio, Network, Trash2, Wand2, Power, Lock, Unlock,
  Settings, Shield, AlertTriangle, CheckCircle, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function CommsArray() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [provisionStatus, setProvisionStatus] = useState(null);
  const queryClient = useQueryClient();

  // Data queries
  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => base44.entities.Event.list('-created_date', 50)
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voice-nets', selectedEventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: selectedEventId }),
    enabled: !!selectedEventId,
    refetchInterval: 5000
  });

  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  // Mutations
  const provisionMutation = useMutation({
    mutationFn: async (eventId) => {
      const res = await base44.functions.invoke('provisionCommsFromFormation', { eventId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['voice-nets']);
      setProvisionStatus({ success: true, data });
      toast.success(`Provisioned ${data.summary?.total || 0} nets`);
    },
    onError: (error) => {
      setProvisionStatus({ success: false, error: error.message });
      toast.error('Provisioning failed');
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async (eventId) => {
      const nets = await base44.asServiceRole.entities.VoiceNet.filter({ event_id: eventId });
      await Promise.all(nets.map(net => base44.asServiceRole.entities.VoiceNet.delete(net.id)));
      return nets.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries(['voice-nets']);
      setProvisionStatus(null);
      toast.success(`Deleted ${count} nets`);
    }
  });

  const updateNetMutation = useMutation({
    mutationFn: async ({ netId, data }) => {
      await base44.asServiceRole.entities.VoiceNet.update(netId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['voice-nets']);
      toast.success('Net updated');
    }
  });

  // Handlers
  const handleProvision = () => {
    if (!selectedEventId) return;
    setProvisionStatus(null);
    provisionMutation.mutate(selectedEventId);
  };

  const handleDeleteAll = () => {
    if (!selectedEventId || voiceNets.length === 0) return;
    if (confirm(`Delete all ${voiceNets.length} nets for this event?`)) {
      deleteAllMutation.mutate(selectedEventId);
    }
  };

  const toggleNetStatus = (net) => {
    updateNetMutation.mutate({
      netId: net.id,
      data: { status: net.status === 'active' ? 'inactive' : 'active' }
    });
  };

  const toggleDiscipline = (net) => {
    updateNetMutation.mutate({
      netId: net.id,
      data: { discipline: net.discipline === 'casual' ? 'focused' : 'casual' }
    });
  };

  const toggleStageMode = (net) => {
    updateNetMutation.mutate({
      netId: net.id,
      data: { stage_mode: !net.stage_mode }
    });
  };

  // Stats
  const fleets = squads.filter(u => u.hierarchy_level === 'fleet');
  const wings = squads.filter(u => u.hierarchy_level === 'wing');
  const regularSquads = squads.filter(u => u.hierarchy_level === 'squad' || !u.hierarchy_level);
  const expectedNetCount = fleets.length + wings.length + regularSquads.length + 2;

  const netsByType = {
    command: voiceNets.filter(n => n.type === 'command'),
    squad: voiceNets.filter(n => n.type === 'squad'),
    support: voiceNets.filter(n => n.type === 'support'),
    general: voiceNets.filter(n => n.type === 'general')
  };

  return (
    <div className="space-y-4">
      {/* Header & Event Selector */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase text-zinc-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#ea580c]" />
            Communications Array Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 uppercase font-bold mb-1.5 block">Target Event</label>
            <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 h-9">
                <SelectValue placeholder="Select event to manage..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} — {new Date(event.start_time).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEventId && (
            <div className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800 rounded text-xs">
              <span className="text-zinc-400">Active Nets:</span>
              <span className="font-bold text-white">{voiceNets.length}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formation Preview */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase text-zinc-300 flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-500" />
            Formation Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="bg-zinc-900/50 border border-amber-900/30 p-3 rounded text-center">
              <div className="text-2xl font-black text-amber-500">{fleets.length}</div>
              <div className="text-[9px] text-zinc-500 uppercase mt-1">Fleets</div>
            </div>
            <div className="bg-zinc-900/50 border border-cyan-900/30 p-3 rounded text-center">
              <div className="text-2xl font-black text-cyan-500">{wings.length}</div>
              <div className="text-[9px] text-zinc-500 uppercase mt-1">Wings</div>
            </div>
            <div className="bg-zinc-900/50 border border-emerald-900/30 p-3 rounded text-center">
              <div className="text-2xl font-black text-emerald-500">{regularSquads.length}</div>
              <div className="text-[9px] text-zinc-500 uppercase mt-1">Squads</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-700 p-3 rounded text-center">
              <div className="text-2xl font-black text-zinc-400">2</div>
              <div className="text-[9px] text-zinc-500 uppercase mt-1">Support</div>
            </div>
          </div>
          
          <div className="text-xs text-zinc-500 p-2 bg-zinc-900/30 border border-zinc-800 rounded font-mono">
            Expected: <span className="text-emerald-500 font-bold">{expectedNetCount} nets</span>
          </div>
        </CardContent>
      </Card>

      {/* Provision Controls */}
      {selectedEventId && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-zinc-300 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-emerald-500" />
              Provisioning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button
                onClick={handleProvision}
                disabled={provisionMutation.isPending || voiceNets.length > 0}
                className="flex-1 bg-emerald-900 hover:bg-emerald-800 h-9 text-xs"
              >
                {provisionMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5 mr-2" />
                    Auto-Provision
                  </>
                )}
              </Button>

              {voiceNets.length > 0 && (
                <Button
                  onClick={handleDeleteAll}
                  disabled={deleteAllMutation.isPending}
                  variant="destructive"
                  className="h-9 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Delete All
                </Button>
              )}
            </div>

            {voiceNets.length > 0 && (
              <div className="text-xs text-amber-500 p-2 bg-amber-950/20 border border-amber-900/30 rounded">
                ⚠️ Nets exist. Delete all to re-provision.
              </div>
            )}

            {provisionStatus && (
              <div className={cn(
                "p-3 rounded border text-xs",
                provisionStatus.success 
                  ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" 
                  : "bg-red-950/20 border-red-900/30 text-red-400"
              )}>
                <div className="flex items-center gap-2 mb-2 font-bold">
                  {provisionStatus.success ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  )}
                  {provisionStatus.success ? 'Success' : 'Failed'}
                </div>
                {provisionStatus.success && provisionStatus.data?.summary && (
                  <div className="space-y-0.5 font-mono text-[10px]">
                    <div>Fleet: {provisionStatus.data.summary.fleet_command || 0}</div>
                    <div>Wings: {provisionStatus.data.summary.wings || 0}</div>
                    <div>Squads: {provisionStatus.data.summary.squads || 0}</div>
                    <div>Support: {provisionStatus.data.summary.support || 0}</div>
                    <div className="font-bold pt-1 border-t border-zinc-800 mt-1">
                      Total: {provisionStatus.data.summary.total || 0}
                    </div>
                  </div>
                )}
                {!provisionStatus.success && (
                  <div className="font-mono text-[10px]">{provisionStatus.error}</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Net Grid */}
      {selectedEventId && voiceNets.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase text-zinc-300 flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-500" />
              Active Nets ({voiceNets.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {Object.entries(netsByType).map(([type, nets]) => (
                  nets.length > 0 && (
                    <div key={type}>
                      <div className="text-[9px] text-zinc-600 uppercase font-bold mb-1.5 px-1">
                        {type} ({nets.length})
                      </div>
                      <div className="space-y-1.5">
                        {nets.map(net => (
                          <NetCard
                            key={net.id}
                            net={net}
                            onToggleStatus={toggleNetStatus}
                            onToggleDiscipline={toggleDiscipline}
                            onToggleStageMode={toggleStageMode}
                          />
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NetCard({ net, onToggleStatus, onToggleDiscipline, onToggleStageMode }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-black font-mono text-white">{net.code}</div>
          <Badge className={cn(
            "text-[8px] h-4 px-1.5",
            net.status === 'active' ? "bg-emerald-900 text-emerald-400" : "bg-zinc-800 text-zinc-500"
          )}>
            {net.status}
          </Badge>
          <Badge className={cn(
            "text-[8px] h-4 px-1.5",
            net.discipline === 'focused' ? "bg-red-900 text-red-400" : "bg-zinc-800 text-zinc-400"
          )}>
            {net.discipline}
          </Badge>
          {net.stage_mode && (
            <Badge className="bg-amber-900 text-amber-400 text-[8px] h-4 px-1.5">STAGE</Badge>
          )}
        </div>
      </div>

      <div className="text-xs text-zinc-400 mb-3">{net.label}</div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggleStatus(net)}
          className="h-7 text-[10px] gap-1"
        >
          {net.status === 'active' ? <Power className="w-3 h-3" /> : <Power className="w-3 h-3 opacity-50" />}
          {net.status === 'active' ? 'On' : 'Off'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggleDiscipline(net)}
          className={cn(
            "h-7 text-[10px] gap-1",
            net.discipline === 'focused' ? "border-red-800 text-red-400" : "border-zinc-700"
          )}
        >
          <Shield className="w-3 h-3" />
          {net.discipline === 'focused' ? 'Focus' : 'Casual'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onToggleStageMode(net)}
          className={cn(
            "h-7 text-[10px] gap-1",
            net.stage_mode ? "border-amber-800 text-amber-400" : "border-zinc-700"
          )}
        >
          {net.stage_mode ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          Stage
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-800">
        <div className="text-[9px]">
          <span className="text-zinc-600">TX:</span>
          <span className="text-zinc-400 ml-1 font-mono">{net.min_rank_to_tx || 'Vagrant'}</span>
        </div>
        <div className="text-[9px]">
          <span className="text-zinc-600">RX:</span>
          <span className="text-zinc-400 ml-1 font-mono">{net.min_rank_to_rx || 'Vagrant'}</span>
        </div>
      </div>
    </div>
  );
}