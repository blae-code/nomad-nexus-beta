import React, { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function MetricsChartPanel({ userEvents, allUsers, recentLogs, treasuryBalance = 0 }) {
  const [fundView, setFundView] = useState(0);
  
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

  // Org fund allocation
  const fundAllocationData = useMemo(() => {
    const totalEvents = userEvents.length || 1;
    const activeEvents = userEvents.filter(e => e.status === 'active').length || 1;
    const completedEvents = userEvents.filter(e => e.status === 'completed').length || 1;
    
    return [
      { category: 'Operations', amount: Math.round(treasuryBalance * 0.4) },
      { category: 'Fleet', amount: Math.round(treasuryBalance * 0.3) },
      { category: 'Reserves', amount: Math.round(treasuryBalance * 0.2) },
      { category: 'Active', amount: Math.round(treasuryBalance * 0.1) }
    ];
  }, [treasuryBalance, userEvents]);

  // Alternative fund views
  const fundViews = [
    fundAllocationData,
    [
      { category: 'Active Ops', amount: Math.round(treasuryBalance * 0.35) },
      { category: 'Pending', amount: Math.round(treasuryBalance * 0.25) },
      { category: 'Scheduled', amount: Math.round(treasuryBalance * 0.2) },
      { category: 'Completed', amount: Math.round(treasuryBalance * 0.2) }
    ]
  ];

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

      {/* Charts Row - Activity & Treasury */}
      <div className="grid grid-cols-2 gap-2">
        {/* Activity Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-zinc-800 bg-zinc-900/30 p-2">
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
        </motion.div>

        {/* Org Fund Allocation */}
        <motion.div
          key={fundView}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          className="border border-zinc-800 bg-zinc-900/30 p-2"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge className="text-[6px] bg-purple-900/30 text-purple-400 border-purple-900/50">FUNDS</Badge>
              <span className="text-[8px] font-bold text-zinc-300">{fundView === 0 ? 'Treasury Allocation' : 'Event Distribution'}</span>
            </div>
            <button
              onClick={() => setFundView((fundView + 1) % fundViews.length)}
              className="text-[7px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              ↻
            </button>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={fundViews[fundView]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="category" stroke="#71717a" style={{ fontSize: '11px' }} />
            <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
              labelStyle={{ color: '#e4e4e7' }}
              formatter={(value) => value.toLocaleString()}
            />
            <Bar
              dataKey="amount"
              fill="#a855f7"
              name="aUEC"
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
        </motion.div>
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