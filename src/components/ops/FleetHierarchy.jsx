import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import StatusChip from "@/components/status/StatusChip";
import { AlertTriangle, Shield, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function FleetHierarchy({ eventId }) {
  // Fetch all units (Fleet, Wing, Squad)
  const { data: units } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    initialData: []
  });

  // Fetch Squad Members
  const { data: memberships } = useQuery({
    queryKey: ['all-squad-members'],
    queryFn: () => base44.entities.SquadMember.list(),
    initialData: []
  });

  // Fetch Users
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  // Fetch Statuses for Event
  const { data: statuses } = useQuery({
    queryKey: ['event-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  // Fetch Duty Assignments for Event
  const { data: dutyAssignments } = useQuery({
    queryKey: ['duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId }),
    enabled: !!eventId,
    initialData: []
  });

  // Build Hierarchy
  const hierarchy = React.useMemo(() => {
    const userMap = new Map(users.map(u => [u.id, u]));
    const statusMap = new Map(statuses.map(s => [s.user_id, s]));
    const dutyMap = new Map();
    dutyAssignments.forEach(d => {
      if (!dutyMap.has(d.unit_id)) dutyMap.set(d.unit_id, []);
      dutyMap.get(d.unit_id).push(d);
    });

    // Separate units by hierarchy level
    const fleets = units.filter(u => u.hierarchy_level === 'fleet');
    const wings = units.filter(u => u.hierarchy_level === 'wing');
    const squads = units.filter(u => u.hierarchy_level === 'squad' || !u.hierarchy_level);

    const buildUnitData = (unit) => {
      const memberIds = memberships
        .filter(m => m.squad_id === unit.id)
        .map(m => m.user_id);
      
      const members = memberIds
        .map(id => {
          const user = userMap.get(id);
          if (!user) return null;
          return {
            ...user,
            status: statusMap.get(id)?.status || 'OFFLINE',
            role: statusMap.get(id)?.role || 'OTHER'
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const priority = { DISTRESS: 0, DOWN: 1, ENGAGED: 2, IN_QUANTUM: 3, READY: 4, RTB: 5, OFFLINE: 6 };
          return (priority[a.status] || 99) - (priority[b.status] || 99);
        });

      const duties = dutyMap.get(unit.id) || [];

      return {
        ...unit,
        members,
        duties,
        stats: {
          total: members.length,
          down: members.filter(m => m.status === 'DOWN' || m.status === 'DISTRESS').length,
          ready: members.filter(m => m.status === 'READY' || m.status === 'ENGAGED').length
        }
      };
    };

    // Build fleet structure
    const fleetHierarchy = fleets.map(fleet => {
      const fleetWings = wings.filter(w => w.parent_id === fleet.id).map(wing => {
        const wingSquads = squads.filter(s => s.parent_id === wing.id).map(buildUnitData);
        return { ...buildUnitData(wing), children: wingSquads };
      });
      
      return { ...buildUnitData(fleet), children: fleetWings };
    });

    // Standalone wings (no parent fleet)
    const standaloneWings = wings.filter(w => !w.parent_id).map(wing => {
      const wingSquads = squads.filter(s => s.parent_id === wing.id).map(buildUnitData);
      return { ...buildUnitData(wing), children: wingSquads };
    });

    // Standalone squads (no parent wing)
    const standaloneSquads = squads.filter(s => !s.parent_id).map(buildUnitData);

    // Unassigned users
    const assignedUserIds = new Set(memberships.map(m => m.user_id));
    const unassignedMembers = statuses
      .filter(s => !assignedUserIds.has(s.user_id))
      .map(s => {
        const user = userMap.get(s.user_id);
        if (!user) return null;
        return { ...user, status: s.status, role: s.role };
      })
      .filter(Boolean);

    return {
      fleets: fleetHierarchy,
      wings: standaloneWings,
      squads: standaloneSquads,
      unassigned: unassignedMembers
    };
  }, [units, memberships, users, statuses, dutyAssignments]);

  // Render Unit Card
  const UnitCard = ({ unit, level = 0 }) => {
    const [expanded, setExpanded] = React.useState(true);
    const hasChildren = unit.children && unit.children.length > 0;

    const dutyLeaders = unit.duties
      .filter(d => ['Fleet Commander', 'Wing Lead', 'Squad Lead'].includes(d.duty_role))
      .map(d => {
        const user = users.find(u => u.id === d.user_id);
        return user ? { ...d, user } : null;
      })
      .filter(Boolean);

    return (
      <div className={cn("space-y-2", level > 0 && "ml-6 border-l-2 border-zinc-800 pl-4")}>
        <Card className={cn(
          "bg-zinc-950 border-zinc-800 p-3 transition-all",
          unit.stats?.down > 0 && "border-red-900/30 bg-red-950/5"
        )}>
          <div className="space-y-3">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {hasChildren && (
                    <button 
                      onClick={() => setExpanded(!expanded)}
                      className="hover:bg-zinc-800 p-0.5 rounded transition-colors"
                    >
                      <ChevronRight className={cn(
                        "w-3 h-3 text-zinc-500 transition-transform",
                        expanded && "rotate-90"
                      )} />
                    </button>
                  )}
                  <div className="font-bold text-zinc-200 uppercase tracking-wider text-sm flex items-center gap-2">
                    {unit.name}
                    {unit.stats?.down > 0 && <AlertTriangle className="w-3 h-3 text-red-500 animate-pulse" />}
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-[9px] px-1.5 py-0",
                    unit.hierarchy_level === 'fleet' && "border-amber-700 text-amber-400 bg-amber-950/20",
                    unit.hierarchy_level === 'wing' && "border-cyan-700 text-cyan-400 bg-cyan-950/20",
                    (!unit.hierarchy_level || unit.hierarchy_level === 'squad') && "border-emerald-700 text-emerald-400 bg-emerald-950/20"
                  )}>
                    {unit.hierarchy_level || 'squad'}
                  </Badge>
                </div>

                {/* Duty Leaders */}
                {dutyLeaders.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    {dutyLeaders.map(duty => (
                      <div key={duty.id} className="flex items-center gap-1 text-[10px] text-amber-400">
                        <Star className="w-2.5 h-2.5 fill-amber-500" />
                        <span className="font-mono">{duty.user.callsign || duty.user.rsi_handle}</span>
                        <span className="text-zinc-600">({duty.duty_role})</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {unit.stats && (
                <div className="text-[10px] text-zinc-500 font-mono whitespace-nowrap ml-2">
                  <span className="text-emerald-500">{unit.stats.ready} RDY</span> / 
                  <span className="text-red-500"> {unit.stats.down} DWN</span> / {unit.stats.total}
                </div>
              )}
            </div>

            {/* Members */}
            {unit.members && unit.members.length > 0 && (
              <div className="space-y-1">
                {unit.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-zinc-900/50 px-2 py-1.5 rounded-sm border border-zinc-800/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        member.status === 'OFFLINE' ? 'bg-zinc-700' : 'bg-emerald-500'
                      )} />
                      <span className="text-xs font-bold text-zinc-300 truncate">
                        {member.callsign || member.rsi_handle || member.full_name}
                      </span>
                    </div>
                    <StatusChip status={member.status} size="xs" showLabel={true} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Children (Wings/Squads) */}
        {hasChildren && expanded && (
          <div className="space-y-2">
            {unit.children.map(child => (
              <UnitCard key={child.id} unit={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Shield className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold uppercase text-zinc-300 tracking-widest">Fleet Hierarchy & Status</h3>
      </div>

      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4 pb-4">
          {/* Fleets */}
          {hierarchy.fleets.map(fleet => (
            <UnitCard key={fleet.id} unit={fleet} level={0} />
          ))}

          {/* Standalone Wings */}
          {hierarchy.wings.map(wing => (
            <UnitCard key={wing.id} unit={wing} level={0} />
          ))}

          {/* Standalone Squads */}
          {hierarchy.squads.map(squad => (
            <UnitCard key={squad.id} unit={squad} level={0} />
          ))}

          {/* Unassigned */}
          {hierarchy.unassigned.length > 0 && (
            <Card className="bg-zinc-950 border-zinc-800 border-dashed p-3">
              <div className="font-bold text-zinc-500 uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
                <AlertCircle className="w-3 h-3" />
                Unassigned / Aux ({hierarchy.unassigned.length})
              </div>
              <div className="space-y-1">
                {hierarchy.unassigned.map(member => (
                  <div key={member.id} className="flex items-center justify-between bg-zinc-900/50 px-2 py-1.5 rounded-sm">
                    <span className="text-xs text-zinc-400">{member.callsign || member.rsi_handle || member.full_name}</span>
                    <StatusChip status={member.status} size="xs" showLabel={true} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}