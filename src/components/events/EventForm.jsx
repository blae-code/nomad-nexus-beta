import React from 'react';
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Rocket, User, AlertCircle } from "lucide-react";
import ObjectiveEditor from "@/components/missions/ObjectiveEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import AIFleetAssignmentSuggestions from "@/components/events/AIFleetAssignmentSuggestions";
import AIMissionBriefingGenerator from "@/components/events/AIMissionBriefingGenerator";

export default function EventForm({ event, open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const [objectives, setObjectives] = React.useState(event?.objectives || []);
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  
  // Convert ISO string to datetime-local format (preserves local time)
  const formatDateTimeLocal = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Convert datetime-local to ISO (treats input as local time)
  const parseLocalDateTime = (localDateTimeStr) => {
    if (!localDateTimeStr) return null;
    // Create date from local time string (no timezone shift)
    const d = new Date(localDateTimeStr);
    return d.toISOString();
  };

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: event || {
      title: "",
      description: "",
      event_type: "casual",
      priority: "STANDARD",
      status: "scheduled",
      start_time: formatDateTimeLocal(new Date()),
      location: "",
      tags: [],
      assigned_asset_ids: []
    }
  });

  // Fetch Assets for assignment
  const { data: assets } = useQuery({
    queryKey: ['event-assets'],
    queryFn: () => base44.entities.FleetAsset.list(),
    initialData: []
  });
  
  const { data: users } = useQuery({
    queryKey: ['event-users-assign'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (user.role === 'admin' || user.rank === 'Pioneer' || user.rank === 'Founder') {
        return base44.entities.User.list();
      }
      return [];
    },
    initialData: []
  });

  React.useEffect(() => {
    if (event) {
      setObjectives(event.objectives || []);
      reset({
        ...event,
        priority: event.priority || "STANDARD",
        status: event.status || "scheduled",
        start_time: event.start_time ? formatDateTimeLocal(event.start_time) : "",
        end_time: event.end_time ? formatDateTimeLocal(event.end_time) : "",
        assigned_asset_ids: event.assigned_asset_ids || []
      });
    } else {
      setObjectives([]);
      reset({
        title: "",
        description: "",
        event_type: "casual",
        priority: "STANDARD",
        status: "scheduled",
        start_time: formatDateTimeLocal(new Date()),
        location: "",
        tags: [],
        assigned_asset_ids: []
      });
    }
  }, [event, reset, open]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      // Validation
      if (!data.title || data.title.trim() === '') {
        throw new Error('Title is required');
      }
      if (!data.start_time) {
        throw new Error('Start time is required');
      }
      if (data.end_time) {
        const start = new Date(data.start_time);
        const end = new Date(data.end_time);
        if (end <= start) {
          throw new Error('End time must be after start time');
        }
      }

      // Determine initial status based on user rank
      const canAutoApprove = currentUser?.rank === 'Pioneer' || currentUser?.rank === 'Founder' || currentUser?.role === 'admin';
      const initialStatus = canAutoApprove ? 'scheduled' : 'pending_approval';

      const payload = {
        ...data,
        start_time: parseLocalDateTime(data.start_time),
        end_time: data.end_time ? parseLocalDateTime(data.end_time) : undefined,
        objectives: objectives,
        status: event?.id ? data.status : initialStatus // Preserve status on edit
      };
      
      if (event?.id) {
        return base44.entities.Event.update(event.id, payload);
      } else {
        const newEvent = await base44.entities.Event.create(payload);
        
        // Invoke backend function to initialize canonical comms nets
        try {
          await base44.functions.invoke('initializeEventComms', { eventId: newEvent.id });
        } catch (error) {
          console.error('Failed to initialize event comms:', error);
          // Non-blocking: comms init failure doesn't prevent event creation
        }
        
        return newEvent;
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
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-widest font-bold text-white">
            {event ? 'Edit Operation' : 'New Operation'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {!event && currentUser?.rank !== 'Pioneer' && currentUser?.rank !== 'Founder' && currentUser?.role !== 'admin' && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-sm flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="text-xs text-amber-400">
                <span className="font-bold">Approval Required:</span> Event requests from Vagrant/Scout/Voyager ranks require Pioneer oversight before becoming active.
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Operation Title *</Label>
            <Input {...register("title", { required: true })} className="bg-zinc-900 border-zinc-800 font-bold" placeholder="Operation Name" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
               <Label>Start Time *</Label>
               <Input 
                 type="datetime-local" 
                 {...register("start_time", { required: true })} 
                 className="bg-zinc-900 border-zinc-800" 
               />
            </div>
            <div className="space-y-2">
               <Label>End Time</Label>
               <Input 
                 type="datetime-local" 
                 {...register("end_time")} 
                 className="bg-zinc-900 border-zinc-800" 
               />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
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
              <Label>Priority</Label>
              <Select 
                onValueChange={(val) => setValue("priority", val)} 
                defaultValue={watch("priority")}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                onValueChange={(val) => setValue("status", val)} 
                defaultValue={watch("status")}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="aborted">Aborted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location</Label>
            <Input {...register("location")} className="bg-zinc-900 border-zinc-800" placeholder="System / Planet / POI" />
          </div>

          <div className="space-y-2">
            <Label>Briefing</Label>
            <Textarea {...register("description")} className="bg-zinc-900 border-zinc-800" placeholder="Mission details..." rows={3} />
          </div>

          {/* AI Mission Briefing Generator */}
          {watch("title") && watch("location") && (
            <AIMissionBriefingGenerator 
              event={{
                title: watch("title"),
                event_type: watch("event_type"),
                priority: watch("priority"),
                location: watch("location"),
                description: watch("description"),
                tags: watch("tags"),
                objectives: objectives
              }}
              onApplyBriefing={(briefingText) => setValue("description", briefingText)}
            />
          )}

          {/* Objectives Editor */}
          <ObjectiveEditor 
             objectives={objectives} 
             onChange={setObjectives} 
             users={users} 
             assets={assets} 
          />

          {/* AI Fleet Assignment Suggestions */}
          {watch("title") && watch("location") && assets.length > 0 && (
            <AIFleetAssignmentSuggestions 
              event={{
                title: watch("title"),
                event_type: watch("event_type"),
                priority: watch("priority"),
                location: watch("location"),
                description: watch("description"),
                tags: watch("tags")
              }}
              assets={assets}
              onApplySuggestions={(assetIds) => setValue("assigned_asset_ids", assetIds)}
            />
          )}

          {/* Asset Assignment */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase text-zinc-500 flex items-center gap-2">
               <Rocket className="w-3 h-3" /> Assigned Assets
            </Label>
            <ScrollArea className="h-24 border border-zinc-800 bg-zinc-900/50 p-2 rounded-sm">
              {assets.length === 0 && <div className="text-zinc-500 text-xs italic">No assets available in fleet.</div>}
              {assets.map(asset => (
                <div key={asset.id} className="flex items-center space-x-2 mb-2">
                  <Checkbox 
                    id={`asset-${asset.id}`} 
                    checked={watch('assigned_asset_ids')?.includes(asset.id)}
                    onCheckedChange={(checked) => {
                       const current = watch('assigned_asset_ids') || [];
                       if (checked) setValue('assigned_asset_ids', [...current, asset.id]);
                       else setValue('assigned_asset_ids', current.filter(id => id !== asset.id));
                    }}
                    className="border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  />
                  <label htmlFor={`asset-${asset.id}`} className="text-xs text-zinc-300 cursor-pointer select-none flex items-center justify-between w-full pr-2">
                    <span>{asset.name}</span>
                    <span className="text-[9px] text-zinc-500">{asset.model}</span>
                  </label>
                </div>
              ))}
            </ScrollArea>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
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