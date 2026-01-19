import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, Clock, Calendar, User, MapPin } from "lucide-react";
import { canApproveEvent } from "@/components/permissions";
import { cn } from "@/lib/utils";

export default function EventApprovalQueue({ user }) {
  const queryClient = useQueryClient();

  const { data: pendingEvents } = useQuery({
    queryKey: ['pending-events'],
    queryFn: () => base44.entities.Event.filter({ status: 'pending_approval' }, '-created_date', 50),
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-approval'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  const approveMutation = useMutation({
    mutationFn: async (eventId) => {
      await base44.entities.Event.update(eventId, { status: 'scheduled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-events']);
      queryClient.invalidateQueries(['events-list']);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (eventId) => {
      await base44.entities.Event.update(eventId, { status: 'cancelled' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-events']);
      queryClient.invalidateQueries(['events-list']);
    }
  });

  const canApprove = canApproveEvent(user);

  if (!canApprove) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="p-6 text-center text-zinc-600">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs font-mono">INSUFFICIENT CLEARANCE</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="border-b border-zinc-800">
        <CardTitle className="flex items-center gap-2 text-white uppercase tracking-wider text-sm">
          <Clock className="w-4 h-4 text-amber-500" />
          Event Approval Queue
          {pendingEvents.length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {pendingEvents.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {pendingEvents.length === 0 ? (
          <div className="p-8 text-center text-zinc-600">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs font-mono">NO PENDING EVENT REQUESTS</p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="p-4 space-y-3">
              {pendingEvents.map(event => {
                const creator = users.find(u => u.id === event.created_by);
                return (
                  <div 
                    key={event.id}
                    className="border border-zinc-800 bg-zinc-900/30 p-4 space-y-3 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-zinc-200 text-sm">{event.title}</h3>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{event.description}</p>
                      </div>
                      <Badge 
                        className={cn(
                          "text-[10px]",
                          event.event_type === 'focused' 
                            ? "bg-red-500/20 text-red-400 border-red-500/30" 
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        )}
                      >
                        {event.event_type}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {creator?.callsign || creator?.rsi_handle || 'Unknown'}
                        <span className="text-[9px] text-zinc-600">({creator?.rank || 'N/A'})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.start_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-1 col-span-2">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(event.id)}
                        disabled={approveMutation.isPending}
                        className="flex-1 bg-emerald-900 hover:bg-emerald-800 text-white gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(event.id)}
                        disabled={rejectMutation.isPending}
                        className="flex-1 gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}