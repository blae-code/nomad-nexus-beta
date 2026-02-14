import React, { useState, useEffect } from 'react';
import { Calendar, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export default function EventTimelineWidget({ widgetId, config, onRemove, isDragging }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const allEvents = await base44.entities.Event.list('-start_time', 10);
      setEvents(allEvents);
    } catch (error) {
      console.error('[EventTimelineWidget] Failed to load events:', error);
    }
  };

  const statusColors = {
    scheduled: 'border-blue-500/50 text-blue-400',
    active: 'border-green-500/50 text-green-400',
    completed: 'border-zinc-600/50 text-zinc-500',
    cancelled: 'border-red-500/50 text-red-400',
  };

  return (
    <>
      <div className="widget-drag-handle bg-zinc-800/90 border-b border-orange-500/20 px-3 py-2 flex items-center justify-between cursor-move">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">Operations</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-red-400 hover:text-red-300"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.length === 0 ? (
          <div className="text-center text-zinc-600 text-xs py-4">No operations scheduled</div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className={`bg-zinc-800/50 rounded p-2 border-l-2 ${statusColors[event.status] || 'border-zinc-600/50 text-zinc-400'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-zinc-200 truncate">{event.title}</div>
                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(event.start_time), 'MMM d, HH:mm')}
                  </div>
                </div>
                <span className="text-xs font-bold uppercase">{event.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}