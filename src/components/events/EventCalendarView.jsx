/**
 * Event Calendar View
 * Visual calendar display of all scheduled events
 */

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EventCalendarView({ events = [], onEventClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const eventsMap = useMemo(() => {
    const map = {};
    events.forEach((event) => {
      const eventDate = new Date(event.start_time);
      const key = `${eventDate.getFullYear()}-${eventDate.getMonth()}-${eventDate.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    return map;
  }, [events]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = [];
  const totalCells = firstDayOfMonth(currentDate) + daysInMonth(currentDate);

  for (let i = 0; i < totalCells; i++) {
    if (i < firstDayOfMonth(currentDate)) {
      days.push(null);
    } else {
      days.push(i - firstDayOfMonth(currentDate) + 1);
    }
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-lg p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-white">{monthName}</h3>
          </div>
          <div className="flex gap-2">
            <Button onClick={prevMonth} size="sm" variant="outline">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button onClick={nextMonth} size="sm" variant="outline">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="space-y-2">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-bold text-zinc-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const key = day ? `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}` : `empty-${idx}`;
              const dayEvents = day ? eventsMap[key] || [] : [];
              const isToday =
                day &&
                new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div
                  key={key}
                  className={`min-h-20 p-2 rounded border transition ${
                    day
                      ? isToday
                        ? 'bg-orange-500/10 border-orange-500/40'
                        : 'bg-zinc-800/40 border-zinc-700/40 hover:border-zinc-600/60'
                      : 'bg-zinc-900/20 border-transparent'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-orange-400' : 'text-white'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <button
                            key={event.id}
                            onClick={() => onEventClick?.(event)}
                            className="w-full text-left"
                          >
                            <div className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/30 border border-orange-500/40 text-orange-300 hover:bg-orange-500/40 transition truncate">
                              {event.title}
                            </div>
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-zinc-500 px-1.5">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event Legend */}
        <div className="border-t border-zinc-700/50 pt-3 space-y-2">
          <h4 className="text-xs font-semibold text-zinc-400">Upcoming Events</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {Object.entries(eventsMap)
              .flatMap(([_, evts]) => evts)
              .filter((e) => new Date(e.start_time) >= new Date())
              .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
              .slice(0, 5)
              .map((event) => {
                const eventDate = new Date(event.start_time);
                const dateStr = eventDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                return (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="w-full text-left p-2 bg-zinc-800/40 hover:bg-zinc-800/60 rounded text-xs transition"
                  >
                    <div className="font-semibold text-white truncate">{event.title}</div>
                    <div className="text-zinc-400">{dateStr}</div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}