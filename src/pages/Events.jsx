import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Clock, Users, MapPin, Power, UserPlus } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useCurrentUser } from '@/components/useCurrentUser';

export default function Events() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const activeOp = useActiveOp();
  const { user } = useCurrentUser();

  useEffect(() => {
    const init = async () => {
      const eventsList = await base44.entities.Event.list('-start_time', 50);
      setEvents(eventsList);
      setLoading(false);
    };
    init();
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'text-blue-400 border-blue-500/50',
      active: 'text-green-400 border-green-500/50',
      completed: 'text-zinc-500 border-zinc-600',
      cancelled: 'text-red-400 border-red-500/50',
    };
    return colors[status] || 'text-zinc-400 border-zinc-600';
  };

  if (loading) {
    return <div className="p-8 text-center text-orange-500">LOADING...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Events</h1>
          <p className="text-zinc-400 text-sm">Mission planning and operations</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Event
        </Button>
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <EmptyState 
            icon={Calendar}
            title="No events scheduled"
            description="Create your first operation to get started"
          />
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="bg-zinc-900/50 border-2 border-zinc-800 hover:border-orange-500/50 p-6 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-white uppercase">{event.title}</h3>
                    <span className={`px-3 py-1 text-xs font-bold uppercase border ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-zinc-400 mb-4">{event.description}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(event.start_time).toLocaleString()}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {event.location}
                      </div>
                    )}
                    {event.assigned_user_ids?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {event.assigned_user_ids.length} assigned
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant={activeOp.activeEventId === event.id ? 'default' : 'outline'}
                    onClick={() => {
                      if (activeOp.activeEventId === event.id) {
                        activeOp.clearActiveEvent();
                      } else {
                        activeOp.setActiveEvent(event.id);
                      }
                    }}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {activeOp.activeEventId === event.id ? 'Active' : 'Set Active'}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => activeOp.joinOp(event.id, user)}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Join Op
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}