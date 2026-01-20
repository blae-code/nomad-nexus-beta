import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Users, Radio, AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ContextPanelIntelligence({ currentPage, eventId, netId }) {
  // Fetch context-specific data based on page
  const { data: eventData } = useQuery({
    queryKey: ['context-event', eventId],
    queryFn: () => eventId ? base44.entities.Event.get(eventId) : null,
    enabled: !!eventId
  });

  const { data: netData } = useQuery({
    queryKey: ['context-net', netId],
    queryFn: () => netId ? base44.entities.VoiceNet.get(netId) : null,
    enabled: !!netId
  });

  const { data: participants } = useQuery({
    queryKey: ['context-participants', eventId],
    queryFn: () => eventId ? base44.entities.UserPresence.filter({ event_id: eventId }) : [],
    enabled: !!eventId,
    initialData: []
  });

  // EVENT PAGE CONTEXT
  if (currentPage === 'events' && eventData) {
    return (
      <OpsPanel>
        <OpsPanelHeader>
          <OpsPanelTitle className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Event Status
          </OpsPanelTitle>
        </OpsPanelHeader>
        <OpsPanelContent className="space-y-3 text-xs">
          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">STATUS</div>
            <Badge variant="outline">{eventData.status?.toUpperCase()}</Badge>
          </div>

          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">PARTICIPANTS</div>
            <div className="text-zinc-300">{participants.length} ONLINE</div>
          </div>

          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">LOCATION</div>
            <div className="font-mono text-zinc-400">{eventData.location || 'TBD'}</div>
          </div>

          {eventData.start_time && (
            <div>
              <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">START TIME</div>
              <div className="font-mono text-zinc-400">
                {new Date(eventData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
            </div>
          )}
        </OpsPanelContent>
      </OpsPanel>
    );
  }

  // COMMS PAGE CONTEXT
  if (currentPage === 'comms' && netData) {
    return (
      <OpsPanel>
        <OpsPanelHeader>
          <OpsPanelTitle className="flex items-center gap-2">
            <Radio className="w-3 h-3 text-emerald-500" />
            Net Status
          </OpsPanelTitle>
        </OpsPanelHeader>
        <OpsPanelContent className="space-y-3 text-xs">
          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">FREQUENCY</div>
            <div className="font-mono text-zinc-300">{netData.code}</div>
          </div>

          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">STATUS</div>
            <Badge variant="outline">{netData.status?.toUpperCase()}</Badge>
          </div>

          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">TYPE</div>
            <div className="text-zinc-300">{netData.type?.toUpperCase()}</div>
          </div>

          <div>
            <div className="text-zinc-500 uppercase tracking-wider font-bold mb-1">DISCIPLINE</div>
            <Badge variant="outline" className="text-[9px]">{netData.discipline?.toUpperCase()}</Badge>
          </div>
        </OpsPanelContent>
      </OpsPanel>
    );
  }

  return null;
}