import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Radio, Activity, AlertTriangle, Shield, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function VoiceNetControls() {
  const [selectedEventId, setSelectedEventId] = useState(null);
  const queryClient = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => base44.entities.Event.filter({ status: 'active' })
  });

  const { data: voiceNets = [] } = useQuery({
    queryKey: ['admin-voice-nets', selectedEventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: selectedEventId }),
    enabled: !!selectedEventId
  });

  const updateNetMutation = useMutation({
    mutationFn: async ({ netId, data }) => {
      await base44.asServiceRole.entities.VoiceNet.update(netId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-voice-nets'] });
      toast.success('Voice net updated');
    },
    onError: (error) => {
      toast.error('Failed to update net: ' + error.message);
    }
  });

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

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#ea580c]" />
            Voice Net Controls
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Manage voice net configurations, discipline modes, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-zinc-400 uppercase mb-2 block">Select Event</Label>
              <Select value={selectedEventId || ''} onValueChange={setSelectedEventId}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Choose an active event..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEventId && (
              <div className="text-xs text-zinc-500 font-mono">
                Managing {voiceNets.length} voice net(s)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedEventId && voiceNets.length === 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-6 text-center text-zinc-500">
            No voice nets configured for this event
          </CardContent>
        </Card>
      )}

      {selectedEventId && voiceNets.map((net) => (
        <Card key={net.id} className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-xl font-black font-mono text-white">{net.code}</div>
                    <Badge className={cn(
                      "text-[10px] uppercase",
                      net.status === 'active' ? "bg-emerald-900 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                    )}>
                      {net.status}
                    </Badge>
                    <Badge className={cn(
                      "text-[10px] uppercase",
                      net.discipline === 'focused' ? "bg-red-900 text-red-400" : "bg-emerald-900 text-emerald-400"
                    )}>
                      {net.discipline}
                    </Badge>
                    {net.stage_mode && (
                      <Badge className="bg-amber-900 text-amber-400 text-[10px] uppercase">
                        Stage Mode
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-zinc-400">{net.label}</div>
                  <div className="text-xs text-zinc-600 font-mono mt-1">
                    Type: {net.type} • Priority: {net.priority}
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                  <div>
                    <Label className="text-xs text-zinc-400 uppercase">Status</Label>
                    <div className="text-sm font-bold text-white mt-1">
                      {net.status === 'active' ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <Switch
                    checked={net.status === 'active'}
                    onCheckedChange={() => toggleNetStatus(net)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                  <div>
                    <Label className="text-xs text-zinc-400 uppercase">Discipline</Label>
                    <div className="text-sm font-bold text-white mt-1">
                      {net.discipline === 'focused' ? 'Focused' : 'Casual'}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleDiscipline(net)}
                    className={cn(
                      "text-xs",
                      net.discipline === 'focused' ? "border-red-800 text-red-400" : "border-emerald-800 text-emerald-400"
                    )}
                  >
                    Toggle
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded">
                  <div>
                    <Label className="text-xs text-zinc-400 uppercase">Stage Mode</Label>
                    <div className="text-sm font-bold text-white mt-1">
                      {net.stage_mode ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <Switch
                    checked={net.stage_mode || false}
                    onCheckedChange={() => toggleStageMode(net)}
                  />
                </div>
              </div>

              {/* Permissions Info */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                <div className="text-xs">
                  <div className="text-zinc-500 uppercase mb-1">Min TX Rank</div>
                  <div className="text-zinc-300 font-mono">{net.min_rank_to_tx || 'Vagrant'}</div>
                </div>
                <div className="text-xs">
                  <div className="text-zinc-500 uppercase mb-1">Min RX Rank</div>
                  <div className="text-zinc-300 font-mono">{net.min_rank_to_rx || 'Vagrant'}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}