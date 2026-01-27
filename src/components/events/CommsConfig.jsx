import React from 'react';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Radio, Trash2, Plus, Settings, Wand2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { cn } from "@/lib/utils";

function NetForm({ eventId, net, open, onOpenChange, squads }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      code: "",
      label: "",
      type: "squad",
      priority: 2,
      linked_squad_id: "none",
      min_rank_to_tx: "Vagrant",
      min_rank_to_rx: "Vagrant"
    }
  });

  React.useEffect(() => {
    if (net) {
      reset({
        ...net,
        linked_squad_id: net.linked_squad_id || "none"
      });
    } else {
      reset({
        code: "",
        label: "",
        type: "squad",
        priority: 2,
        linked_squad_id: "none",
        min_rank_to_tx: "Vagrant",
        min_rank_to_rx: "Vagrant"
      });
    }
  }, [net, reset, open]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        event_id: eventId,
        priority: parseInt(data.priority),
        linked_squad_id: data.linked_squad_id === "none" ? null : data.linked_squad_id
      };
      
      if (net?.id) {
        return base44.entities.VoiceNet.update(net.id, payload);
      } else {
        return base44.entities.VoiceNet.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['voice-nets', eventId]);
      onOpenChange(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest font-bold text-white flex items-center gap-2">
            <Radio className="w-4 h-4" /> {net ? 'Configure Net' : 'New Frequency'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Net Code</Label>
               <Input {...register("code", { required: true })} placeholder="ALPHA" className="bg-zinc-900 border-zinc-800 uppercase font-mono" />
             </div>
             <div className="space-y-2">
               <Label>Display Label</Label>
               <Input {...register("label", { required: true })} placeholder="Ground Team A" className="bg-zinc-900 border-zinc-800" />
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Type</Label>
               <Select onValueChange={(v) => setValue("type", v)} defaultValue={watch("type")}>
                 <SelectTrigger className="bg-zinc-900 border-zinc-800">
                   <SelectValue placeholder="Type" />
                 </SelectTrigger>
                 <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                   <SelectItem value="command">Command</SelectItem>
                   <SelectItem value="squad">Squad</SelectItem>
                   <SelectItem value="support">Support</SelectItem>
                   <SelectItem value="general">General</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Priority (1=High)</Label>
               <Input type="number" {...register("priority")} className="bg-zinc-900 border-zinc-800" min={1} max={5} />
             </div>
          </div>

          <div className="space-y-2">
             <Label>Linked Squad (Optional)</Label>
             <Select onValueChange={(v) => setValue("linked_squad_id", v)} defaultValue={watch("linked_squad_id")}>
               <SelectTrigger className="bg-zinc-900 border-zinc-800">
                 <SelectValue placeholder="None" />
               </SelectTrigger>
               <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                 <SelectItem value="none">None</SelectItem>
                 {squads.map(s => (
                   <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
               <Label>Min Rank (TX)</Label>
               <Select onValueChange={(v) => setValue("min_rank_to_tx", v)} defaultValue={watch("min_rank_to_tx")}>
                 <SelectTrigger className="bg-zinc-900 border-zinc-800">
                   <SelectValue placeholder="Rank" />
                 </SelectTrigger>
                 <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                   <SelectItem value="Vagrant">Vagrant+</SelectItem>
                   <SelectItem value="Scout">Scout+</SelectItem>
                   <SelectItem value="Voyager">Voyager+</SelectItem>
                   <SelectItem value="Founder">Founder+</SelectItem>
                 </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>Min Rank (RX)</Label>
               <Select onValueChange={(v) => setValue("min_rank_to_rx", v)} defaultValue={watch("min_rank_to_rx")}>
                 <SelectTrigger className="bg-zinc-900 border-zinc-800">
                   <SelectValue placeholder="Rank" />
                 </SelectTrigger>
                 <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                   <SelectItem value="Vagrant">Vagrant+</SelectItem>
                   <SelectItem value="Scout">Scout+</SelectItem>
                   <SelectItem value="Voyager">Voyager+</SelectItem>
                   <SelectItem value="Founder">Founder+</SelectItem>
                 </SelectContent>
               </Select>
             </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
             <Button type="submit" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-bold">
                <Save className="w-4 h-4 mr-2" /> Save Configuration
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function CommsConfig({ eventId }) {
  const queryClient = useQueryClient();
  const [editingNet, setEditingNet] = React.useState(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [autoInitialized, setAutoInitialized] = React.useState(false);

  const { data: voiceNets } = useQuery({
    queryKey: ['voice-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId }, 'priority'),
    initialData: []
  });

  const { data: squads } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.VoiceNet.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['voice-nets', eventId])
  });

  const autoGenMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('initializeEventComms', { eventId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['voice-nets', eventId]);
      setAutoInitialized(true);
    }
  });

  const provisionFromFormationMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('provisionCommsFromFormation', { eventId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['voice-nets', eventId]);
    }
  });

  // Auto-initialize on mount if no nets exist
  React.useEffect(() => {
    if (voiceNets.length === 0 && !autoInitialized && !autoGenMutation.isPending) {
      autoGenMutation.mutate();
    }
  }, [voiceNets.length, autoInitialized]);

  const handleEdit = (net) => {
    setEditingNet(net);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setEditingNet(null);
    setIsFormOpen(true);
  };

  return (
    <Card className="bg-zinc-900 border-zinc-800 mb-6">
      <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wider">
          <Settings className="w-4 h-4 text-zinc-500" />
          Comms Configuration
        </CardTitle>
        <div className="flex gap-2">
          {voiceNets.length === 0 && (
            <>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => autoGenMutation.mutate()}
                disabled={autoGenMutation.isPending}
                className="h-7 text-xs border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
              >
                <Wand2 className="w-3 h-3 mr-2" /> Auto-Init
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => provisionFromFormationMutation.mutate()}
                disabled={provisionFromFormationMutation.isPending}
                className="h-7 text-xs border-emerald-700 bg-emerald-950 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900"
              >
                <Wand2 className="w-3 h-3 mr-2" /> From Formation
              </Button>
            </>
          )}
          <Button 
            size="sm" 
            onClick={handleNew}
            className="h-7 text-xs bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
          >
             <Plus className="w-3 h-3 mr-1" /> Add Net
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2">
           {voiceNets.length === 0 && (autoGenMutation.isPending || provisionFromFormationMutation.isPending) && (
              <div className="text-xs text-emerald-500 italic text-center py-6 flex items-center justify-center gap-2">
                 <Radio className="w-4 h-4 animate-pulse" />
                 {provisionFromFormationMutation.isPending ? 'Provisioning from formation hierarchy...' : 'Establishing secure channels...'}
              </div>
           )}
           {voiceNets.length === 0 && !autoGenMutation.isPending && (
              <div className="text-xs text-zinc-500 italic text-center py-4">
                 No active nets configured.
              </div>
           )}
           {voiceNets.map(net => (
              <div key={net.id} className="group flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/50 rounded hover:border-zinc-700 transition-colors">
                 <div className="flex items-center gap-4">
                    <div className={cn(
                       "w-1 h-8 rounded-full",
                       net.type === 'command' ? "bg-red-500" :
                       net.type === 'squad' ? "bg-emerald-500" :
                       "bg-zinc-600"
                    )} />
                    <div>
                       <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-200 font-mono">{net.code}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 border-zinc-800 text-zinc-500">
                             P{net.priority}
                          </Badge>
                          {net.type === 'command' && <Badge className="text-[9px] h-4 bg-red-950 text-red-500 border-red-900 px-1">CMD</Badge>}
                       </div>
                       <div className="text-xs text-zinc-500">{net.label}</div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                       <div className="text-[10px] text-zinc-600 uppercase font-bold">Access Rules</div>
                       <div className="text-[10px] text-zinc-500">
                          TX: {net.min_rank_to_tx}+ / RX: {net.min_rank_to_rx}+
                       </div>
                    </div>
                    <div className="flex gap-1">
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-zinc-200" onClick={() => handleEdit(net)}>
                          <Settings className="w-4 h-4" />
                       </Button>
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-500" onClick={() => {
                          if (confirm("Terminate this net configuration?")) deleteMutation.mutate(net.id);
                       }}>
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                 </div>
              </div>
           ))}
        </div>
        
        <NetForm 
          eventId={eventId} 
          net={editingNet} 
          open={isFormOpen} 
          onOpenChange={setIsFormOpen} 
          squads={squads} 
        />
      </CardContent>
    </Card>
  );
}