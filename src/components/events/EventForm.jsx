import React from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles, BrainCircuit } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function EventForm({ event, open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const [aiLoading, setAiLoading] = React.useState(null);
  
  const { register, handleSubmit, setValue, getValues, watch, reset } = useForm({
    defaultValues: event || {
      title: "",
      description: "",
      event_type: "casual",
      start_time: new Date().toISOString().slice(0, 16),
      location: "",
      tags: [] // Will be handled as comma-separated string in UI
    }
  });

  const handleAISuggestMetadata = async () => {
    const desc = getValues("description");
    if (!desc) return;
    
    setAiLoading("metadata");
    try {
      const { data } = await base44.functions.invoke("eventAI", {
        action: "suggest_metadata",
        context: { description: desc }
      });
      
      if (data.event_type) setValue("event_type", data.event_type);
      // Handle tags - simple join for now
      if (data.tags && Array.isArray(data.tags)) {
        // We need to verify how tags are stored/displayed. 
        // Assuming we'll add a tags input that takes a string.
        const currentTags = getValues("tags") || [];
        const newTags = [...new Set([...currentTags, ...data.tags])];
        setValue("tags", newTags);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAISuggestSchedule = async () => {
    const desc = getValues("description");
    if (!desc) return;

    setAiLoading("schedule");
    try {
      const { data } = await base44.functions.invoke("eventAI", {
        action: "suggest_schedule",
        context: { description: desc }
      });
      
      if (data.start_time) {
        setValue("start_time", new Date(data.start_time).toISOString().slice(0, 16));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(null);
    }
  };

  const handleAIDraftContent = async () => {
    const title = getValues("title");
    const currentDesc = getValues("description");
    
    setAiLoading("draft");
    try {
      const { data } = await base44.functions.invoke("eventAI", {
        action: "draft_content",
        context: { 
          notes: `Title: ${title}\nNotes: ${currentDesc}`,
          role: "Commander" // Could fetch actual user role
        }
      });
      
      if (data.description) setValue("description", data.description);
      // We could also show the outreach message somewhere, maybe append it?
      if (data.outreach_message) {
         setValue("description", data.description + "\n\n--- OUTREACH MESSAGE ---\n" + data.outreach_message);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(null);
    }
  };

  React.useEffect(() => {
    if (event) {
      reset({
        ...event,
        start_time: toInputDateTime(event.start_time)
      });
    } else {
      reset({
        title: "",
        description: "",
        event_type: "casual",
        start_time: toInputDateTime(new Date().toISOString()),
        location: "",
        tags: []
      });
    }
  }, [event, reset, open]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Process tags from comma separated string if handled that way, or keep as is
      const payload = {
        ...data,
        start_time: new Date(data.start_time).toISOString(),
        // Ensure tags is array if we add tag input logic, for now basic handling
      };
      
      if (event?.id) {
        return base44.entities.Event.update(event.id, payload);
      } else {
        return base44.entities.Event.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events-list']);
      if (event?.id) queryClient.invalidateQueries(['event-detail', event.id]);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    }
  });

  const onSubmit = (data) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest font-bold text-white">
            {event ? 'Edit Operation' : 'New Operation'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Mission Title</Label>
            <Input {...register("title", { required: true })} className="bg-zinc-900 border-zinc-800" placeholder="Operation Name" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Type</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="xs" 
                  className="h-5 px-1 text-[10px] text-emerald-500 hover:bg-emerald-950/30 hover:text-emerald-400"
                  onClick={handleAISuggestMetadata}
                  disabled={aiLoading}
                >
                  {aiLoading === 'metadata' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Auto-Classify
                </Button>
              </div>
              <Select 
                onValueChange={(val) => setValue("event_type", val)} 
                defaultValue={watch("event_type")}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="focused">Focused</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
               <div className="flex justify-between items-center">
                 <Label>Start Time</Label>
                 <Button 
                  type="button" 
                  variant="ghost" 
                  size="xs" 
                  className="h-5 px-1 text-[10px] text-emerald-500 hover:bg-emerald-950/30 hover:text-emerald-400"
                  onClick={handleAISuggestSchedule}
                  disabled={aiLoading}
                >
                  {aiLoading === 'schedule' ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3 mr-1" />}
                  Optimize
                </Button>
               </div>
               <Input 
                 type="datetime-local" 
                 {...register("start_time", { required: true })} 
                 className="bg-zinc-900 border-zinc-800" 
               />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input {...register("location")} className="bg-zinc-900 border-zinc-800" placeholder="System / Planet / POI" />
          </div>

          <div className="space-y-2">
            <Label>Tags (comma separated)</Label>
            <Input 
              placeholder="Rescue, Industry, PVP..."
              className="bg-zinc-900 border-zinc-800"
              value={watch("tags")?.join(", ") || ""}
              onChange={(e) => {
                const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                setValue("tags", tags);
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Briefing</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="xs" 
                className="h-5 px-1 text-[10px] text-purple-500 hover:bg-purple-950/30 hover:text-purple-400"
                onClick={handleAIDraftContent}
                disabled={aiLoading}
              >
                {aiLoading === 'draft' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                Draft Briefing
              </Button>
            </div>
            <Textarea {...register("description")} className="bg-zinc-900 border-zinc-800 min-h-[150px]" placeholder="Mission details..." />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-zinc-900 hover:text-white">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-red-900 hover:bg-red-800 text-white">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {event ? 'Update Mission' : 'Launch Mission'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}