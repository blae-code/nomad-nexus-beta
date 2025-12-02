import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CommsPanel from "@/components/events/CommsPanel";
import SquadSection from "@/components/events/SquadSection";
import PlayerStatusSection from "@/components/events/PlayerStatusSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { canEditEvent } from "@/components/permissions";
import EventForm from "@/components/events/EventForm";
import EventParticipants from "@/components/events/EventParticipants";

export default function EventPage() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);
  // Parse ID from URL
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  const { data: event, isLoading } = useQuery({
    queryKey: ['event-detail', id],
    queryFn: async () => {
      if (!id) return null;
      return base44.entities.Event.get(id);
    },
    enabled: !!id
  });

  const { data: creator } = useQuery({
    queryKey: ['event-creator', event?.created_by],
    queryFn: () => base44.entities.User.get(event.created_by),
    enabled: !!event?.created_by
  });

  if (isLoading) {
    return <div className="min-h-screen bg-zinc-950 p-10 text-center text-zinc-500">Loading Intelligence...</div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-zinc-950 p-10 text-center">
        <h1 className="text-xl text-zinc-300 mb-4">Operation Not Found</h1>
        <a href={createPageUrl('Events')}>
           <Badge variant="outline" className="hover:bg-zinc-800 cursor-pointer">Return to Operations Board</Badge>
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header / Nav */}
        <div className="mb-8">
          <a href={createPageUrl('Events')} className="inline-flex items-center text-xs text-zinc-500 hover:text-red-500 mb-4 transition-colors">
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to Operations
          </a>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className={
                      event.event_type === 'focused' 
                      ? "text-red-500 border-red-900 bg-red-950/10" 
                      : "text-emerald-500 border-emerald-900 bg-emerald-950/10"
                  }>
                    {event.event_type.toUpperCase()}
                  </Badge>
                  <span className="text-zinc-500 text-xs font-mono tracking-widest">OP-ID: {event.id.slice(0,8)}</span>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight text-white">
                  {event.title}
                </h1>
             </div>
             
             {creator && (
               <div className="text-right">
                 <div className="text-xs text-zinc-500 uppercase tracking-wider">Commanding Officer</div>
                 <div className="text-sm font-bold text-zinc-300">{creator.rsi_handle || creator.email}</div>
               </div>
             )}
          </div>
          
          {canEditEvent(currentUser, event) && (
            <div className="mb-4 flex justify-end">
               <Button 
                 onClick={() => setIsEditOpen(true)}
                 variant="outline" 
                 size="sm"
                 className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
               >
                 Edit Mission
               </Button>
               <EventForm 
                 event={event} 
                 open={isEditOpen} 
                 onOpenChange={setIsEditOpen} 
               />
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Mission Details */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide">Mission Briefing</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400 space-y-6">
                <p className="leading-relaxed">{event.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Date</div>
                      <div className="text-sm text-zinc-200">{new Date(event.start_time).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Time</div>
                      <div className="text-sm text-zinc-200">{new Date(event.start_time).toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 col-span-full">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase">Location</div>
                      <div className="text-sm text-zinc-200">{event.location || "Classified"}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Participants & Roles */}
            <EventParticipants eventId={event.id} />

            {/* Squads Section */}
            <SquadSection eventId={event.id} />

          </div>

          {/* Sidebar / Comms Column */}
          <div className="space-y-6">
            
            {/* Player Status */}
            <PlayerStatusSection eventId={event.id} />

            {/* Comms Panel Placeholder */}
            <div className="opacity-75 hover:opacity-100 transition-opacity">
               <CommsPanel eventId={event.id} />
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}