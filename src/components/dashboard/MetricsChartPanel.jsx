import React, { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export default function MetricsChartPanel({ userEvents, allUsers, recentLogs, treasuryBalance = 0, fleetAssets = [] }) {
  const [fundView, setFundView] = useState(0);
  
  // Active users by UTC hour (24-hour cycle)
  const activeUsersByUTC = useMemo(() => {
    const data = [];
    const baseCount = allUsers.length * 0.3;
    for (let hour = 0; hour < 24; hour++) {
      // Simulate realistic user distribution across UTC hours
      const variance = Math.sin(hour / 24 * Math.PI * 2) * baseCount * 0.5;
      const userCount = Math.max(1, Math.floor(baseCount + variance));
      
      const timeStr = hour.toString().padStart(2, '0') + ':00 UTC';
      data.push({
        time: timeStr,
        users: userCount
      });
    }
    return data;
  }, [allUsers.length]);

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

  // Redscar Recruitment Numbers (last 7 days)
  const recruitmentData = useMemo(() => {
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Count users who joined on this day
      const dayRegistrations = allUsers.filter(user => {
        const userDate = new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return userDate === dateStr;
      }).length;
      
      data.push({
        date: dateStr,
        recruits: dayRegistrations
      });
    }
    return data;
  }, [allUsers]);

  // Redscar Flotilla Growth (ships added over last 7 days)
  const flotillaGrowthData = useMemo(() => {
    const days = 7;
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Count ships added on this day
      const dayShips = fleetAssets.filter(asset => {
        const assetDate = new Date(asset.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return assetDate === dateStr;
      }).length;
      
      data.push({
        date: dateStr,
        ships: dayShips
      });
    }
    return data;
  }, [fleetAssets]);

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
      <div className="grid grid-cols-4 gap-2">
        {/* Activity Over Time */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-zinc-800 bg-zinc-900/30 p-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Badge className="text-[6px] bg-cyan-900/30 text-cyan-400 border-cyan-900/50">USERS</Badge>
            <span className="text-[8px] font-bold text-zinc-300">Active by UTC Hour</span>
          </div>
          <button
            onClick={() => handleExportChart('active-users-utc')}
            className="text-[7px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
          >
            <Download className="w-2.5 h-2.5" />
          </button>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={activeUsersByUTC}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis 
              dataKey="time" 
              stroke="#71717a" 
              style={{ fontSize: '10px' }}
              tick={{ interval: 3 }}
            />
            <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
              labelStyle={{ color: '#e4e4e7' }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
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

        {/* Redscar Recruitment Numbers */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-zinc-800 bg-zinc-900/30 p-2"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge className="text-[6px] bg-emerald-900/30 text-emerald-400 border-emerald-900/50">RECRUIT</Badge>
              <span className="text-[8px] font-bold text-zinc-300">New Members (7d)</span>
            </div>
            <button
              onClick={() => handleExportChart('recruitment')}
              className="text-[7px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={recruitmentData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
                labelStyle={{ color: '#e4e4e7' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar
                dataKey="recruits"
                fill="#22c55e"
                name="New Recruits"
                radius={0}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Redscar Flotilla Growth */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border border-zinc-800 bg-zinc-900/30 p-2"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Badge className="text-[6px] bg-orange-900/30 text-orange-400 border-orange-900/50">FLOTILLA</Badge>
              <span className="text-[8px] font-bold text-zinc-300">Ships Added (7d)</span>
            </div>
            <button
              onClick={() => handleExportChart('flotilla')}
              className="text-[7px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-0.5"
            >
              <Download className="w-2.5 h-2.5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={flotillaGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
              <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
                labelStyle={{ color: '#e4e4e7' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area
                type="monotone"
                dataKey="ships"
                stroke="#ea580c"
                fill="#ea580c"
                fillOpacity={0.7}
                name="Ships/Vehicles"
              />
            </AreaChart>
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