import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Clock, MapPin, Users, Plus, UserPlus, UserMinus, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function CreateEventDialog({ squad, trigger }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'training',
    start_time: '',
    duration_minutes: 60,
    location: '',
    max_participants: null
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.SquadEvent.create({
        ...data,
        squad_id: squad.id,
        created_by: user.id,
        registered_user_ids: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-events'] });
      toast.success('Event created');
      setOpen(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Squad Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
          <Input
            placeholder="Event Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
            required
          />
          <Textarea
            placeholder="Event description and objectives..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="bg-zinc-900 border-zinc-800 min-h-[80px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Select value={formData.event_type} onValueChange={(v) => setFormData({ ...formData, event_type: v })}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="operation">Operation</SelectItem>
                  <SelectItem value="drill">Drill</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              type="number"
              placeholder="Duration (minutes)"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>
          <Input
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
            required
          />
          <Input
            placeholder="Location (e.g., Stanton System, Discord Voice)"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            className="bg-zinc-900 border-zinc-800"
          />
          <Input
            type="number"
            placeholder="Max Participants (leave empty for unlimited)"
            value={formData.max_participants || ''}
            onChange={(e) => setFormData({ ...formData, max_participants: e.target.value ? parseInt(e.target.value) : null })}
            className="bg-zinc-900 border-zinc-800"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-[#ea580c] hover:bg-[#c2410c]">Create Event</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function SquadEventsManager({ squad, isLeader }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: ['squad-events', squad?.id],
    queryFn: () => base44.entities.SquadEvent.filter({ 
      squad_id: squad.id 
    }),
    enabled: !!squad
  });

  const registerMutation = useMutation({
    mutationFn: async ({ eventId, userId }) => {
      const event = events.find(e => e.id === eventId);
      const updatedIds = [...(event.registered_user_ids || []), userId];
      return base44.entities.SquadEvent.update(eventId, { registered_user_ids: updatedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-events'] });
      toast.success('Registered for event');
    }
  });

  const unregisterMutation = useMutation({
    mutationFn: async ({ eventId, userId }) => {
      const event = events.find(e => e.id === eventId);
      const updatedIds = (event.registered_user_ids || []).filter(id => id !== userId);
      return base44.entities.SquadEvent.update(eventId, { registered_user_ids: updatedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-events'] });
      toast.success('Unregistered from event');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }) => base44.entities.SquadEvent.update(eventId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-events'] });
      toast.success('Event status updated');
    }
  });

  const upcomingEvents = events.filter(e => e.status === 'scheduled');
  const completedEvents = events.filter(e => e.status === 'completed');

  return (
    <div className="space-y-4">
      {isLeader && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-900">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400">
                Squad Events & Training
              </CardTitle>
              <CreateEventDialog
                squad={squad}
                trigger={
                  <Button size="sm" className="bg-[#ea580c] hover:bg-[#c2410c]">
                    <Plus className="w-3 h-3 mr-2" />
                    Create Event
                  </Button>
                }
              />
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-6">
        {/* Upcoming Events */}
        <div>
          <h3 className="text-xs uppercase font-bold text-zinc-400 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming Events
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {upcomingEvents.length === 0 ? (
              <Card className="bg-zinc-950 border-zinc-800">
                <CardContent className="p-6 text-center text-zinc-500">
                  No upcoming events scheduled
                </CardContent>
              </Card>
            ) : (
              upcomingEvents.map((event) => {
                const isRegistered = event.registered_user_ids?.includes(currentUser?.id);
                const isFull = event.max_participants && event.registered_user_ids?.length >= event.max_participants;

                return (
                  <Card key={event.id} className="bg-zinc-950 border-zinc-800 hover:border-[#ea580c]/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn(
                              "text-[9px]",
                              event.event_type === 'training' && "bg-blue-900 text-blue-400",
                              event.event_type === 'operation' && "bg-red-900 text-red-400",
                              event.event_type === 'drill' && "bg-amber-900 text-amber-400",
                              event.event_type === 'social' && "bg-purple-900 text-purple-400"
                            )}>
                              {event.event_type}
                            </Badge>
                            <div className="font-bold text-white">{event.title}</div>
                          </div>
                          {event.description && (
                            <div className="text-xs text-zinc-500 mb-2">{event.description}</div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500 mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.start_time), 'MMM d, HH:mm')}
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {event.duration_minutes}min
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1 col-span-2">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {event.registered_user_ids?.length || 0}
                          {event.max_participants && ` / ${event.max_participants}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                        {isLeader && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({ eventId: event.id, status: 'active' })}
                              className="text-xs"
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatusMutation.mutate({ eventId: event.id, status: 'completed' })}
                              className="text-xs"
                            >
                              Complete
                            </Button>
                          </>
                        )}
                        {currentUser && (
                          isRegistered ? (
                            <Button
                              size="sm"
                              onClick={() => unregisterMutation.mutate({ eventId: event.id, userId: currentUser.id })}
                              className="bg-zinc-800 hover:bg-zinc-700 text-xs ml-auto"
                            >
                              <UserMinus className="w-3 h-3 mr-1" />
                              Unregister
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => registerMutation.mutate({ eventId: event.id, userId: currentUser.id })}
                              disabled={isFull}
                              className="bg-[#ea580c] hover:bg-[#c2410c] text-xs ml-auto"
                            >
                              <UserPlus className="w-3 h-3 mr-1" />
                              {isFull ? 'Full' : 'Register'}
                            </Button>
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Completed Events */}
        {completedEvents.length > 0 && (
          <div>
            <h3 className="text-xs uppercase font-bold text-zinc-400 mb-3">Past Events</h3>
            <div className="grid grid-cols-1 gap-2">
              {completedEvents.slice(0, 5).map((event) => (
                <Card key={event.id} className="bg-zinc-950 border-zinc-800 opacity-60">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px]">{event.event_type}</Badge>
                        <div className="text-sm text-zinc-400">{event.title}</div>
                      </div>
                      <div className="text-xs text-zinc-600">
                        {format(new Date(event.start_time), 'MMM d')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}