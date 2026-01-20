import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Radio, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VoiceNetForm({ eventId }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    event_id: eventId || "__no_event__",
    code: "",
    label: "",
    type: "squad",
    discipline: "focused",
    stage_mode: false,
    priority: 2,
    min_rank_to_tx: "Vagrant",
    min_rank_to_rx: "Vagrant",
    linked_squad_id: "__no_squad__",
    status: "active"
  });

  const { data: events } = useQuery({
    queryKey: ['events-for-nets'],
    queryFn: () => base44.entities.Event.list('-start_time', 50),
    initialData: []
  });

  const { data: squads } = useQuery({
    queryKey: ['squads-for-nets'],
    queryFn: () => base44.entities.Squad.filter({ hierarchy_level: 'squad' }),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.VoiceNet.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voice-nets'] });
      toast.success("Voice Net created successfully");
      // Reset form
      setFormData({
        event_id: eventId || "__no_event__",
        code: "",
        label: "",
        type: "squad",
        discipline: "focused",
        stage_mode: false,
        priority: 2,
        min_rank_to_tx: "Vagrant",
        min_rank_to_rx: "Vagrant",
        linked_squad_id: "__no_squad__",
        status: "active"
      });
    },
    onError: (error) => {
      toast.error("Failed to create net: " + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.event_id || formData.event_id === "__no_event__" || !formData.code || !formData.label) {
      toast.error("Event, Code, and Label are required");
      return;
    }

    // Generate LiveKit room name
    const roomName = `event_${formData.event_id}_net_${formData.code}_${Date.now()}`;
    
    const cleanedData = {
      ...formData,
      linked_squad_id: formData.linked_squad_id === "__no_squad__" ? "" : formData.linked_squad_id,
      livekit_room_name: roomName
    };
    
    createMutation.mutate(cleanedData);
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-300">
          <Radio className="w-5 h-5 text-[#ea580c]" />
          Create Voice Net
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Event *</Label>
              <Select
                value={formData.event_id}
                onValueChange={(value) => setFormData({ ...formData, event_id: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_event__">Select an event...</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id || "__invalid__"}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Code (e.g., ALPHA) *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="ALPHA"
                className="bg-zinc-900 border-zinc-800 uppercase"
                maxLength={12}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Label *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Ground Team A"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="command">Command</SelectItem>
                  <SelectItem value="squad">Squad</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Discipline</Label>
              <Select
                value={formData.discipline}
                onValueChange={(value) => setFormData({ ...formData, discipline: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="casual">Casual (Open access)</SelectItem>
                  <SelectItem value="focused">Focused (Rank enforced)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Priority</Label>
              <Select
                value={formData.priority.toString()}
                onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Command (Highest)</SelectItem>
                  <SelectItem value="2">2 - Tactical</SelectItem>
                  <SelectItem value="3">3 - Support</SelectItem>
                  <SelectItem value="4">4 - General</SelectItem>
                  <SelectItem value="5">5 - Lowest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Min Rank to Transmit</Label>
              <Select
                value={formData.min_rank_to_tx}
                onValueChange={(value) => setFormData({ ...formData, min_rank_to_tx: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vagrant">Vagrant</SelectItem>
                  <SelectItem value="Scout">Scout</SelectItem>
                  <SelectItem value="Voyager">Voyager</SelectItem>
                  <SelectItem value="Founder">Founder</SelectItem>
                  <SelectItem value="Pioneer">Pioneer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Min Rank to Receive</Label>
              <Select
                value={formData.min_rank_to_rx}
                onValueChange={(value) => setFormData({ ...formData, min_rank_to_rx: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vagrant">Vagrant</SelectItem>
                  <SelectItem value="Scout">Scout</SelectItem>
                  <SelectItem value="Voyager">Voyager</SelectItem>
                  <SelectItem value="Founder">Founder</SelectItem>
                  <SelectItem value="Pioneer">Pioneer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Linked Squad (Optional)</Label>
              <Select
                value={formData.linked_squad_id || "__no_squad__"}
                onValueChange={(value) => setFormData({ ...formData, linked_squad_id: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__no_squad__">None</SelectItem>
                  {squads.map(squad => (
                    <SelectItem key={squad.id} value={squad.id || "__invalid__"}>
                      {squad.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 p-3 bg-zinc-900/50 border border-zinc-800 rounded">
            <Switch
              checked={formData.stage_mode}
              onCheckedChange={(checked) => setFormData({ ...formData, stage_mode: checked })}
            />
            <div>
              <Label className="text-xs text-zinc-300">Stage Mode</Label>
              <p className="text-[10px] text-zinc-500">Only commanders can grant TX permission</p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full bg-[#ea580c] hover:bg-[#c2410c]"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Voice Net
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}