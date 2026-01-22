import React from 'react';
import { Target, Clock, Swords, Award, Radio, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HubPersonalStats({ 
  userEvents, 
  recentLogs, 
  squadMemberships, 
  userRankIndex, 
  user, 
  voiceNets 
}) {
  return (
    <div>
      <div className="text-[7px] uppercase text-zinc-400 tracking-widest mb-2 font-bold">PERSONAL PERFORMANCE</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={Target}
          label="Missions"
          value={userEvents.length}
          subtext="assigned ops"
          color="[#ea580c]"
        />

        <StatCard
          icon={Clock}
          label="Activity"
          value={recentLogs.filter(l => l.actor_user_id === user?.id).length}
          subtext="recent actions"
          color="cyan-300"
        />

        <StatCard
          icon={Swords}
          label="Squads"
          value={squadMemberships.length}
          subtext="assignments"
          color="purple-300"
        />

        <StatCard
          icon={Award}
          label="Rank"
          value={userRankIndex + 1}
          subtext={user?.rank || 'VAGRANT'}
          color="emerald-300"
        />

        <StatCard
          icon={Radio}
          label="Comms"
          value={voiceNets.length}
          subtext="available nets"
          color="blue-300"
        />

        <StatCard
          icon={Activity}
          label="Clearance"
          value={`L${userRankIndex + 1}`}
          subtext="access level"
          color="zinc-300"
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, subtext, color }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-700 p-3 hover:border-[#ea580c]/50 transition-all cursor-pointer group">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn('w-3.5 h-3.5 group-hover:scale-110 transition-transform', `text-${color}`)} />
        <span className="text-[8px] uppercase text-zinc-300 tracking-wider font-bold">{label}</span>
      </div>
      <div className="text-2xl font-black text-white mb-0.5">{value}</div>
      <div className={cn('text-[7px] font-medium', `text-${color}`)}>{subtext}</div>
    </div>
  );
}