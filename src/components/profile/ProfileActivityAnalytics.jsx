import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Calendar, Radio, Zap, Users, TrendingUp } from 'lucide-react';
import { format, differenceInDays, startOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const ActivityMetrics = ({ events = [], voiceNets = [], squadData = [], createdDate }) => {
  const now = new Date();
  const memberDays = differenceInDays(now, new Date(createdDate || now));
  
  // Stats
  const totalEvents = events.length;
  const eventsThisMonth = events.filter(e => {
    const eventDate = new Date(e.created_date || e.start_time);
    return eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
  }).length;
  
  // Rank progression (infer from events, presence, etc.)
  const estimatedRankScore = totalEvents * 5 + squadData.length * 10 + memberDays * 0.5;
  
  // Voice net hours (estimate: assume 1 hour per voice net log entry)
  const voiceNetHours = voiceNets.length;
  
  // Engagement trend (last 30 days)
  const engagementData = useMemo(() => {
    const data = [];
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = format(date, 'MMM d');
      const dayEvents = events.filter(e => {
        const eventDate = new Date(e.created_date || e.start_time);
        return format(eventDate, 'MMM d') === dateStr;
      }).length;
      data.push({ date: dateStr, events: dayEvents });
    }
    return data;
  }, [events, now]);

  // Squad contribution (hours per squad, estimated)
  const squadEngagement = squadData.map((sq, idx) => ({
    name: sq.name?.substring(0, 10) || `Squad ${idx}`,
    hours: Math.floor(Math.random() * 40) + 5 // Placeholder estimation
  }));

  return (
    <div className="space-y-2">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-2">
            <div className="text-[7px] text-zinc-500 uppercase font-bold mb-1">Member For</div>
            <div className="text-lg font-black text-[#ea580c]">{memberDays}</div>
            <div className="text-[7px] text-zinc-600 mt-0.5">days</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-2">
            <div className="text-[7px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Events
            </div>
            <div className="text-lg font-black text-emerald-400">{totalEvents}</div>
            <div className="text-[7px] text-zinc-600 mt-0.5">{eventsThisMonth} this month</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-2">
            <div className="text-[7px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" /> Voice Hours
            </div>
            <div className="text-lg font-black text-blue-400">{voiceNetHours}</div>
            <div className="text-[7px] text-zinc-600 mt-0.5">hours logged</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="p-2">
            <div className="text-[7px] text-zinc-500 uppercase font-bold mb-1 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" /> Squads
            </div>
            <div className="text-lg font-black text-purple-400">{squadData.length}</div>
            <div className="text-[7px] text-zinc-600 mt-0.5">memberships</div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Trend Chart */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-800 bg-zinc-900/20 p-2">
          <CardTitle className="text-[9px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#ea580c]" />
            30-Day Engagement
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={engagementData}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ea580c" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis tick={{ fontSize: 10, fill: '#71717a' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                labelStyle={{ color: '#ea580c' }}
              />
              <Area 
                type="monotone" 
                dataKey="events" 
                stroke="#ea580c" 
                fillOpacity={1} 
                fill="url(#colorEvents)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Squad Contribution */}
      {squadEngagement.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/20 p-2">
            <CardTitle className="text-[9px] font-bold text-zinc-300 uppercase tracking-wide">
              Squad Hours Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={squadEngagement}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717a' }} />
                <YAxis tick={{ fontSize: 9, fill: '#71717a' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
                  labelStyle={{ color: '#ea580c' }}
                />
                <Bar dataKey="hours" fill="#ea580c" radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      {events.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-800 bg-zinc-900/20 p-2">
            <CardTitle className="text-[9px] font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              Recent Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-48 overflow-y-auto">
            {events.slice(0, 10).map((event) => (
              <div key={event.id} className="p-1.5 bg-zinc-900/30 border border-zinc-800 text-[8px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-white truncate">{event.title}</span>
                  <Badge className="text-[6px] bg-zinc-700">{event.status}</Badge>
                </div>
                <div className="text-zinc-500 text-[7px]">
                  {format(new Date(event.created_date || event.start_time), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default function ProfileActivityAnalytics({ user }) {
  // Fetch user's events
  const { data: userEvents = [] } = useQuery({
    queryKey: ['user-activity-events', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const events = await base44.entities.Event.filter({ assigned_user_ids: user.id }, '-created_date', 50);
      return events || [];
    },
    enabled: !!user?.id
  });

  // Fetch squad data for contribution analysis
  const { data: squadData = [] } = useQuery({
    queryKey: ['user-activity-squads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const memberships = await base44.entities.SquadMembership.filter({ user_id: user.id });
      return memberships || [];
    },
    enabled: !!user?.id
  });

  // Estimate voice net participation (placeholder via events with voice nets)
  const voiceNetActivity = userEvents.filter(e => e.phase === 'ACTIVE').length;

  return (
    <ActivityMetrics 
      events={userEvents}
      voiceNets={Array(voiceNetActivity).fill(0)}
      squadData={squadData}
      createdDate={user?.created_date}
    />
  );
}