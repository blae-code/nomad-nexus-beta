import React, { memo, useState } from 'react';
import { User, Award, Radio, Target, Clock, TrendingUp, AlertCircle, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Personal Status Panel
 * Shows user-specific metrics and status tracking
 */
const PersonalStatusPanel = memo(function PersonalStatusPanel({ 
  user,
  userMetrics = {}
}) {
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="mt-4">
      <div className="text-[7px] uppercase text-zinc-400 tracking-widest mb-3 font-bold">PERSONAL STATUS</div>
      <div className="grid grid-cols-8 gap-2">
        {/* Rank/Title */}
        <MetricCard
          icon={Award}
          label="Rank"
          value={user.rank || 'Vagrant'}
          subtext="operative rank"
          color="amber"
          details={{
            stats: [
              { label: 'Current Rank', value: user.rank || 'Vagrant' },
              { label: 'Tenure', value: userMetrics.tenureMonths ? `${userMetrics.tenureMonths}mo` : '--' },
              { label: 'Commendations', value: userMetrics.commendations || 0 },
            ],
            action: 'View Profile',
            route: 'Profile'
          }}
        />

        {/* Status */}
        <MetricCard
          icon={Radio}
          label="Status"
          value={user.presence || 'offline'}
          subtext={user.lastSeen ? 'last activity' : 'not active'}
          color={user.presence === 'online' ? 'emerald' : 'zinc'}
          details={{
            stats: [
              { label: 'Current', value: user.presence || 'offline' },
              { label: 'Last Active', value: user.lastSeen ? '5min ago' : '--' },
              { label: 'In Voice', value: user.inVoice ? 'Yes' : 'No' },
            ],
            action: 'Status Menu',
            route: 'Profile'
          }}
        />

        {/* Assigned Ops */}
        <MetricCard
          icon={Target}
          label="Assigned Ops"
          value={userMetrics.assignedOps || 0}
          subtext="active missions"
          color="blue"
          details={{
            stats: [
              { label: 'Current', value: userMetrics.assignedOps || 0 },
              { label: 'Completed', value: userMetrics.completedOps || 0 },
              { label: 'Total Attended', value: userMetrics.totalOps || 0 },
            ],
            action: 'Operations Board',
            route: 'Events'
          }}
        />

        {/* Squad(s) */}
        <MetricCard
          icon={Radio}
          label="Squad Nets"
          value={userMetrics.squadCount || 0}
          subtext="member of"
          color="purple"
          details={{
            stats: [
              { label: 'Squad Memberships', value: userMetrics.squadCount || 0 },
              { label: 'Primary Squad', value: userMetrics.primarySquad || '--' },
              { label: 'Active Role', value: userMetrics.squadRole || '--' },
            ],
            action: 'Squad Manager',
            route: 'Hub'
          }}
        />

        {/* Recent Activity */}
        <MetricCard
          icon={Clock}
          label="Hours This Week"
          value={`${userMetrics.hoursThisWeek || 0}h`}
          subtext="playtime"
          color="cyan"
          details={{
            stats: [
              { label: 'This Week', value: `${userMetrics.hoursThisWeek || 0}h` },
              { label: 'This Month', value: `${userMetrics.hoursThisMonth || 0}h` },
              { label: 'Avg Session', value: `${userMetrics.avgSessionLength || 0}min` },
            ],
            action: 'Activity Log',
            route: 'Profile'
          }}
        />

        {/* Personal Efficiency */}
        <MetricCard
          icon={TrendingUp}
          label="Efficiency"
          value={`${userMetrics.personalEfficiency || 0}%`}
          subtext="mission success"
          color="yellow"
          details={{
            stats: [
              { label: 'Success Rate', value: `${userMetrics.personalEfficiency || 0}%` },
              { label: 'Ops Attended', value: userMetrics.totalOps || 0 },
              { label: 'Critical Hits', value: userMetrics.criticalSuccesses || 0 },
            ],
            action: 'View Analytics',
            route: 'Profile'
          }}
        />

        {/* Alerts/Status */}
        <MetricCard
          icon={AlertCircle}
          label="Alerts"
          value={userMetrics.personAlerts || 0}
          subtext="for you"
          color={userMetrics.personAlerts > 0 ? 'red' : 'zinc'}
          animate={userMetrics.personAlerts > 0}
          details={{
            stats: [
              { label: 'New Messages', value: userMetrics.newMessages || 0 },
              { label: 'Pending Invites', value: userMetrics.pendingInvites || 0 },
              { label: 'Squad Announcements', value: userMetrics.announcements || 0 },
            ],
            action: 'Notifications',
            route: 'Profile'
          }}
        />

        {/* Readiness */}
        <MetricCard
          icon={Heart}
          label="Readiness"
          value={`${userMetrics.readiness || 0}%`}
          subtext="for ops"
          color="emerald"
          details={{
            stats: [
              { label: 'Equipment Check', value: 'Ready' },
              { label: 'Voice Test', value: userMetrics.voiceReady ? 'Good' : 'Pending' },
              { label: 'Loadout', value: userMetrics.loadoutReady ? 'Equipped' : 'Incomplete' },
            ],
            action: 'Readiness Check',
            route: 'Profile'
          }}
        />
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
    amber: 'text-amber-300 hover:border-amber-400/50',
    cyan: 'text-cyan-300 hover:border-cyan-400/50',
  };

  const textColors = {
    zinc: 'text-zinc-400',
    emerald: 'text-emerald-300',
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    yellow: 'text-yellow-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
    cyan: 'text-cyan-300',
  };
  
  const bgColors = {
    zinc: 'bg-zinc-900',
    emerald: 'bg-emerald-950/80',
    blue: 'bg-blue-950/80',
    purple: 'bg-purple-950/80',
    yellow: 'bg-yellow-950/80',
    red: 'bg-red-950/80',
    amber: 'bg-amber-950/80',
    cyan: 'bg-cyan-950/80',
  };
  
  const borderColors = {
    zinc: 'border-zinc-700',
    emerald: 'border-emerald-800',
    blue: 'border-blue-800',
    purple: 'border-purple-800',
    yellow: 'border-yellow-800',
    red: 'border-red-800',
    amber: 'border-amber-800',
    cyan: 'border-cyan-800',
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
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default PersonalStatusPanel;