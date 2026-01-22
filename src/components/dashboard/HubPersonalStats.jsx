import React, { useState } from 'react';
import { Target, Clock, Swords, Award, Radio, CheckCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function HubPersonalStats({ 
  userEvents, 
  recentLogs, 
  squadMemberships, 
  userRankIndex, 
  user, 
  voiceNets 
}) {
  const activeOps = userEvents.filter(e => ['active', 'scheduled', 'pending'].includes(e.status)).length;
  const completedOps = userEvents.filter(e => e.status === 'completed').length;
  const highPriorityActions = recentLogs.filter(l => l.actor_user_id === user?.id && l.severity === 'HIGH').length;
  const activeNets = voiceNets.filter(n => n.status === 'active').length;
  
  return (
    <div>
      <div className="text-[7px] uppercase text-zinc-400 tracking-widest mb-2 font-bold">PERSONAL PERFORMANCE</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Target}
          label="Operations"
          value={userEvents.length}
          subtext="assigned ops"
          color="[#ea580c]"
          details={{
            stats: [
              { label: 'Total Assigned', value: userEvents.length },
              { label: 'Active/Upcoming', value: activeOps },
              { label: 'Completed', value: completedOps },
            ],
            action: 'View All Operations',
            route: 'Events'
          }}
        />

        <StatCard
          icon={Clock}
          label="Activity"
          value={recentLogs.filter(l => l.actor_user_id === user?.id).length}
          subtext="recent actions"
          color="cyan-300"
          details={{
            stats: [
              { label: 'Total Actions', value: recentLogs.filter(l => l.actor_user_id === user?.id).length },
              { label: 'High Priority', value: highPriorityActions },
              { label: 'Last 24h', value: recentLogs.filter(l => l.actor_user_id === user?.id && new Date(l.created_date) > new Date(Date.now() - 86400000)).length },
            ],
            action: 'View Activity Log',
            route: 'Hub'
          }}
        />

        <StatCard
          icon={Swords}
          label="Squads"
          value={squadMemberships.length}
          subtext="assignments"
          color="purple-300"
          details={{
            stats: [
              { label: 'Total Squads', value: squadMemberships.length },
              { label: 'Leadership Roles', value: squadMemberships.filter(m => m.role === 'leader').length },
              { label: 'Active Status', value: squadMemberships.filter(m => m.status === 'active').length },
            ],
            action: 'Manage Squads',
            route: 'AdminConsole'
          }}
        />

        <StatCard
          icon={Award}
          label="Rank"
          value={user?.rank || 'VAGRANT'}
          subtext={`Clearance L${userRankIndex + 1}`}
          color="emerald-300"
          details={{
            stats: [
              { label: 'Current Rank', value: user?.rank || 'VAGRANT' },
              { label: 'Clearance Level', value: `Level ${userRankIndex + 1}` },
              { label: 'Member Since', value: user?.created_date ? new Date(user.created_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown' },
            ],
            action: 'View Profile',
            route: 'Profile'
          }}
        />

        <StatCard
          icon={Radio}
          label="Comms"
          value={voiceNets.length}
          subtext="available nets"
          color="blue-300"
          details={{
            stats: [
              { label: 'Total Nets', value: voiceNets.length },
              { label: 'Active', value: activeNets },
              { label: 'Command Nets', value: voiceNets.filter(n => n.type === 'command').length },
            ],
            action: 'Comms Console',
            route: 'CommsConsole'
          }}
        />

        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={completedOps}
          subtext="successful ops"
          color="yellow-300"
          details={{
            stats: [
              { label: 'Completed Ops', value: completedOps },
              { label: 'Success Rate', value: userEvents.length > 0 ? `${Math.round((completedOps / userEvents.length) * 100)}%` : '0%' },
              { label: 'In Progress', value: activeOps },
            ],
            action: 'View History',
            route: 'Events'
          }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color, details }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
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
      <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-[#ea580c]/50 transition-all cursor-pointer group">
        <div className="flex items-center gap-2 mb-1.5">
          <Icon className={cn('w-3.5 h-3.5 group-hover:scale-110 transition-transform', `text-${color}`)} />
          <span className="text-[8px] uppercase text-zinc-300 tracking-wider font-bold">{label}</span>
        </div>
        <div className="text-2xl font-black text-white mb-0.5">{value}</div>
        <div className={cn('text-[7px] font-medium', `text-${color}`)}>{subtext}</div>
      </div>
      
      <AnimatePresence>
        {isHovered && details && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-0 left-0 right-0 z-50 border-2 border-[#ea580c]/50 p-4 shadow-2xl bg-zinc-950/95"
            style={{
              boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Icon className={cn('w-4 h-4', `text-${color}`)} />
              <span className="text-[10px] uppercase text-zinc-200 tracking-wider font-bold">{label}</span>
            </div>
            
            <div className="space-y-2 mb-3">
              {details.stats.map((stat, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-[9px] text-zinc-400">{stat.label}</span>
                  <span className={cn('text-[11px] font-bold', `text-${color}`)}>{stat.value}</span>
                </div>
              ))}
            </div>
            
            {details.action && (
              <button
                onClick={handleNavigate}
                className="w-full flex items-center justify-between px-3 py-1.5 border border-[#ea580c]/50 bg-[#ea580c]/10 hover:bg-[#ea580c]/20 transition-all text-[#ea580c]"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider">{details.action}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}