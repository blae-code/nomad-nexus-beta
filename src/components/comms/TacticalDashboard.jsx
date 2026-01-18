import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TacticalMapDisplay from "./TacticalMapDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radio, Ship, Users, AlertTriangle, Activity, MapPin, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TacticalDashboard({ eventId }) {
  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId
  });

  const { data: voiceNets } = useQuery({
    queryKey: ['dashboard-nets', eventId],
    queryFn: () => base44.entities.VoiceNet.filter({ event_id: eventId }),
    refetchInterval: 5000,
    initialData: []
  });

  const { data: assets } = useQuery({
    queryKey: ['dashboard-assets', eventId],
    queryFn: () => base44.entities.FleetAsset.list(),
    refetchInterval: 5000,
    initialData: []
  });

  const { data: playerStatuses } = useQuery({
    queryKey: ['dashboard-personnel', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    refetchInterval: 3000,
    initialData: []
  });

  const { data: alerts } = useQuery({
    queryKey: ['dashboard-alerts', eventId],
    queryFn: () => base44.entities.AIAgentLog.filter({ 
      event_id: eventId, 
      type: 'ALERT' 
    }, '-created_date', 5),
    refetchInterval: 5000,
    initialData: []
  });

  const activeNets = voiceNets.filter(n => n.status === 'active');
  const operationalAssets = assets.filter(a => a.status === 'OPERATIONAL' || a.status === 'MISSION');
  const distressPersonnel = playerStatuses.filter(p => p.status === 'DISTRESS');
  const engagedPersonnel = playerStatuses.filter(p => p.status === 'ENGAGED');
  const readyPersonnel = playerStatuses.filter(p => p.status === 'READY');

  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-hidden">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        {/* Active Nets */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Radio className="w-3 h-3 text-emerald-400" />
              Active Nets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-emerald-400">{activeNets.length}</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {voiceNets.length} Total Configured
            </div>
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Ship className="w-3 h-3 text-blue-400" />
              Fleet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-blue-400">{operationalAssets.length}</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {assets.filter(a => a.status === 'MISSION').length} On Mission
            </div>
          </CardContent>
        </Card>

        {/* Personnel */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Users className="w-3 h-3 text-cyan-400" />
              Personnel
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-2xl font-bold text-cyan-400">{playerStatuses.length}</div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {readyPersonnel.length} Ready • {engagedPersonnel.length} Engaged
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className={cn(
          "border-zinc-800",
          distressPersonnel.length > 0 ? "bg-red-950/20 border-red-900/50" : "bg-zinc-900/50"
        )}>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <AlertTriangle className={cn(
                "w-3 h-3",
                distressPersonnel.length > 0 ? "text-red-400 animate-pulse" : "text-amber-400"
              )} />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className={cn(
              "text-2xl font-bold",
              distressPersonnel.length > 0 ? "text-red-400" : "text-zinc-500"
            )}>
              {distressPersonnel.length}
            </div>
            <div className={cn(
              "text-[10px] mt-1 uppercase font-bold",
              distressPersonnel.length > 0 ? "text-red-400" : "text-zinc-600"
            )}>
              {distressPersonnel.length > 0 ? 'DISTRESS ACTIVE' : 'All Clear'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Tactical Map - Takes 2 columns */}
        <div className="col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#ea580c]" />
              Tactical Display
            </h3>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px]">
              <Activity className="w-2 h-2 mr-1" />
              LIVE
            </Badge>
          </div>
          <div className="flex-1 min-h-0">
            <TacticalMapDisplay eventId={eventId} />
          </div>
        </div>

        {/* Right Panel - Alerts & Details */}
        <div className="flex flex-col gap-4 overflow-hidden">
          {/* Critical Alerts */}
          <Card className="bg-zinc-900/50 border-zinc-800 flex flex-col flex-1 min-h-0">
            <CardHeader className="p-3 pb-2 shrink-0">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Shield className="w-3 h-3 text-red-400" />
                Critical Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {alerts.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs py-4">
                  <Shield className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  No active alerts
                </div>
              ) : (
                alerts.map(alert => (
                  <div 
                    key={alert.id}
                    className={cn(
                      "p-2 rounded border text-xs",
                      alert.severity === 'HIGH' ? "bg-red-950/20 border-red-900/50" :
                      alert.severity === 'MEDIUM' ? "bg-amber-950/20 border-amber-900/50" :
                      "bg-zinc-900/50 border-zinc-800"
                    )}
                  >
                    <div className={cn(
                      "font-bold text-[10px] uppercase mb-1",
                      alert.severity === 'HIGH' ? "text-red-400" :
                      alert.severity === 'MEDIUM' ? "text-amber-400" :
                      "text-zinc-400"
                    )}>
                      {alert.severity} • {alert.type}
                    </div>
                    <div className="text-zinc-300">{alert.summary}</div>
                    {alert.details && (
                      <div className="text-zinc-500 text-[10px] mt-1">{alert.details}</div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Voice Nets */}
          <Card className="bg-zinc-900/50 border-zinc-800 flex flex-col flex-1 min-h-0">
            <CardHeader className="p-3 pb-2 shrink-0">
              <CardTitle className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <Radio className="w-3 h-3 text-emerald-400" />
                Active Frequencies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {activeNets.length === 0 ? (
                <div className="text-center text-zinc-600 text-xs py-4">
                  <Radio className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  No active nets
                </div>
              ) : (
                activeNets.map(net => (
                  <div 
                    key={net.id}
                    className="flex items-center justify-between p-2 bg-zinc-900/50 rounded border border-zinc-800 hover:border-emerald-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <div>
                        <div className="text-xs font-bold text-emerald-400 font-mono">
                          {net.code}
                        </div>
                        <div className="text-[10px] text-zinc-500">{net.label}</div>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px]",
                        net.priority === 1 ? "border-red-500/30 text-red-400" :
                        net.priority === 2 ? "border-amber-500/30 text-amber-400" :
                        "border-zinc-700 text-zinc-500"
                      )}
                    >
                      P{net.priority}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}