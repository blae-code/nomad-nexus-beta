import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PlayerStatusUpdatePanel from "@/components/status/PlayerStatusUpdatePanel";
import PlayerStatusRoster from "@/components/status/PlayerStatusRoster";

export default function PlayerStatusSection({ eventId }) {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: myStatus } = useQuery({
    queryKey: ['my-status', eventId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const statuses = await base44.entities.PlayerStatus.filter({ 
        user_id: currentUser.id,
        event_id: eventId
      });
      return statuses[0] || null;
    },
    enabled: !!currentUser && !!eventId,
    initialData: null
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <PlayerStatusUpdatePanel 
        eventId={eventId} 
        user={currentUser} 
        currentStatus={myStatus} 
      />
      <PlayerStatusRoster eventId={eventId} />
    </div>
  );
}