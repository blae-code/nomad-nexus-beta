import React, { memo } from 'react';
import { Users, Target, Swords, TrendingUp, AlertCircle, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

const HubMetricsPanel = memo(function HubMetricsPanel({ 
  allUsers, 
  onlineUsers, 
  orgMetrics, 
  activeIncidents, 
  canAccessTreasury, 
  treasuryBalance 
}) {
  return (
    <div>
      <div className="text-[7px] uppercase text-zinc-400 tracking-widest mb-2 font-bold">ORGANIZATION STATUS</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard
          icon={Users}
          label="Roster"
          value={allUsers.length}
          subtext="total members"
          color="zinc"
        />

        <MetricCard
          icon={Users}
          label="Online"
          value={onlineUsers.length}
          subtext={`${orgMetrics.activeMemberRate}% active`}
          color="emerald"
        />

        <MetricCard
          icon={Target}
          label="Operations"
          value={orgMetrics.activeOperations}
          subtext="active missions"
          color="blue"
        />

        <MetricCard
          icon={Swords}
          label="Squads"
          value={orgMetrics.totalSquads}
          subtext="operational units"
          color="purple"
        />

        <MetricCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${orgMetrics.missionSuccessRate}%`}
          subtext="mission efficiency"
          color="yellow"
        />

        {activeIncidents.length > 0 && (
          <MetricCard
            icon={AlertCircle}
            label="Alerts"
            value={activeIncidents.length}
            subtext={orgMetrics.alertStatus}
            color="red"
            animate
          />
        )}

        {canAccessTreasury && (
          <MetricCard
            icon={Coins}
            label="Treasury"
            value={`${(treasuryBalance / 1000000).toFixed(1)}M`}
            subtext="aUEC reserves"
            color="yellow"
          />
        )}
      </div>
    </div>
  );
});

const MetricCard = memo(function MetricCard({ icon: Icon, label, value, subtext, color, animate }) {
  const colorClasses = {
    zinc: 'text-zinc-300 hover:border-zinc-400/50',
    emerald: 'text-emerald-300 hover:border-emerald-400/50',
    blue: 'text-blue-300 hover:border-blue-400/50',
    purple: 'text-purple-300 hover:border-purple-400/50',
    yellow: 'text-yellow-300 hover:border-yellow-400/50',
    red: 'text-red-300 hover:border-red-400/50 bg-red-950/50 border-red-700',
  };

  const textColors = {
    zinc: 'text-zinc-400',
    emerald: 'text-emerald-300',
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    yellow: 'text-yellow-300',
    red: 'text-red-300',
  };

  return (
    <div className={cn(
      'bg-zinc-900/80 border border-zinc-700 p-3 transition-all cursor-pointer group',
      colorClasses[color]
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn(
          'w-3.5 h-3.5 group-hover:scale-110 transition-transform',
          textColors[color],
          animate && 'animate-pulse'
        )} />
        <span className="text-[8px] uppercase text-zinc-300 tracking-wider font-bold">{label}</span>
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      <div className={cn('text-[7px] font-medium', textColors[color])}>{subtext}</div>
    </div>
  );
});

export default HubMetricsPanel;