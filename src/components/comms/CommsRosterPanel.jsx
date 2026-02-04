import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, UserMinus } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { isAdminUser } from '@/utils';

export default function CommsRosterPanel() {
  const { user: authUser } = useAuth();
  const user = authUser?.member_profile_data || authUser;
  const canManage = isAdminUser(authUser);

  const [squads, setSquads] = useState([]);
  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [selectedSquadId, setSelectedSquadId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const squadList = await base44.entities.Squad.list();
        setSquads(squadList || []);
        if (!selectedSquadId && squadList?.[0]?.id) {
          setSelectedSquadId(squadList[0].id);
        }
      } catch {
        setSquads([]);
      }

      try {
        const memberList = await base44.entities.MemberProfile.list();
        setMembers(memberList || []);
      } catch {
        setMembers([]);
      }

      try {
        const membershipList = await base44.entities.SquadMembership.list();
        setMemberships(membershipList || []);
      } catch {
        setMemberships([]);
      }
    };

    load();
  }, []);

  const groupedSquads = useMemo(() => {
    const groups = { fleet: [], wing: [], squad: [] };
    squads.forEach((squad) => {
      const level = (squad.hierarchy_level || 'squad').toLowerCase();
      if (level === 'fleet') groups.fleet.push(squad);
      else if (level === 'wing') groups.wing.push(squad);
      else groups.squad.push(squad);
    });
    return groups;
  }, [squads]);

  const membershipBySquad = useMemo(() => {
    const map = new Map();
    memberships.forEach((membership) => {
      const squadId = membership.squad_id || membership.squadId;
      if (!squadId) return;
      if (!map.has(squadId)) map.set(squadId, []);
      map.get(squadId).push(membership);
    });
    return map;
  }, [memberships]);

  const assignedMembers = useMemo(() => {
    if (!selectedSquadId) return [];
    const assigned = membershipBySquad.get(selectedSquadId) || [];
    const memberIds = new Set(assigned.map((m) => m.member_profile_id || m.user_id));
    return members.filter((m) => memberIds.has(m.id));
  }, [members, membershipBySquad, selectedSquadId]);

  const filteredMembers = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return members;
    return members.filter((m) =>
      [m.callsign, m.display_callsign, m.full_name, m.email]
        .filter(Boolean)
        .some((value) => value.toString().toLowerCase().includes(query))
    );
  }, [members, search]);

  const handleAssign = async (memberId) => {
    if (!selectedSquadId) return;
    try {
      const existing = memberships.find(
        (m) =>
          (m.member_profile_id || m.user_id) === memberId &&
          (m.squad_id || m.squadId) === selectedSquadId
      );
      if (existing) return;

      const created = await base44.entities.SquadMembership.create({
        squad_id: selectedSquadId,
        member_profile_id: memberId,
        status: 'active',
        assigned_at: new Date().toISOString(),
        assigned_by: user?.id || null,
      });
      setMemberships((prev) => [...prev, created]);
    } catch (error) {
      console.error('Failed to assign member:', error);
    }
  };

  const handleRemove = async (memberId) => {
    if (!selectedSquadId) return;
    const existing = memberships.find(
      (m) =>
        (m.member_profile_id || m.user_id) === memberId &&
        (m.squad_id || m.squadId) === selectedSquadId
    );
    if (!existing) return;

    try {
      if (base44.entities.SquadMembership.delete) {
        await base44.entities.SquadMembership.delete(existing.id);
        setMemberships((prev) => prev.filter((m) => m.id !== existing.id));
      } else {
        await base44.entities.SquadMembership.update(existing.id, { status: 'inactive' });
        setMemberships((prev) =>
          prev.map((m) => (m.id === existing.id ? { ...m, status: 'inactive' } : m))
        );
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-orange-400" />
        <div>
          <div className="text-sm font-semibold text-white uppercase">Fleet Roster</div>
          <div className="text-xs text-zinc-500">Assign members to fleet, wing, and squad units.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-3">
          {['fleet', 'wing', 'squad'].map((level) => (
            <div key={level} className="space-y-1">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">{level}</div>
              {(groupedSquads[level] || []).map((squad) => (
                <button
                  key={squad.id}
                  onClick={() => setSelectedSquadId(squad.id)}
                  className={`w-full text-left px-2 py-1 rounded text-[11px] transition-colors ${
                    selectedSquadId === squad.id
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                  }`}
                >
                  {squad.name}
                </button>
              ))}
              {(groupedSquads[level] || []).length === 0 && (
                <div className="text-[10px] text-zinc-600">No {level}s</div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Assigned</div>
          <div className="space-y-1 border border-zinc-800 rounded p-2 bg-zinc-900/40 max-h-64 overflow-y-auto">
            {assignedMembers.length === 0 ? (
              <div className="text-[10px] text-zinc-600">No members assigned.</div>
            ) : (
              assignedMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between text-xs text-zinc-300">
                  <span>{member.display_callsign || member.callsign || member.full_name}</span>
                  {canManage && (
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(member.id)}>
                      <UserMinus className="w-3 h-3 text-red-400" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-zinc-500">Available Members</div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="h-8 text-xs"
          />
          <div className="space-y-1 border border-zinc-800 rounded p-2 bg-zinc-900/40 max-h-64 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <div className="text-[10px] text-zinc-600">No members found.</div>
            ) : (
              filteredMembers.map((member) => {
                const isAssigned = assignedMembers.some((m) => m.id === member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between text-xs text-zinc-300">
                    <span>{member.display_callsign || member.callsign || member.full_name}</span>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAssign(member.id)}
                        disabled={isAssigned || !selectedSquadId}
                      >
                        <UserPlus className="w-3 h-3 text-green-400" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
