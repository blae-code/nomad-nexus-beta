import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, ArrowLeft, Clock, Users, MapPin } from 'lucide-react';

export default function Events() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          window.location.href = createPageUrl('AccessGate');
          return;
        }
        const eventsList = await base44.entities.Event.list('-start_time', 50);
        setEvents(eventsList);
        setLoading(false);
      } catch (error) {
        window.location.href = createPageUrl('AccessGate');
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-orange-500 text-xl">LOADING...</div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'text-blue-400 border-blue-500/50',
      active: 'text-green-400 border-green-500/50',
      completed: 'text-zinc-500 border-zinc-600',
      cancelled: 'text-red-400 border-red-500/50',
    };
    return colors[status] || 'text-zinc-400 border-zinc-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(234,88,12,0.03)_50%,transparent_75%)] bg-[length:40px_40px] opacity-30" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <a href={createPageUrl('Hub')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </a>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-white">Events</h1>
              <p className="text-zinc-400 text-sm">Mission planning and operations</p>
            </div>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Event
          </Button>
        </div>

        <div className="grid gap-4">
          {events.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              No events scheduled
            </div>
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
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}