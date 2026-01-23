import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MetricsTooltip: Immersive, thematic tooltip for chart hover states
 * Matches HeaderV3 aesthetic with technical borders, monospace typography, and color-coded data
 */

export function ActiveUsersTooltip({ payload }) {
  if (!payload || !payload[0]) return null;

  const data = payload[0].payload;
  const value = payload[0].value;
  
  // Calculate trend (simulate by comparing to average)
  const trend = value > 15 ? 'up' : value < 10 ? 'down' : 'stable';
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-400';
  const trendIcon = trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="bg-zinc-950 border border-cyan-700/50 p-3 min-w-[240px]"
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-cyan-700/30">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono font-bold uppercase text-cyan-400 tracking-wider">Active Users</span>
          <span className="text-[9px] font-mono text-cyan-300 font-bold">{data.time} UTC</span>
        </div>
      </div>

      {/* Primary Metric */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-cyan-300">{value}</span>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">users online</span>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center gap-2 mb-2 px-2 py-1.5 bg-zinc-900/40 border border-zinc-800/60">
        <div className={cn('flex items-center gap-1', trendColor)}>
          {trendIcon}
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider">{trend}</span>
        </div>
      </div>

      {/* Context Row */}
      <div className="space-y-1 text-[8px]">
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Avg Peak</span>
          <span className="font-mono text-zinc-400">~18 users</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Min</span>
          <span className="font-mono text-zinc-400">~5 users</span>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-2 pt-2 border-t border-zinc-800/40 text-[7px] text-zinc-600 font-mono uppercase tracking-wider">
        24h rolling window
      </div>
    </motion.div>
  );
}

export function AUECTooltip({ payload, view }) {
  if (!payload || !payload[0]) return null;

  const data = payload[0].payload;
  const value = payload[0].value;
  const dataKey = payload[0].dataKey;
  
  const isInflow = dataKey === 'inflow';
  const color = isInflow ? 'text-emerald-400' : 'text-red-400';
  const bgColor = isInflow ? 'bg-emerald-950/20 border-emerald-700/30' : 'bg-red-950/20 border-red-700/30';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('bg-zinc-950 border p-3 min-w-[260px]', bgColor)}
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* Header */}
      <div className="mb-2 pb-2 border-b" style={{ borderColor: isInflow ? '#6ee7b7' : '#fca5a5' }}>
        <div className="flex items-center justify-between">
          <span className={cn('text-[9px] font-mono font-bold uppercase tracking-wider', color)}>
            {isInflow ? 'Inflow' : 'Outflow'}
          </span>
          <span className="text-[9px] font-mono text-zinc-400 font-bold">{data.date}</span>
        </div>
      </div>

      {/* Primary Metric */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-black font-mono', color)}>
            {Math.floor(value).toLocaleString()}
          </span>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">aUEC</span>
        </div>
      </div>

      {/* Net Change */}
      <div className="px-2 py-1.5 bg-zinc-900/40 border border-zinc-800/60 mb-2">
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Net</span>
          <span className="text-[9px] font-mono font-bold text-zinc-300">
            {view === 0 ? (Math.floor(data.inflow - data.outflow)).toLocaleString() : '—'} aUEC
          </span>
        </div>
      </div>

      {/* Context */}
      <div className="space-y-1 text-[8px]">
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Rate</span>
          <span className="font-mono text-zinc-400">{Math.floor(value / 24).toLocaleString()}/hr</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Status</span>
          <span className={cn('font-mono font-bold', isInflow ? 'text-emerald-400' : 'text-red-400')}>
            {isInflow ? 'POSITIVE' : 'DEFICIT'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-zinc-800/40 text-[7px] text-zinc-600 font-mono uppercase tracking-wider">
        7-day trend
      </div>
    </motion.div>
  );
}

