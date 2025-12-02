import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CommsPanel from "@/components/events/CommsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";

export default function EventPage() {
  // In a real app, we'd extract the ID from the URL
  // const { id } = useParams(); 
  // For this demo, we'll use a hardcoded test event ID or fetch the first active one
  const [eventId, setEventId] = React.useState(null);

  // Fetch a test event to make the page dynamic
  const { data: event, isLoading } = useQuery({
    queryKey: ['event-demo'],
    queryFn: async () => {
      // Try to get an existing event or create a dummy one for the demo
      const events = await base44.entities.Event.list({}, 1);
      if (events.length > 0) return events[0];
      
      // Create demo event if none exists
      const newEvent = await base44.entities.Event.create({
        title: "Operation: Red Horizon",
        description: "Joint training exercise for Rangers and Industry wings. All hands on deck.",
        event_type: "focused",
        start_time: new Date().toISOString(),
        location: "MicroTech, Rayari Deltana",
        status: "active"
      });
      return newEvent;
    }
  });

  React.useEffect(() => {
    if (event) {
      setEventId(event.id);
    }
  }, [event]);

  if (isLoading) {
    return <div className="p-10 text-center">Loading Event Data...</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
             <Badge variant="outline" className="text-red-500 border-red-900 bg-red-950/10">
               {event.event_type.toUpperCase()}
             </Badge>
             <span className="text-zinc-500 text-xs font-mono tracking-widest">ID: {event.id.slice(0,8)}</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-4 text-white">
            {event.title}
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-lg text-zinc-200">Mission Briefing</CardTitle>
              </CardHeader>
              <CardContent className="text-zinc-400 space-y-6">
                <p>{event.description}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm">{new Date(event.start_time).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm">{new Date(event.start_time).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                    <span className="text-sm">{event.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar / Comms */}
          <div className="space-y-6">
            <CommsPanel eventId={event.id} />
            
            <Card className="bg-zinc-900 border-zinc-800 opacity-50">
              <CardHeader>
                <CardTitle className="text-sm text-zinc-400">Squad Assignments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-zinc-600 italic">
                  Module offline.
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}