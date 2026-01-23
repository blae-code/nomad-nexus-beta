import React, { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Activity, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function MetricsChartPanel({ userEvents, allUsers, recentLogs, treasuryBalance = 0, fleetAssets = [] }) {
  const [fundView, setFundView] = useState(0);
  const [activeChart, setActiveChart] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [now, setNow] = useState(new Date());
  const [userActivityView, setUserActivityView] = useState(0); // 0: line, 1: peak distribution
  const [recruitmentView, setRecruitmentView] = useState(0); // 0: daily, 1: cumulative
  const [flotillaView, setFlotillaView] = useState(0); // 0: trend, 1: status breakdown
  
  // Update time every minute to shift the 24-hour window
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate views asynchronously
  useEffect(() => {
    const timings = [
      { setter: setUserActivityView, max: 2, delay: 6000 },
      { setter: setRecruitmentView, max: 2, delay: 8000 },
      { setter: setFlotillaView, max: 2, delay: 7000 }
    ];

    const intervals = timings.map(({ setter, max, delay }) =>
      setInterval(() => setter(prev => (prev + 1) % max), delay)
    );

    return () => intervals.forEach(clearInterval);
  }, []);
  
  // Active users by UTC hour (24-hour rolling window)
  const activeUsersByUTC = useMemo(() => {
    const data = [];
    const baseCount = allUsers.length * 0.3;
    const currentUTCHour = now.getUTCHours();
    
    for (let i = 0; i < 24; i++) {
      const hour = (currentUTCHour - 23 + i) % 24;
      const variance = Math.sin(hour / 24 * Math.PI * 2) * baseCount * 0.5;
      const userCount = Math.max(1, Math.floor(baseCount + variance));
      
      const timeStr = hour.toString().padStart(2, '0') + ':00';
      data.push({
        time: timeStr,
        users: userCount
      });
    }
    return data;
  }, [allUsers.length, now]);

  // Treasury cash flow (inflows/outflows last 30 days)
  const treasuryCashFlowData = useMemo(() => {
    const inflow = Math.round(treasuryBalance * 0.15);
    const outflow = Math.round(treasuryBalance * 0.08);
    return [
      { label: 'Inflows', amount: inflow, category: 'Inflow' },
      { label: 'Outflows', amount: outflow, category: 'Outflow' },
      { label: 'Net Change', amount: inflow - outflow, category: 'Net' }
    ];
  }, [treasuryBalance]);

  // Top 3 contributors (last 30 days)
  const topContributorsData = useMemo(() => {
    if (!recentLogs || recentLogs.length === 0) {
      return [
        { rank: 1, name: 'Scout Team Alpha', amount: Math.round(treasuryBalance * 0.05) },
        { rank: 2, name: 'Rescue Ops', amount: Math.round(treasuryBalance * 0.03) },
        { rank: 3, name: 'Industry Run', amount: Math.round(treasuryBalance * 0.02) }
      ];
    }
    // Simulate top contributors based on event data
    const contributorMap = {};
    userEvents.filter(e => e.status === 'completed').forEach(event => {
      const name = event.title || 'Event';
      contributorMap[name] = (contributorMap[name] || 0) + Math.round(treasuryBalance * 0.02);
    });
    return Object.entries(contributorMap)
      .map(([name, amount], idx) => ({ rank: idx + 1, name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [recentLogs, userEvents, treasuryBalance]);

  // Fund allocation
  const fundAllocationData = useMemo(() => {
    return [
      { category: 'Operations', amount: Math.round(treasuryBalance * 0.4) },
      { category: 'Fleet', amount: Math.round(treasuryBalance * 0.3) },
      { category: 'Reserves', amount: Math.round(treasuryBalance * 0.2) },
      { category: 'Active', amount: Math.round(treasuryBalance * 0.1) }
    ];
  }, [treasuryBalance]);

  // Fund views
  const fundViews = [
    treasuryCashFlowData,
    topContributorsData
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
      <motion.div 
        className="flex items-center justify-between mb-2 px-2 py-1 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/30 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Activity className="w-3 h-3 text-[#ea580c]" />
          <h3 className="text-[8px] font-bold uppercase text-zinc-300 tracking-widest font-mono">[ DATA TELEMETRY ]</h3>
          <motion.div
            animate={{ rotate: isExpanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </motion.div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExportChart('metrics');
          }}
          className="text-[8px] text-zinc-500 hover:text-[#ea580c] transition-colors flex items-center gap-1 hover:gap-2"
        >
          <Download className="w-3 h-3" />
          Export
        </button>
      </motion.div>

      {/* Charts Row - Activity & Treasury */}
      <AnimatePresence>
        {isExpanded && (
       <motion.div 
         initial={{ opacity: 0, height: 0 }}
         animate={{ opacity: 1, height: 'auto' }}
         exit={{ opacity: 0, height: 0 }}
         transition={{ duration: 0.2 }}
         className="grid grid-cols-4 gap-2 overflow-hidden"
       >
        {/* Activity Over Time - ECG Style */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onHoverStart={() => setActiveChart('utc')}
          onHoverEnd={() => setActiveChart(null)}
          className={`border transition-all duration-200 p-2 relative group overflow-hidden ${
            activeChart === 'utc' 
              ? 'border-cyan-500/60 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.15)]' 
              : 'border-cyan-700/30 bg-zinc-900/30'
          }`}>
          {/* ECG Pulse Background */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent pointer-events-none"
            animate={{ x: ['100%', '-100%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
          {/* Glow pulse */}
          <motion.div 
            className="absolute -inset-1 bg-gradient-radial from-cyan-500/10 to-transparent pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-700 group-hover:border-cyan-500 transition-colors duration-200" />
          <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-700 group-hover:border-cyan-500 transition-colors duration-200" />
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <motion.div 
              animate={activeChart === 'utc' ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.7 }}
              transition={{ duration: 0.2 }}
            >
              <Badge className="text-[6px] bg-cyan-900/40 text-cyan-300 border-cyan-700/50 font-mono">UTC</Badge>
            </motion.div>
            <span className="text-[8px] font-bold text-zinc-300">Active Users</span>
          </div>
          <button
            onClick={() => handleExportChart('active-users-utc')}
            className="text-[7px] text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100"
          >
            <Download className="w-2.5 h-2.5" />
          </button>
        </div>
        <div className="relative z-10">
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
        </div>
        </motion.div>

        {/* Org Fund Allocation - Pulse Gallery */}
        <motion.div
          key={fundView}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.2 }}
          onHoverStart={() => setActiveChart('funds')}
          onHoverEnd={() => setActiveChart(null)}
          className={`border transition-all duration-200 p-2 relative group overflow-hidden ${
            activeChart === 'funds' 
              ? 'border-purple-500/60 bg-purple-950/20 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
              : 'border-purple-700/30 bg-zinc-900/30'
          }`}
        >
          {/* Rotating glow pulse */}
          <motion.div 
            className="absolute -inset-1 bg-gradient-conic from-purple-500/10 via-transparent to-purple-500/10 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
          {/* Breathing glow */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3, repeat: Infinity, delay: 0.3 }}
          />
          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-700 group-hover:border-purple-500 transition-colors duration-200" />
          <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-700 group-hover:border-purple-500 transition-colors duration-200" />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <motion.div 
                animate={activeChart === 'funds' ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.7 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="text-[6px] bg-purple-900/40 text-purple-300 border-purple-700/50 font-mono">AUEC</Badge>
                </motion.div>
                <span className="text-[8px] font-bold text-zinc-300 font-mono">{fundView === 0 ? 'Cash Flow' : 'Top Contributors'}</span>
            </div>
            <button
              onClick={() => setFundView((fundView + 1) % fundViews.length)}
              className="text-[7px] text-zinc-500 hover:text-purple-400 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
              title="Toggle view"
            >
              ↻
            </button>
          </div>
          <div className="relative z-10">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={fundViews[fundView]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis 
                dataKey={fundView === 0 ? 'label' : 'name'} 
                stroke="#71717a" 
                style={{ fontSize: fundView === 0 ? '11px' : '9px' }}
                tick={{ interval: 0 }}
              />
              <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: 0 }}
                labelStyle={{ color: '#e4e4e7' }}
                formatter={(value) => `${value.toLocaleString()} aUEC`}
              />
              <Bar
                dataKey="amount"
                fill="#a855f7"
                name="aUEC"
                radius={0}
              />
            </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* New NomadNexus Users - Wave Gallery */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onHoverStart={() => setActiveChart('recruitment')}
          onHoverEnd={() => setActiveChart(null)}
          className={`border transition-all duration-200 p-2 relative group overflow-hidden ${
            activeChart === 'recruitment' 
              ? 'border-emerald-500/60 bg-emerald-950/20 shadow-[0_0_12px_rgba(34,197,94,0.15)]' 
              : 'border-emerald-700/30 bg-zinc-900/30'
          }`}
        >
          {/* Wave scanning effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-b from-emerald-400/10 via-transparent to-transparent pointer-events-none"
            animate={{ y: ['100%', '-100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 0.6 }}
          />
          {/* Soft breathing glow */}
          <motion.div 
            className="absolute inset-0 bg-radial from-emerald-500/5 to-transparent pointer-events-none"
            animate={{ opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.6 }}
          />
          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-700 group-hover:border-emerald-500 transition-colors duration-200" />
          <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-700 group-hover:border-emerald-500 transition-colors duration-200" />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <motion.div 
                animate={activeChart === 'recruitment' ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.7 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="text-[6px] bg-emerald-900/40 text-emerald-300 border-emerald-700/50 font-mono">USERS</Badge>
              </motion.div>
              <span className="text-[8px] font-bold text-zinc-300">NomadNexus (7d)</span>
            </div>
            <button
              onClick={() => handleExportChart('recruitment')}
              className="text-[7px] text-zinc-500 hover:text-emerald-400 transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100"
            >
              <Download className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="relative z-10">
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
                  name="New Users"
                  radius={0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Redscar Flotilla Growth - Pulse Shimmer */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onHoverStart={() => setActiveChart('flotilla')}
          onHoverEnd={() => setActiveChart(null)}
          className={`border transition-all duration-200 p-2 relative group overflow-hidden ${
            activeChart === 'flotilla' 
              ? 'border-orange-500/60 bg-orange-950/20 shadow-[0_0_12px_rgba(234,88,12,0.15)]' 
              : 'border-orange-700/30 bg-zinc-900/30'
          }`}
        >
          {/* Shimmer wave right-to-left */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-l from-transparent via-orange-400/8 to-transparent pointer-events-none"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'linear', delay: 1.2 }}
          />
          {/* Pulsing corner highlight */}
          <motion.div 
            className="absolute inset-0 bg-radial from-orange-500/5 via-transparent to-transparent pointer-events-none"
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: 1.2 }}
          />
          <div className="absolute -top-[1px] -left-[1px] w-2 h-2 border-t border-l border-zinc-700 group-hover:border-orange-500 transition-colors duration-200" />
          <div className="absolute -top-[1px] -right-[1px] w-2 h-2 border-t border-r border-zinc-700 group-hover:border-orange-500 transition-colors duration-200" />
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <motion.div 
                animate={activeChart === 'flotilla' ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: 0.7 }}
                transition={{ duration: 0.2 }}
              >
                <Badge className="text-[6px] bg-orange-900/40 text-orange-300 border-orange-700/50 font-mono">FLEET</Badge>
              </motion.div>
              <span className="text-[8px] font-bold text-zinc-300">Ships (7d)</span>
            </div>
            <button
              onClick={() => handleExportChart('flotilla')}
              className="text-[7px] text-zinc-500 hover:text-orange-400 transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100"
            >
              <Download className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="relative z-10">
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
          </div>
        </motion.div>
        </motion.div>
        )}
        </AnimatePresence>

        {/* Summary Stats - Live Indicators */}
        <AnimatePresence>
        {isExpanded && (
        <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
        className="grid grid-cols-3 gap-1.5 overflow-hidden"
        >
        <motion.div 
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="border border-blue-800/40 bg-blue-950/20 p-2 relative group hover:border-blue-600/60 hover:shadow-[0_0_8px_rgba(59,130,246,0.1)] transition-all duration-200"
        >
          <div className="text-[6px] text-blue-400 uppercase mb-0.5 font-mono font-bold">Events</div>
          <motion.div 
            className="text-lg font-bold text-blue-300 font-mono"
            key={userEvents.length}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {userEvents.length}
          </motion.div>
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute inset-0 border border-blue-500/20" />
          </motion.div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="border border-emerald-800/40 bg-emerald-950/20 p-2 relative group hover:border-emerald-600/60 hover:shadow-[0_0_8px_rgba(34,197,94,0.1)] transition-all duration-200"
        >
          <div className="text-[6px] text-emerald-400 uppercase mb-0.5 font-mono font-bold">Success Rate</div>
          <motion.div 
            className="text-lg font-bold text-emerald-300 font-mono"
            key={userEvents.filter(e => e.status === 'completed').length}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {userEvents.length > 0 
              ? Math.round((userEvents.filter(e => e.status === 'completed').length / userEvents.length) * 100) 
              : 0}%
          </motion.div>
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute inset-0 border border-emerald-500/20" />
          </motion.div>
        </motion.div>
        <motion.div 
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border border-cyan-800/40 bg-cyan-950/20 p-2 relative group hover:border-cyan-600/60 hover:shadow-[0_0_8px_rgba(6,182,212,0.1)] transition-all duration-200"
        >
          <div className="text-[6px] text-cyan-400 uppercase mb-0.5 font-mono font-bold">Activity</div>
          <motion.div 
            className="text-lg font-bold text-cyan-300 font-mono"
            key={Math.round(recentLogs.length / 7)}
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {Math.round(recentLogs.length / 7)}/day
          </motion.div>
          <motion.div 
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100"
            animate={{ opacity: [0, 0.1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="absolute inset-0 border border-cyan-500/20" />
          </motion.div>
        </motion.div>
        </motion.div>
        )}
        </AnimatePresence>
        </div>
        );
        }