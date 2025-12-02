import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight, Users, Clock, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { canCreateEvent, canEditEvent } from "@/components/permissions";
import EventForm from "@/components/events/EventForm";

// Imports specific to Detail View
import CommsPanel from "@/components/events/CommsPanel";
import SquadManager from "@/components/events/SquadManager";
import PlayerStatusSection from "@/components/events/PlayerStatusSection";
import EventParticipants from "@/components/events/EventParticipants";
import EventEconomy from "@/components/events/EventEconomy";
import CommsConfig from "@/components/events/CommsConfig";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";

function EventDetail({ id }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

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

            {/* Squads / Assignments Manager */}
            <SquadManager eventId={event.id} />

          </div>

          {/* Sidebar / Comms Column */}
          <div className="space-y-6">
            
            {/* AI Intelligence Layer */}
            <AIInsightsPanel eventId={event.id} />

            {/* Comms Configuration (Leaders Only) */}
            {canEditEvent(currentUser, event) && (
              <CommsConfig eventId={event.id} />
            )}

            {/* Player Status */}
            <PlayerStatusSection eventId={event.id} />

            {/* Economy Section */}
            <EventEconomy eventId={event.id} />

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

export default function EventsPage() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  
  // Check for Detail View
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => base44.entities.Event.list({ sort: { start_time: -1 } }),
    initialData: []
  });

  // Render Detail View if ID is present
  if (id) {
    return <EventDetail id={id} />;
  }

  // Render List View
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">Operations Board</h1>
            <p className="text-zinc-500 mt-1">Upcoming missions and deployments.</p>
          </div>
          {canCreateEvent(currentUser) && (
            <>
              <Button 
                onClick={() => setIsCreateOpen(true)} 
                className="bg-red-900 hover:bg-red-800 text-white"
              >
                Create Operation
              </Button>
              <EventForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
            </>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-zinc-500">Loading operations...</div>
        ) : (
          <div className="grid gap-4">
            {events.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <p className="text-zinc-500">No active operations found.</p>
              </div>
            ) : (
              events.map((event) => (
                <Card key={event.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group">
                  <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline" className={
                          event.event_type === 'focused' 
                            ? "text-red-500 border-red-900 bg-red-950/10" 
                            : "text-emerald-500 border-emerald-900 bg-emerald-950/10"
                        }>
                          {event.event_type.toUpperCase()}
                        </Badge>
                        <span className="text-zinc-600 text-xs font-mono">
                          {new Date(event.start_time).toLocaleDateString()} • {new Date(event.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-zinc-100 mb-2 group-hover:text-red-500 transition-colors">
                        {event.title}
                      </h3>
                      <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl">
                        {event.description}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 md:w-auto w-full justify-between md:justify-end">
                      <div className="text-right hidden md:block">
                        <div className="flex items-center justify-end gap-2 text-zinc-500 text-xs mb-1">
                          <MapPin className="w-3 h-3" />
                          {event.location || "TBD"}
                        </div>
                        <div className="flex items-center justify-end gap-2 text-zinc-500 text-xs">
                           <Users className="w-3 h-3" />
                           Host: {event.created_by || "Command"}
                        </div>
                      </div>
                      
                      <a href={createPageUrl(`Events?id=${event.id}`)}>
                        <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 hover:text-white">
                          View Intel <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}