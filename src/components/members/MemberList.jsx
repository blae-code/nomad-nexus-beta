import React from 'react';
import { Shield, User } from 'lucide-react';

export default function MemberList({ members, selectedMember, onSelectMember }) {
  const getRankColor = (rank) => {
    const colors = {
      VAGRANT: 'text-zinc-500',
      SCOUT: 'text-blue-400',
      VOYAGER: 'text-purple-400',
      COMMANDER: 'text-orange-400',
    };
    return colors[rank] || 'text-zinc-400';
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      COMMANDER: 'bg-red-600',
      LEAD: 'bg-orange-600',
      MEDIC: 'bg-green-600',
      LOGISTICS: 'bg-blue-600',
      PILOT: 'bg-purple-600',
    };
    return colors[role] || 'bg-zinc-600';
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-bold text-zinc-400 uppercase mb-4">
        Members ({members.length})
      </h2>

      {members.length === 0 ? (
        <div className="text-center py-8 text-zinc-500 text-sm">No members found</div>
      ) : (
        members.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelectMember(member)}
            className={`w-full text-left p-3 border rounded transition-all ${
              selectedMember?.id === member.id
                ? 'bg-orange-500/20 border-orange-500'
                : 'bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-zinc-500" />
              <div>
                <div className="font-bold text-white text-sm">{member.full_name}</div>
                <div className={`text-xs ${getRankColor(member.profile?.rank || 'VAGRANT')}`}>
                  {member.profile?.callsign || 'No callsign'}
                </div>
              </div>
            </div>

            {member.profile?.roles && member.profile.roles.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {member.profile.roles.slice(0, 2).map((role) => (
                  <span
                    key={role}
                    className={`text-[10px] text-white font-bold px-2 py-1 rounded ${getRoleBadgeColor(
                      role
                    )}`}
                  >
                    {role}
                  </span>
                ))}
                {member.profile.roles.length > 2 && (
                  <span className="text-[10px] text-zinc-500 px-2 py-1">+{member.profile.roles.length - 2}</span>
                )}
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );
}