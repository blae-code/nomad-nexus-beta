import React, { memo, useState } from 'react';
import { Users, Target, Swords, TrendingUp, AlertCircle, Coins, ChevronRight, Clock, Activity, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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
      <div className="text-[7px] uppercase text-zinc-400 tracking-widest mb-3 font-bold">ORGANIZATION STATUS</div>
      <div className="grid grid-cols-8 gap-2">
        <MetricCard
          icon={Users}
          label="Roster"
          value={allUsers.length}
          subtext="total members"
          color="zinc"
          details={{
            stats: [
              { label: 'Total Members', value: allUsers.length },
              { label: 'Active Users', value: allUsers.filter(u => u.role !== 'inactive').length },
              { label: 'Admins', value: allUsers.filter(u => u.role === 'admin').length },
            ],
            action: 'View Full Roster',
            route: 'UserManager'
          }}
        />

        <MetricCard
          icon={Users}
          label="Online"
          value={onlineUsers.length}
          subtext={`${orgMetrics.activeMemberRate}% active`}
          color="emerald"
          details={{
            stats: [
              { label: 'Online Now', value: onlineUsers.length },
              { label: 'Activity Rate', value: `${orgMetrics.activeMemberRate}%` },
              { label: 'In Voice', value: onlineUsers.filter(u => u.status === 'in-call').length },
            ],
            action: 'View Presence',
            route: 'Hub'
          }}
        />

        <MetricCard
          icon={Target}
          label="Operations"
          value={orgMetrics.activeOperations}
          subtext="active ops"
          color="blue"
          details={{
            stats: [
              { label: 'Active Now', value: orgMetrics.activeOperations },
              { label: 'Scheduled', value: orgMetrics.scheduledOperations || 0 },
              { label: 'Pending', value: orgMetrics.pendingOperations || 0 },
            ],
            action: 'Operations Board',
            route: 'Events'
          }}
        />

        <MetricCard
          icon={Swords}
          label="Squads"
          value={orgMetrics.totalSquads}
          subtext="operational units"
          color="purple"
          details={{
            stats: [
              { label: 'Total Units', value: orgMetrics.totalSquads },
              { label: 'Active Squads', value: orgMetrics.activeSquads || orgMetrics.totalSquads },
              { label: 'Total Members', value: allUsers.length },
            ],
            action: 'Manage Squads',
            route: 'AdminConsole'
          }}
        />

        <MetricCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${orgMetrics.missionSuccessRate}%`}
          subtext="ops efficiency"
          color="yellow"
          details={{
            stats: [
              { label: 'Success Rate', value: `${orgMetrics.missionSuccessRate}%` },
              { label: 'Completed', value: orgMetrics.completedMissions || 0 },
              { label: 'Failed', value: orgMetrics.failedMissions || 0 },
            ],
            action: 'View History',
            route: 'Events'
          }}
        />

        {activeIncidents.length > 0 && (
          <MetricCard
            icon={AlertCircle}
            label="Alerts"
            value={activeIncidents.length}
            subtext={orgMetrics.alertStatus}
            color="red"
            animate
            details={{
              stats: [
                { label: 'Active Alerts', value: activeIncidents.length },
                { label: 'Critical', value: activeIncidents.filter(i => i.severity === 'CRITICAL').length },
                { label: 'Response Time', value: '2.4m avg' },
              ],
              action: 'Incident Center',
              route: 'Hub'
            }}
          />
        )}

        {canAccessTreasury && (
          <MetricCard
            icon={Coins}
            label="Treasury"
            value={`${(treasuryBalance / 1000000).toFixed(1)}M`}
            subtext="aUEC reserves"
            color="yellow"
            details={{
              stats: [
                { label: 'Total Balance', value: `${(treasuryBalance / 1000000).toFixed(2)}M aUEC` },
                { label: 'Last Transaction', value: 'Recent' },
                { label: 'Status', value: 'Healthy' },
              ],
              action: 'View Treasury',
              route: 'Treasury'
            }}
          />
        )}
      </div>
    </div>
  );
});

const MetricCard = memo(function MetricCard({ icon: Icon, label, value, subtext, color, animate, details }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
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
  
  const bgColors = {
    zinc: 'bg-zinc-900',
    emerald: 'bg-emerald-950/80',
    blue: 'bg-blue-950/80',
    purple: 'bg-purple-950/80',
    yellow: 'bg-yellow-950/80',
    red: 'bg-red-950/80',
  };
  
  const borderColors = {
    zinc: 'border-zinc-700',
    emerald: 'border-emerald-800',
    blue: 'border-blue-800',
    purple: 'border-purple-800',
    yellow: 'border-yellow-800',
    red: 'border-red-800',
  };

  const handleNavigate = () => {
    if (details?.route) {
      navigate(createPageUrl(details.route));
    }
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        'bg-zinc-900 border border-zinc-700 p-2 transition-all cursor-pointer group flex flex-col',
        colorClasses[color],
        'hover:border-[#ea580c]/50 hover:bg-zinc-800/50'
      )}>
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={cn(
            'w-3 h-3 group-hover:scale-110 transition-transform shrink-0',
            textColors[color],
            animate && 'animate-pulse'
          )} />
          <span className="text-[7px] uppercase text-zinc-400 tracking-wider font-bold truncate">{label}</span>
        </div>
        <div className="text-base font-black text-white mb-0.5 leading-tight">{value}</div>
        <div className={cn('text-[6px] font-medium truncate', textColors[color])}>{subtext}</div>
      </div>
      
      <AnimatePresence>
        {isHovered && details && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute top-full left-0 right-0 z-50 border p-3 mt-1',
              bgColors[color],
              borderColors[color],
              'shadow-xl backdrop-blur-sm'
            )}
            style={{
              minWidth: '220px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={cn('w-3.5 h-3.5 shrink-0', textColors[color])} />
              <span className="text-[9px] uppercase text-zinc-100 tracking-wider font-bold">{label}</span>
            </div>
            
            <div className="space-y-1.5 mb-2">
              {details.stats.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-[8px] text-zinc-400">{stat.label}</span>
                  <span className={cn('text-[9px] font-bold', textColors[color])}>{stat.value}</span>
                </div>
              ))}
            </div>
            
            {details.action && (
              <button
                onClick={handleNavigate}
                className={cn(
                  'w-full flex items-center justify-between px-2 py-1 border transition-all text-[8px] font-bold uppercase',
                  'hover:bg-zinc-800/60',
                  borderColors[color],
                  textColors[color]
                )}
              >
                <span>{details.action}</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default HubMetricsPanel;