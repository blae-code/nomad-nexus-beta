import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight, Users } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => base44.entities.Event.list({ sort: { start_time: -1 } }),
    initialData: []
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">Operations Board</h1>
            <p className="text-zinc-500 mt-1">Upcoming missions and deployments.</p>
          </div>
          <Button className="bg-red-900 hover:bg-red-800 text-white">
            Create Operation
          </Button>
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
                      
                      <a href={createPageUrl(`Event?id=${event.id}`)}>
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