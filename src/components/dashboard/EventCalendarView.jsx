import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function EventCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 20));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: []
  });

  // Color mappings
  const priorityColors = {
    CRITICAL: 'bg-red-950/30 border-red-900 text-red-400',
    HIGH: 'bg-orange-950/30 border-orange-900 text-orange-400',
    STANDARD: 'bg-blue-950/30 border-blue-900 text-blue-400',
    LOW: 'bg-zinc-800 border-zinc-700 text-zinc-400'
  };

  const typeColors = {
    focused: 'bg-red-500/10 border-l-4 border-red-500',
    casual: 'bg-emerald-500/10 border-l-4 border-emerald-500'
  };

  // Filter and search events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchSearch = !searchTerm || event.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPriority = filterPriority === 'all' || event.priority === filterPriority;
      const matchType = filterType === 'all' || event.event_type === filterType;
      return matchSearch && matchPriority && matchType;
    });
  }, [events, searchTerm, filterPriority, filterType]);

  // Get calendar days
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    return filteredEvents.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === targetDate.toDateString();
    });
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    <Card className="bg-zinc-900 border-zinc-800 lg:col-span-full">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-zinc-200">Operation Calendar</CardTitle>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" onClick={prevMonth} className="w-6 h-6">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs font-bold text-zinc-300 min-w-[120px] text-center">{monthName}</span>
              <Button size="icon" variant="ghost" onClick={nextMonth} className="w-6 h-6">
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
            <div className="relative">
              <Search className="absolute left-1.5 top-1.5 w-3 h-3 text-zinc-500" />
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pl-6 h-7 text-xs"
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 h-7 text-xs"
            >
              <option value="all">Priority</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="STANDARD">Standard</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-2 h-7 text-xs"
            >
              <option value="all">Type</option>
              <option value="focused">Focused</option>
              <option value="casual">Casual</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {/* Calendar Grid */}
        <div className="space-y-1.5">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-zinc-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-zinc-950/50 rounded" />
            ))}

            {/* Days of the month */}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

              return (
                <div
                  key={day}
                  className={`aspect-square border rounded p-0.5 flex flex-col overflow-hidden transition-colors ${
                    isToday ? 'border-red-500 bg-red-950/20' : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950/80'
                  }`}
                >
                  <div className={`text-[10px] font-bold leading-none ${isToday ? 'text-red-500' : 'text-zinc-400'}`}>
                    {day}
                  </div>
                  <div className="flex-1 overflow-hidden space-y-0">
                    {dayEvents.slice(0, 1).map(event => (
                      <a
                        key={event.id}
                        href={createPageUrl(`Events?id=${event.id}`)}
                        className={`text-[7px] px-0.5 py-0.5 rounded truncate block hover:opacity-80 transition-opacity cursor-pointer ${typeColors[event.event_type]}`}
                        title={event.title}
                      >
                        {event.title}
                      </a>
                    ))}
                    {dayEvents.length > 1 && (
                      <div className="text-[6px] text-zinc-500 px-0.5 leading-none">
                        +{dayEvents.length - 1}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Event List for Selected Month */}
        {filteredEvents.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-800">
            <h3 className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Operations ({filteredEvents.length})</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredEvents.slice(0, 5).map(event => (
                <a
                  key={event.id}
                  href={createPageUrl(`Events?id=${event.id}`)}
                  className="block p-1 bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 rounded transition-colors"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-zinc-200 truncate">{event.title}</div>
                      <div className="text-[8px] text-zinc-500">
                        {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Badge variant="outline" className={`text-[7px] px-1 py-0 h-4 flex items-center ${priorityColors[event.priority]}`}>
                        {event.priority.slice(0, 3)}
                      </Badge>
                    </div>
                  </div>
                </a>
              ))}
              {filteredEvents.length > 5 && (
                <div className="text-[8px] text-zinc-500 px-1">+{filteredEvents.length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}