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
import { Loader2 } from "lucide-react";

export default function EventForm({ event, open, onOpenChange, onSuccess }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: event || {
      title: "",
      description: "",
      event_type: "casual",
      start_time: new Date().toISOString().slice(0, 16), // simple datetime-local format
      location: "",
      tags: []
    }
  });

  React.useEffect(() => {
    if (event) {
      reset({
        ...event,
        start_time: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : ""
      });
    } else {
      reset({
        title: "",
        description: "",
        event_type: "casual",
        start_time: new Date().toISOString().slice(0, 16),
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
               <Label>Start Time</Label>
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
            <Label>Briefing</Label>
            <Textarea {...register("description")} className="bg-zinc-900 border-zinc-800" placeholder="Mission details..." rows={4} />
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