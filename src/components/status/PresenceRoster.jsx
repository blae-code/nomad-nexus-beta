import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, Radio } from 'lucide-react';
import PresenceIndicator from './PresenceIndicator';

export default function PresenceRoster({ eventId, netId }) {
  const [presences, setPresences] = useState([]);

  const query = {};
  if (eventId) query.event_id = eventId;
  if (netId) query.net_id = netId;

  const { data: presenceList } = useQuery({
    queryKey: ['user-presence', eventId, netId],
    queryFn: async () => {
      if (Object.keys(query).length === 0) {
        return await base44.entities.UserPresence.list('-last_activity', 50);
      }
      return await base44.entities.UserPresence.filter(query, '-last_activity', 50);
    },
    initialData: []
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-presence'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Real-time subscription
  useEffect(() => {
    if (!base44.entities.UserPresence.subscribe) return;
    
    const unsubscribe = base44.entities.UserPresence.subscribe((event) => {
      setPresences(prev => {
        if (event.type === 'create' || event.type === 'update') {
          const filtered = prev.filter(p => p.id !== event.data.id);
          return [...filtered, event.data].sort((a, b) => 
            new Date(b.last_activity) - new Date(a.last_activity)
          );
        } else if (event.type === 'delete') {
          return prev.filter(p => p.id !== event.id);
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  // Sync initial data
  useEffect(() => {
    setPresences(presenceList);
  }, [presenceList]);

  const onlineCount = presences.filter(p => p.status !== 'offline').length;
  const transmittingCount = presences.filter(p => p.is_transmitting).length;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-3 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[#ea580c]" />
            Active Personnel
            <Badge variant="outline" className="text-[10px]">
              {onlineCount}/{presences.length}
            </Badge>
          </CardTitle>
          {transmittingCount > 0 && (
            <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 gap-1">
              <Radio className="w-3 h-3" />
              {transmittingCount} TX
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-96">
          <div className="p-3 space-y-2">
            {presences.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-xs">
                No active personnel
              </div>
            ) : (
              presences.map(presence => {
                const user = users.find(u => u.id === presence.user_id);
                if (!user) return null;

                return (
                  <div
                    key={presence.id}
                    className="p-3 bg-zinc-800/30 border border-zinc-700 hover:border-zinc-600 transition-colors rounded"
                  >
                    <PresenceIndicator
                      presence={presence}
                      user={user}
                      size="sm"
                      showLabel={true}
                      showNet={true}
                    />
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}