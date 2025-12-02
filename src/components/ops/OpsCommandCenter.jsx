import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import OpsStatusBoard from "@/components/ops/OpsStatusBoard";
import OpsSquadPanel from "@/components/ops/OpsSquadPanel";
import { MapPin, Clock, Target, ExternalLink } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

export default function OpsCommandCenter({ event }) {
  if (!event) return (
    <div className="flex items-center justify-center h-full text-zinc-600 font-mono text-sm">
      SELECT OPERATION SIGNAL SOURCE
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-6 p-1">
      {/* Header / Mission Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800 pb-6">
        <div>
           <div className="flex items-center gap-3 mb-2">
              <Badge className={
                  event.event_type === 'focused' 
                  ? "bg-red-950/30 text-red-500 border-red-900" 
                  : "bg-emerald-950/30 text-emerald-500 border-emerald-900"
              }>
                 {event.event_type.toUpperCase()}
              </Badge>
              <span className="text-xs font-mono text-zinc-500 tracking-widest">OP-ID: {event.id.slice(0,8).toUpperCase()}</span>
           </div>
           <h2 className="text-4xl font-black text-white uppercase tracking-tight">{event.title}</h2>
           <div className="flex flex-wrap gap-6 mt-4 text-sm font-mono text-zinc-400">
              <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4 text-zinc-600" />
                 {new Date(event.start_time).toLocaleTimeString()} / {new Date(event.start_time).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                 <MapPin className="w-4 h-4 text-zinc-600" />
                 {event.location || "UNKNOWN SECTOR"}
              </div>
              <div className="flex items-center gap-2">
                 <Target className="w-4 h-4 text-zinc-600" />
                 {event.tags?.join(", ") || "NO TAGS"}
              </div>
           </div>
        </div>
        <div>
           <a href={createPageUrl(`Event?id=${event.id}`)}>
              <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800">
                 <ExternalLink className="w-3 h-3 mr-2" /> Full Mission Brief
              </Button>
           </a>
        </div>
      </div>

      {/* Ops Status Board */}
      <OpsStatusBoard eventId={event.id} />

      {/* Squad Unit Breakdown */}
      <OpsSquadPanel eventId={event.id} />

    </div>
  );
}