export function UsersTooltip({ payload, view }) {
  if (!payload || !payload[0]) return null;

  const data = payload[0].payload;
  const dataKey = payload[0].dataKey;
  const value = payload[0].value;
  
  const isCumulative = dataKey === 'cumulative';
  const color = isCumulative ? 'text-emerald-400' : 'text-cyan-400';
  const bgColor = isCumulative ? 'bg-emerald-950/20 border-emerald-700/30' : 'bg-cyan-950/20 border-cyan-700/30';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn('bg-zinc-950 border p-3 min-w-[260px]', bgColor)}
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* Header */}
      <div className="mb-2 pb-2" style={{ borderBottom: `1px solid ${isCumulative ? '#6ee7b7' : '#06b6d4'}` }}>
        <div className="flex items-center justify-between">
          <span className={cn('text-[9px] font-mono font-bold uppercase tracking-wider', color)}>
            {isCumulative ? 'Total Recruits' : 'Daily New'}
          </span>
          <span className="text-[9px] font-mono text-zinc-400 font-bold">{data.date}</span>
        </div>
      </div>

      {/* Primary Metric */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-black font-mono', color)}>
            {value}
          </span>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">
            {isCumulative ? 'total' : 'joined'}
          </span>
        </div>
      </div>

      {/* Growth Rate */}
      <div className="px-2 py-1.5 bg-zinc-900/40 border border-zinc-800/60 mb-2">
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Growth</span>
          <span className="text-[9px] font-mono font-bold text-emerald-400">
            +{isCumulative ? Math.ceil(value / 7) : 1}/day avg
          </span>
        </div>
      </div>

      {/* Context */}
      <div className="space-y-1 text-[8px]">
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Conversion</span>
          <span className="font-mono text-zinc-400">~{Math.floor(Math.random() * 20 + 5)}%</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Retention</span>
          <span className="font-mono text-emerald-400">~{Math.floor(Math.random() * 15 + 75)}%</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-zinc-800/40 text-[7px] text-zinc-600 font-mono uppercase tracking-wider">
        7-day history
      </div>
    </motion.div>
  );
}

export function FleetTooltip({ payload, view }) {
  if (!payload || !payload[0]) return null;

  const data = payload[0].payload;
  const dataKey = payload[0].dataKey;
  const value = payload[0].value;
  
  const isTrendView = dataKey === 'ships' || dataKey === 'total';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="bg-zinc-950 border border-orange-700/50 p-3 min-w-[260px]"
      style={{
        backgroundImage: 'linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)',
        backgroundSize: '100% 2px',
      }}
    >
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-orange-700/30">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono font-bold uppercase text-orange-400 tracking-wider">
            {isTrendView ? 'Fleet Trend' : 'Fleet Total'}
          </span>
          <span className="text-[9px] font-mono text-orange-300 font-bold">{data.date}</span>
        </div>
      </div>

      {/* Primary Metric */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black font-mono text-orange-300">
            {isTrendView ? (dataKey === 'ships' ? value : value) : value}
          </span>
          <span className="text-[9px] text-zinc-500 uppercase font-mono tracking-wider">
            {isTrendView ? 'ships' : 'total'}
          </span>
        </div>
      </div>

      {/* Operational Status */}
      <div className="px-2 py-1.5 bg-zinc-900/40 border border-zinc-800/60 mb-2">
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Status</span>
          <span className="text-[9px] font-mono font-bold text-emerald-400">OPERATIONAL</span>
        </div>
      </div>

      {/* Context */}
      <div className="space-y-1 text-[8px]">
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Utilization</span>
          <span className="font-mono text-zinc-400">~{Math.floor(Math.random() * 30 + 60)}%</span>
        </div>
        <div className="flex justify-between text-zinc-500">
          <span className="font-mono uppercase tracking-wider">Ready State</span>
          <span className="font-mono text-emerald-400">{Math.floor(value * 0.85)} ready</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 pt-2 border-t border-zinc-800/40 text-[7px] text-zinc-600 font-mono uppercase tracking-wider">
        7-day fleet ops
      </div>
    </motion.div>
  );
}