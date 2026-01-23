import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Radio, 
  Hash, 
  MapPin,
  Users,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import moment from 'moment';

export default function IncidentDashboard({ eventId, onSelectIncident }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('active');

  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents', eventId, filter],
    queryFn: async () => {
      const baseFilter = eventId ? { event_id: eventId } : {};
      if (filter !== 'all') {
        baseFilter.status = filter;
      }
      // Limit to 30 for performance
      return base44.entities.Incident.filter(baseFilter, '-created_date', 30);
    },
    staleTime: 15000,
    refetchInterval: false, // Use subscriptions instead
    gcTime: 45000
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Incident.update(id, { 
      status,
      ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {})
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success('Status updated');
    }
  });

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-950/30 text-red-400 border-red-900';
      case 'HIGH': return 'bg-orange-950/30 text-orange-400 border-orange-900';
      case 'MEDIUM': return 'bg-yellow-950/30 text-yellow-400 border-yellow-900';
      case 'LOW': return 'bg-blue-950/30 text-blue-400 border-blue-900';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-red-950/30 text-red-400 border-red-900';
      case 'responding': return 'bg-orange-950/30 text-orange-400 border-orange-900';
      case 'contained': return 'bg-yellow-950/30 text-yellow-400 border-yellow-900';
      case 'resolved': return 'bg-green-950/30 text-green-400 border-green-900';
      case 'cancelled': return 'bg-zinc-800 text-zinc-500 border-zinc-700';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'responding');
  const criticalCount = activeIncidents.filter(i => i.severity === 'CRITICAL').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Incident Monitor</div>
            <div className="text-[10px] text-zinc-600 font-mono">REAL-TIME TRACKING</div>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-950/30 text-red-400 border-red-900 text-[9px] animate-pulse">
                {criticalCount} CRITICAL
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px]">
              {activeIncidents.length} Active
            </Badge>
          </div>
        </div>

        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="bg-zinc-950 border-zinc-800 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="responding">Responding</SelectItem>
            <SelectItem value="contained">Contained</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All Incidents</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Incidents List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {isLoading && (
            <div className="text-center py-8 text-xs text-zinc-600">Loading incidents...</div>
          )}
          
          {!isLoading && incidents.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-zinc-500">No incidents to display</p>
            </div>
          )}

          {incidents.map(incident => (
            <div
              key={incident.id}
              className="bg-zinc-900/50 border border-zinc-800 p-3 hover:border-zinc-700 transition-colors group cursor-pointer"
              onClick={() => onSelectIncident?.(incident)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <AlertTriangle className={cn(
                    "w-4 h-4 mt-0.5 shrink-0",
                    incident.severity === 'CRITICAL' && "text-red-500 animate-pulse",
                    incident.severity === 'HIGH' && "text-orange-500",
                    incident.severity === 'MEDIUM' && "text-yellow-500",
                    incident.severity === 'LOW' && "text-blue-500"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-zinc-200 mb-1">{incident.title}</div>
                    {incident.description && (
                      <p className="text-[10px] text-zinc-500 line-clamp-2">{incident.description}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className={cn("text-[9px]", getSeverityColor(incident.severity))}>
                  {incident.severity}
                </Badge>
                <Badge className={cn("text-[9px]", getStatusColor(incident.status))}>
                  {incident.status.toUpperCase()}
                </Badge>
                {incident.incident_type && (
                  <Badge variant="outline" className="text-[9px] text-zinc-500">
                    {incident.incident_type}
                  </Badge>
                )}
              </div>

              <div className="space-y-1 text-[10px] text-zinc-600">
                {incident.affected_area && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {incident.affected_area}
                  </div>
                )}
                {incident.assigned_net_id && (
                  <div className="flex items-center gap-1 text-emerald-500">
                    <Radio className="w-3 h-3" />
                    Net assigned
                  </div>
                )}
                {incident.assigned_channel_id && (
                  <div className="flex items-center gap-1 text-blue-500">
                    <Hash className="w-3 h-3" />
                    Channel linked
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {moment(incident.created_date).fromNow()}
                </div>
              </div>

              {incident.status !== 'resolved' && incident.status !== 'cancelled' && (
                <div className="mt-2 pt-2 border-t border-zinc-800 flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStatusMutation.mutate({ id: incident.id, status: 'responding' });
                    }}
                    className="h-6 text-[10px] flex-1"
                  >
                    Responding
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateStatusMutation.mutate({ id: incident.id, status: 'resolved' });
                    }}
                    className="h-6 text-[10px] flex-1"
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}