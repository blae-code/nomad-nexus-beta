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
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-zinc-200">Operation Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={prevMonth} className="w-8 h-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-bold text-zinc-300 min-w-[150px] text-center">{monthName}</span>
              <Button size="icon" variant="ghost" onClick={nextMonth} className="w-8 h-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 pl-8 h-8 text-sm"
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-3 h-8 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="STANDARD">Standard</option>
              <option value="LOW">Low</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded px-3 h-8 text-sm"
            >
              <option value="all">All Types</option>
              <option value="focused">Focused</option>
              <option value="casual">Casual</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="space-y-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-zinc-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for days before month starts */}
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-zinc-950/50 rounded-lg" />
            ))}

            {/* Days of the month */}
            {days.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

              return (
                <div
                  key={day}
                  className={`aspect-square border rounded-lg p-1 flex flex-col overflow-hidden transition-colors ${
                    isToday ? 'border-red-500 bg-red-950/20' : 'border-zinc-800 bg-zinc-950/50 hover:bg-zinc-950/80'
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${isToday ? 'text-red-500' : 'text-zinc-400'}`}>
                    {day}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-0.5">
                    {dayEvents.slice(0, 2).map(event => (
                      <a
                        key={event.id}
                        href={createPageUrl(`Events?id=${event.id}`)}
                        className={`text-[9px] px-1 py-0.5 rounded border truncate block hover:opacity-80 transition-opacity cursor-pointer ${typeColors[event.event_type]}`}
                        title={event.title}
                      >
                        {event.title}
                      </a>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[8px] text-zinc-500 px-1">
                        +{dayEvents.length - 2} more
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
          <div className="mt-6 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-bold text-zinc-400 uppercase mb-3">Filtered Operations ({filteredEvents.length})</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredEvents.map(event => (
                <a
                  key={event.id}
                  href={createPageUrl(`Events?id=${event.id}`)}
                  className="block p-2 bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 rounded transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-zinc-200 truncate">{event.title}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 h-5 flex items-center ${priorityColors[event.priority]}`}>
                        {event.priority}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 h-5 flex items-center ${event.event_type === 'focused' ? 'text-red-500 border-red-900 bg-red-950/10' : 'text-emerald-500 border-emerald-900 bg-emerald-950/10'}`}>
                        {event.event_type}
                      </Badge>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}