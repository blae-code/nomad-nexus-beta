import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Users, Zap, Clock, Award, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HubAnalyticsPanel({ userEvents, allUsers, recentLogs, voiceNets, user }) {
  // Calculate comprehensive metrics
  const analytics = useMemo(() => {
    const completedEvents = userEvents.filter(e => e.status === 'completed').length;
    const activeEvents = userEvents.filter(e => e.status === 'active').length;
    const totalEvents = userEvents.length;
    const successRate = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;
    
    // Activity distribution by event type
    const eventTypeDistribution = userEvents.reduce((acc, e) => {
      const type = e.event_type || 'other';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    // Status distribution
    const statusDistribution = userEvents.reduce((acc, e) => {
      const status = e.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Log activity timeline (last 7 days)
    const logsByDay = {};
    recentLogs.forEach(log => {
      const date = new Date(log.created_date).toLocaleDateString();
      logsByDay[date] = (logsByDay[date] || 0) + 1;
    });

    // Incident trend
    const incidentTypes = recentLogs
      .filter(l => l.type === 'RESCUE' || l.severity === 'HIGH')
      .reduce((acc, log) => {
        acc[log.type] = (acc[log.type] || 0) + 1;
        return acc;
      }, {});

    // Average mission duration
    const eventDurations = userEvents
      .filter(e => e.start_time && e.end_time)
      .map(e => {
        const start = new Date(e.start_time);
        const end = new Date(e.end_time);
        return Math.round((end - start) / (1000 * 60)); // minutes
      });
    const avgDuration = eventDurations.length > 0 
      ? Math.round(eventDurations.reduce((a, b) => a + b, 0) / eventDurations.length)
      : 0;

    // Personnel utilization
    const totalParticipants = userEvents.reduce((acc, e) => acc + (e.assigned_user_ids?.length || 0), 0);
    const avgParticipants = totalEvents > 0 ? Math.round(totalParticipants / totalEvents) : 0;

    return {
      successRate,
      completedEvents,
      activeEvents,
      totalEvents,
      eventTypeDistribution,
      statusDistribution,
      logsByDay,
      incidentTypes,
      avgDuration,
      avgParticipants,
      onlineRate: allUsers.length > 0 ? Math.round((voiceNets.length / allUsers.length) * 100) : 0
    };
  }, [userEvents, allUsers, recentLogs, voiceNets]);

  // Prepare chart data
  const eventTypeData = Object.entries(analytics.eventTypeDistribution).map(([type, count]) => ({
    name: type.toUpperCase(),
    value: count
  }));

  const statusData = Object.entries(analytics.statusDistribution).map(([status, count]) => ({
    name: status.toUpperCase(),
    value: count
  }));

  const COLORS = ['#ea580c', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b'];

  return (
    <div className="space-y-2 h-full overflow-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <AnalyticsCard
          label="Success Rate"
          value={`${analytics.successRate}%`}
          icon={Target}
          trend={analytics.successRate > 75 ? 'up' : 'down'}
          color="emerald"
        />
        <AnalyticsCard
          label="Avg Team Size"
          value={analytics.avgParticipants}
          icon={Users}
          subtext={`${analytics.totalEvents} ops`}
          color="blue"
        />
        <AnalyticsCard
          label="Avg Duration"
          value={`${analytics.avgDuration}m`}
          icon={Clock}
          subtext="per mission"
          color="cyan"
        />
        <AnalyticsCard
          label="Active Ops"
          value={analytics.activeEvents}
          icon={Zap}
          subtext={`${analytics.completedEvents} completed`}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {/* Operation Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800 bg-zinc-950/50 p-2"
        >
          <h3 className="text-[7px] font-bold uppercase text-zinc-400 mb-2">Op Status</h3>
          <ResponsiveContainer width="100%" height={100}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={40}
                paddingAngle={2}
                dataKey="value"
              >
                {statusData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="text-[7px] text-zinc-400 mt-1 space-y-0.5">
            {statusData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{d.name}</span>
                <span className="text-[6px] px-1 border border-zinc-700 rounded bg-zinc-900/50">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Event Type Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="border border-zinc-800 bg-zinc-950/50 p-2"
        >
          <h3 className="text-[7px] font-bold uppercase text-zinc-400 mb-2">Op Types</h3>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={eventTypeData} margin={{ top: 2, right: 2, left: -20, bottom: 2 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <Bar dataKey="value" fill="#ea580c" radius={2} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-[7px] text-zinc-400 mt-1 space-y-0.5">
            {eventTypeData.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{d.name}</span>
                <span className="text-[6px] px-1 border border-zinc-700 rounded bg-zinc-900/50">{d.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Incident Trend */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-zinc-800 bg-zinc-950/50 p-2"
        >
          <h3 className="text-[7px] font-bold uppercase text-zinc-400 mb-2">Incidents</h3>
          <div className="space-y-1">
            {Object.entries(analytics.incidentTypes).length > 0 ? (
              Object.entries(analytics.incidentTypes).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-[7px]">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
                    <span className="text-zinc-300">{type}</span>
                  </div>
                  <span className="text-[6px] px-1 bg-red-950/30 text-red-300 border border-red-900 rounded">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-[7px] text-zinc-500 italic">No incidents</div>
            )}
          </div>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="border border-zinc-800 bg-zinc-950/50 p-2"
        >
          <h3 className="text-[7px] font-bold uppercase text-zinc-400 mb-2">Performance</h3>
          <div className="space-y-1.5">
            <MetricBar label="Success Rate" value={analytics.successRate} max={100} color="emerald" />
            <MetricBar label="Completion" value={analytics.completedEvents} max={analytics.totalEvents} color="blue" />
            <MetricBar label="Team Util" value={analytics.avgParticipants} max={10} color="purple" />
          </div>
        </motion.div>
      </div>

      {/* Extended Stats */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border border-zinc-800 bg-zinc-950/50 p-2 grid grid-cols-3 gap-2"
      >
        <StatTile label="Total Ops" value={analytics.totalEvents} icon={Award} />
        <StatTile label="Active Ops" value={analytics.activeEvents} icon={Zap} highlight />
        <StatTile label="Avg Duration" value={`${analytics.avgDuration}m`} icon={Clock} />
      </motion.div>
    </div>
  );
}

function AnalyticsCard({ label, value, icon: Icon, trend, color = 'zinc', subtext }) {
  const colorMap = {
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn('border rounded p-2 space-y-1', colorMap[color])}
    >
      <div className="flex items-start justify-between">
        <Icon className="w-3 h-3" />
        {trend && (
          trend === 'up' 
            ? <TrendingUp className="w-3 h-3 text-emerald-400" />
            : <TrendingDown className="w-3 h-3 text-red-400" />
        )}
      </div>
      <div className="text-[7px] text-zinc-400 uppercase font-mono">{label}</div>
      <div className="text-sm font-bold">{value}</div>
      {subtext && <div className="text-[6px] text-zinc-500">{subtext}</div>}
    </motion.div>
  );
}

function MetricBar({ label, value, max, color = 'blue' }) {
  const percentage = Math.min((value / max) * 100, 100);
  const colorMap = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-0.5 text-[7px]">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-mono">{value}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={cn('h-full rounded', colorMap[color])}
        />
      </div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, highlight }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className={cn(
        'border rounded p-1.5 text-center',
        highlight 
          ? 'border-[#ea580c]/50 bg-[#ea580c]/10'
          : 'border-zinc-800 bg-zinc-900/30'
      )}
    >
      <Icon className={cn('w-3 h-3 mx-auto mb-0.5', highlight ? 'text-[#ea580c]' : 'text-zinc-400')} />
      <div className="text-[7px] text-zinc-500 uppercase font-mono">{label}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </motion.div>
  );
}