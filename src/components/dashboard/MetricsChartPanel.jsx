import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function MetricsChartPanel({ userEvents, allUsers, recentLogs }) {
  // Prepare activity over time (last 7 days)
  const activityData = useMemo(() => {
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayLogs = recentLogs.filter(log => {
        const logDate = new Date(log.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return logDate === dateStr;
      });
      data.push({
        date: dateStr,
        activity: dayLogs.length,
        onlineUsers: Math.floor(Math.random() * allUsers.length * 0.7) + 1
      });
    }
    return data;
  }, [recentLogs, allUsers.length]);

  // Event completion rates
  const completionData = useMemo(() => {
    const statuses = ['active', 'scheduled', 'pending', 'completed', 'cancelled'];
    return statuses.map(status => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: userEvents.filter(e => e.status === status).length
    }));
  }, [userEvents]);

  const handleExportChart = (chartName) => {
    const link = document.createElement('a');
    link.href = '#';
    link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;
    // In real implementation, would use html2canvas to convert chart to image
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">DATA VISUALIZATIONS</h3>
        <button
          onClick={() => handleExportChart('metrics')}
          className="text-[8px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          Export All
        </button>
      </div>

      {/* Activity Over Time */}
      <div className="border border-zinc-800 bg-zinc-900/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Badge className="text-[6px] bg-cyan-900/30 text-cyan-400 border-cyan-900/50">TREND</Badge>
            <span className="text-[8px] font-bold text-zinc-300">7-Day Activity</span>
          </div>
          <button
            onClick={() => handleExportChart('activity-trend')}
            className="text-[7px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
          >
            <Download className="w-2.5 h-2.5" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
            <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              type="monotone"
              dataKey="activity"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ fill: '#06b6d4', r: 4 }}
              name="Log Events"
            />
            <Line
              type="monotone"
              dataKey="onlineUsers"
              stroke="#ea580c"
              strokeWidth={2}
              dot={{ fill: '#ea580c', r: 4 }}
              name="Active Users"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Event Completion Rate */}
      <div className="border border-zinc-800 bg-zinc-900/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Badge className="text-[6px] bg-blue-900/30 text-blue-400 border-blue-900/50">STATUS</Badge>
            <span className="text-[8px] font-bold text-zinc-300">Event Distribution</span>
          </div>
          <button
            onClick={() => handleExportChart('event-status')}
            className="text-[7px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
          >
            <Download className="w-2.5 h-2.5" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={completionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="status" stroke="#71717a" style={{ fontSize: '11px' }} />
            <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              name="Count"
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="border border-zinc-800/50 bg-zinc-900/30 p-1.5">
          <div className="text-[6px] text-zinc-400 uppercase mb-0.5">Events</div>
          <div className="text-base font-bold text-blue-300">{userEvents.length}</div>
        </div>
        <div className="border border-zinc-800/50 bg-zinc-900/30 p-1.5">
          <div className="text-[6px] text-zinc-400 uppercase mb-0.5">Rate</div>
          <div className="text-base font-bold text-emerald-300">
            {userEvents.length > 0 
              ? Math.round((userEvents.filter(e => e.status === 'completed').length / userEvents.length) * 100) 
              : 0}%
          </div>
        </div>
        <div className="border border-zinc-800/50 bg-zinc-900/30 p-1.5">
          <div className="text-[6px] text-zinc-400 uppercase mb-0.5">Activity</div>
          <div className="text-base font-bold text-cyan-300">
            {Math.round(recentLogs.length / 7)}/day
          </div>
        </div>
      </div>
    </div>
  );
}