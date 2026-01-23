import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';

export default function EventCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events', currentDate.getFullYear(), currentDate.getMonth()],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list();
      return allEvents.filter(e => e.phase !== 'ARCHIVED');
    }
  });

  // Calendar helpers
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Get events for a specific day
  const getEventsForDay = (day) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  // Navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Generate calendar days
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null); // Empty cells for days before month starts
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <div className="bg-zinc-950 border border-zinc-800">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[#ea580c]" />
          <span className="text-sm font-bold uppercase tracking-wider text-zinc-300">
            {monthName}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="w-7 h-7 flex items-center justify-center border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="h-7 px-3 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 transition-colors text-xs font-mono"
          >
            TODAY
          </button>
          <button
            onClick={nextMonth}
            className="w-7 h-7 flex items-center justify-center border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
            <div key={day} className="text-center text-[8px] font-bold text-zinc-600 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={day}
                className={cn(
                  "aspect-square border border-zinc-800 bg-zinc-900/30 p-1 relative overflow-hidden",
                  isToday(day) && "border-[#ea580c] bg-[#ea580c]/5",
                  hasEvents && "cursor-pointer hover:border-zinc-700"
                )}
              >
                <div className={cn(
                  "text-xs font-mono mb-1",
                  isToday(day) ? "text-[#ea580c] font-bold" : "text-zinc-400"
                )}>
                  {day}
                </div>

                {/* Event indicators */}
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <a
                      key={event.id}
                      href={createPageUrl(`Events?id=${event.id}`)}
                      className="block"
                    >
                      <div className={cn(
                        "text-[7px] font-mono px-1 py-0.5 truncate",
                        event.event_type === 'focused' 
                          ? "bg-red-900/30 text-red-400 border-l-2 border-red-500" 
                          : "bg-emerald-900/30 text-emerald-400 border-l-2 border-emerald-500"
                      )}>
                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {event.title}
                      </div>
                    </a>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[7px] text-zinc-600 font-mono pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}