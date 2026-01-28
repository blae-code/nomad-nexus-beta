import { useMemo, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Activity, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { ActiveUsersTooltip, AUECTooltip, UsersTooltip, FleetTooltip } from '@/components/dashboard/MetricsTooltip';

export default function MetricsChartPanel({ userEvents, allUsers, recentLogs, treasuryBalance = 0, fleetAssets = [] }) {
  const [fundView, setFundView] = useState(0);
  const [activeChart, setActiveChart] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [now, setNow] = useState(new Date());
  const [userActivityView, setUserActivityView] = useState(0); // 0: line, 1: peak distribution
  const [recruitmentView, setRecruitmentView] = useState(0); // 0: daily, 1: cumulative
  const [flotillaView, setFlotillaView] = useState(0); // 0: trend, 1: status breakdown
  const [showPersonalFunds, setShowPersonalFunds] = useState(false); // Toggle between org and personal funds
  
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

  // Toggle between org and personal funds every 8 seconds
  useEffect(() => {
    const fundToggleInterval = setInterval(() => {
      setShowPersonalFunds(prev => !prev);
    }, 8000);

    return () => clearInterval(fundToggleInterval);
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

  // Org fund allocation (as continuous line data over days)
  const fundAllocationData = useMemo(() => {
    const days = 7;
    const data = [];
    const baseInflow = Math.round(treasuryBalance * 0.15);
    const baseOutflow = Math.round(treasuryBalance * 0.08);
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Simulate trending inflow/outflow
      const variance = Math.sin((i / days) * Math.PI * 2) * baseInflow * 0.3;
      data.push({
        date: dateStr,
        inflow: Math.max(0, baseInflow + variance),
        outflow: baseOutflow + (Math.random() - 0.5) * baseOutflow * 0.2
      });
    }
    return data;
  }, [treasuryBalance]);

  // Personal fund allocation (user's personal earnings)
  const personalFundAllocationData = useMemo(() => {
    const days = 7;
    const data = [];
    const basePersonalIncome = Math.round(treasuryBalance * 0.02); // ~2% of org balance
    const basePersonalSpend = Math.round(treasuryBalance * 0.01); // ~1% of org balance
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Personal funds trend (less stable than org)
      const variance = Math.sin((i / days) * Math.PI * 2) * basePersonalIncome * 0.4;
      data.push({
        date: dateStr,
        inflow: Math.max(0, basePersonalIncome + variance),
        outflow: basePersonalSpend + (Math.random() - 0.5) * basePersonalSpend * 0.3
      });
    }
    return data;
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
    let cumulative = 0;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Count users who joined on this day
      const dayRegistrations = allUsers.filter(user => {
        const userDate = new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return userDate === dateStr;
      }).length;
      
      cumulative += dayRegistrations;
      data.push({
        date: dateStr,
        recruits: dayRegistrations,
        cumulative
      });
    }
    return data;
  }, [allUsers]);

  // Peak hours distribution (as continuous line data)
  const peakHoursData = useMemo(() => {
    const hours = {};
    for (let hour = 0; hour < 24; hour++) {
      hours[hour] = Math.floor(Math.random() * 20 + 10);
    }
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i.toString().padStart(2, '0') + ':00',
      value: hours[i]
    }));
  }, []);

  // Fleet status trend (as continuous line data over days)
  const fleetStatusData = useMemo(() => {
    const days = 7;
    const data = [];
    const baseFleet = fleetAssets.length || 10;
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      // Simulate fleet growth over time
      const growth = Math.floor((i / days) * baseFleet * 0.2);
      data.push({
        date: dateStr,
        total: baseFleet + growth
      });
    }
    return data;
  }, [fleetAssets]);

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
        {/* Activity Over Time */}
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
          <AnimatePresence mode="wait">
            {userActivityView === 0 ? (
              <motion.div key="activity-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <ResponsiveContainer width="100%" height={120}>
                   <LineChart data={activeUsersByUTC}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                     <XAxis dataKey="time" stroke="#71717a" style={{ fontSize: '10px' }} tick={{ interval: 3 }} />
                     <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
                     <Tooltip content={<ActiveUsersTooltip />} contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                     <Legend wrapperStyle={{ fontSize: '11px' }} />
                     <Line type="monotone" dataKey="users" stroke="#06b6d4" strokeWidth={2} dot={false} name="Active Users" />
                   </LineChart>
                 </ResponsiveContainer>
              </motion.div>
            ) : (
               <motion.div key="activity-peak" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                 <ResponsiveContainer width="100%" height={120}>
                   <LineChart data={peakHoursData}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                     <XAxis dataKey="hour" stroke="#71717a" style={{ fontSize: '10px' }} tick={{ interval: 3 }} />
                     <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
                     <Tooltip content={<ActiveUsersTooltip />} contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                     <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={false} name="Peak Avg" isAnimationActive={true} animationDuration={600} />
                   </LineChart>
                 </ResponsiveContainer>
               </motion.div>
             )}
          </AnimatePresence>
        </div>
        </motion.div>

        {/* Org Fund Allocation */}
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
                <span className="text-[8px] font-bold text-zinc-300 font-mono">
                  {fundView === 0 ? (showPersonalFunds ? 'Personal Flow' : 'Org Cash Flow') : 'Top Contributors'}
                </span>
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
            <AnimatePresence mode="wait">
              {fundView === 0 ? (
                <motion.div key={showPersonalFunds ? 'personal' : 'org'} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.3 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={showPersonalFunds ? personalFundAllocationData : fundAllocationData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
                      <Tooltip
                        content={<AUECTooltip view={fundView} />}
                        contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="inflow" stroke={showPersonalFunds ? '#a78bfa' : '#a855f7'} strokeWidth={2} dot={false} name="Inflow" isAnimationActive={true} animationDuration={600} />
                      <Line type="monotone" dataKey="outflow" stroke={showPersonalFunds ? '#f472b6' : '#ec4899'} strokeWidth={2} dot={false} name="Outflow" isAnimationActive={true} animationDuration={600} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              ) : (
                <motion.div key="contributors" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.3 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={treasuryCashFlowData.map((d, i) => ({ ...d, x: i, date: d.label }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="label" stroke="#71717a" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
                      <Tooltip
                        content={<AUECTooltip view={fundView} />}
                        contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }}
                      />
                      <Line type="linear" dataKey="amount" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 3 }} name="aUEC" isAnimationActive={true} animationDuration={600} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* New NomadNexus Users */}
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
            <AnimatePresence mode="wait">
              {recruitmentView === 0 ? (
                <motion.div key="recruit-daily" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={recruitmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip content={<UsersTooltip view={recruitmentView} />} contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="recruits" stroke="#22c55e" strokeWidth={2} dot={false} name="Daily New" isAnimationActive={true} animationDuration={600} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              ) : (
                <motion.div key="recruit-cumulative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={recruitmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip content={<UsersTooltip view={recruitmentView} />} contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="cumulative" stroke="#22c55e" strokeWidth={2} dot={false} name="Total Recruits" isAnimationActive={true} animationDuration={600} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Redscar Flotilla Growth */}
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
            <AnimatePresence mode="wait">
              {flotillaView === 0 ? (
                <motion.div key="flotilla-trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={flotillaGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip content={<FleetTooltip view={flotillaView} />} contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="ships" stroke="#ea580c" strokeWidth={2} dot={false} name="Total Assets" isAnimationActive={true} animationDuration={600} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              ) : (
                <motion.div key="flotilla-status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={fleetStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" stroke="#71717a" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#71717a" style={{ fontSize: '11px' }} allowDecimals={false} />
                      <Tooltip content={<FleetTooltip view={flotillaView} />} contentStyle={{ backgroundColor: 'transparent', border: 'none', padding: 0 }} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Line type="monotone" dataKey="total" stroke="#ea580c" strokeWidth={2} dot={false} name="Fleet Total" isAnimationActive={true} animationDuration={600} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </motion.div>
        )}
        </AnimatePresence>
      </div>
        );
        }