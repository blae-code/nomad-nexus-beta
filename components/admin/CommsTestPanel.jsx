import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Radio, Wand2, Trash2, TestTube, Network, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CommsTestPanel() {
  const [selectedEvent, setSelectedEvent] = React.useState('');
  const [provisionStatus, setProvisionStatus] = React.useState(null);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-created_date', 50)
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['voice-nets', selectedEvent],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: selectedEvent }),
    enabled: !!selectedEvent
  });

  const { data: units = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const provisionMutation = useMutation({
    mutationFn: async (eventId) => {
      const res = await base44.functions.invoke('provisionCommsFromFormation', { eventId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['voice-nets'] });
      setProvisionStatus({ success: true, data });
    },
    onError: (error) => {
      setProvisionStatus({ success: false, error: error.message });
    }
  });

  const deleteAllNetsMutation = useMutation({
    mutationFn: async (eventId) => {
      const nets = await base44.asServiceRole.entities.VoiceNet.filter({ event_id: eventId });
      await Promise.all(nets.map(net => base44.asServiceRole.entities.VoiceNet.delete(net.id)));
      return nets.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-nets'] });
      setProvisionStatus(null);
    }
  });

  const handleProvision = () => {
    if (!selectedEvent) return;
    setProvisionStatus(null);
    provisionMutation.mutate(selectedEvent);
  };

  const handleDeleteAll = () => {
    if (!selectedEvent) return;
    if (confirm(`Delete all ${voiceNets.length} nets for this event?`)) {
      deleteAllNetsMutation.mutate(selectedEvent);
    }
  };

  const fleets = units.filter(u => u.hierarchy_level === 'fleet');
  const wings = units.filter(u => u.hierarchy_level === 'wing');
  const squads = units.filter(u => u.hierarchy_level === 'squad' || !u.hierarchy_level);

  return (
    <div className="space-y-6">
      {/* Formation Preview */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-500" />
            Current Formation Structure
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-zinc-900/50 border border-amber-900/30 p-4 rounded">
              <div className="text-3xl font-black text-amber-500">{fleets.length}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Fleets</div>
            </div>
            <div className="bg-zinc-900/50 border border-cyan-900/30 p-4 rounded">
              <div className="text-3xl font-black text-cyan-500">{wings.length}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Wings</div>
            </div>
            <div className="bg-zinc-900/50 border border-emerald-900/30 p-4 rounded">
              <div className="text-3xl font-black text-emerald-500">{squads.length}</div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">Squads</div>
            </div>
          </div>
          
          <div className="text-xs text-zinc-600 p-3 bg-zinc-900/30 border border-zinc-800 rounded">
            <div className="font-bold text-zinc-500 mb-1">Expected Net Count Per Event:</div>
            <div className="font-mono">
              {fleets.length} Fleet Command + {wings.length} Wings + {squads.length} Squads + 2 Support = 
              <span className="text-emerald-500 ml-1 font-bold">
                {fleets.length + wings.length + squads.length + 2} Total Nets
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provision Controls */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <TestTube className="w-4 h-4 text-emerald-500" />
            Provision & Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Select Event</label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Choose event to provision..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} - {new Date(event.start_time).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEvent && (
            <>
              <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                    Current Nets: {voiceNets.length}
                  </span>
                  {voiceNets.length > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDeleteAll}
                      disabled={deleteAllNetsMutation.isPending}
                      className="h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete All
                    </Button>
                  )}
                </div>

                {voiceNets.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {voiceNets.map(net => (
                      <div key={net.id} className="flex items-center justify-between text-xs bg-zinc-950 p-2 rounded">
                        <span className="font-mono text-zinc-400">{net.code}</span>
                        <span className="text-zinc-600">{net.label}</span>
                        <Badge variant="outline" className={cn(
                          "text-[9px] px-1.5",
                          net.type === 'command' && "border-red-700 text-red-500",
                          net.type === 'squad' && "border-emerald-700 text-emerald-500",
                          net.type === 'general' && "border-zinc-700 text-zinc-500"
                        )}>
                          {net.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleProvision}
                disabled={provisionMutation.isPending || voiceNets.length > 0}
                className="w-full bg-emerald-900 hover:bg-emerald-800 text-white"
              >
                {provisionMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Provision from Formation
                  </>
                )}
              </Button>

              {voiceNets.length > 0 && (
                <div className="text-xs text-amber-500 p-2 bg-amber-950/20 border border-amber-900/30 rounded">
                  ⚠️ Nets already exist. Delete all first to re-provision.
                </div>
              )}
            </>
          )}

          {/* Status */}
          {provisionStatus && (
            <div className={cn(
              "p-3 rounded border",
              provisionStatus.success 
                ? "bg-emerald-950/20 border-emerald-900/30" 
                : "bg-red-950/20 border-red-900/30"
            )}>
              <div className="flex items-center gap-2 mb-2">
                {provisionStatus.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  provisionStatus.success ? "text-emerald-500" : "text-red-500"
                )}>
                  {provisionStatus.success ? 'Success' : 'Failed'}
                </span>
              </div>

              {provisionStatus.success && provisionStatus.data && (
                <div className="text-xs text-zinc-400 space-y-1 font-mono">
                  <div>✓ {provisionStatus.data.summary?.fleet_command || 0} Fleet Command nets</div>
                  <div>✓ {provisionStatus.data.summary?.wings || 0} Wing nets</div>
                  <div>✓ {provisionStatus.data.summary?.squads || 0} Squad nets</div>
                  <div>✓ {provisionStatus.data.summary?.support || 0} Support nets (General + Emergency)</div>
                  <div className="text-emerald-500 font-bold pt-1 border-t border-zinc-800 mt-1">
                    Total: {provisionStatus.data.summary?.total || 0} nets provisioned
                  </div>
                </div>
              )}

              {!provisionStatus.success && (
                <div className="text-xs text-red-400 font-mono">
                  {provisionStatus.error}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Room Name Format Info */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-zinc-500" />
            Room Naming Convention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-zinc-500 font-mono space-y-2">
            <div className="p-2 bg-zinc-900/50 border border-zinc-800 rounded">
              <span className="text-zinc-600">Format:</span> evt-[event_id]-[net_code]
            </div>
            <div className="p-2 bg-zinc-900/50 border border-zinc-800 rounded">
              <span className="text-zinc-600">Example:</span> evt-abc12345-flt-cmd-1
            </div>
            <div className="text-[10px] text-zinc-600 mt-2">
              ℹ️ Scoped to event ID prevents cross-event room collisions
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}