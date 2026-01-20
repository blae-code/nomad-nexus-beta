import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Star, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const DUTY_ROLES = [
  { value: 'Fleet Commander', label: 'Fleet Commander', color: 'amber' },
  { value: 'Wing Lead', label: 'Wing Lead', color: 'cyan' },
  { value: 'Squad Lead', label: 'Squad Lead', color: 'emerald' },
  { value: '2IC', label: '2IC (Second in Command)', color: 'blue' },
  { value: 'Element Lead', label: 'Element Lead', color: 'purple' },
  { value: 'Specialist', label: 'Specialist', color: 'orange' }
];

export default function DutyAssignmentPanel({ eventId }) {
  const [selectedUnit, setSelectedUnit] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState('');

  const queryClient = useQueryClient();

  const { data: units = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.EventDutyAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty-assignments', eventId] });
      setSelectedUnit('');
      setSelectedUser('');
      setSelectedRole('');
    }
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.EventDutyAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duty-assignments', eventId] });
    }
  });

  const handleAssign = () => {
    if (!selectedUnit || !selectedUser || !selectedRole) return;

    createAssignmentMutation.mutate({
      event_id: eventId,
      unit_id: selectedUnit,
      user_id: selectedUser,
      duty_role: selectedRole
    });
  };

  const getUnitName = (unitId) => {
    const unit = units.find(u => u.id === unitId);
    return unit ? unit.name : 'Unknown Unit';
  };

  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? (user.callsign || user.rsi_handle || user.full_name) : 'Unknown User';
  };

  const getRoleColor = (role) => {
    const roleConfig = DUTY_ROLES.find(r => r.value === role);
    return roleConfig?.color || 'zinc';
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader>
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          Event Duty Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Assignment Form */}
        <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            Assign Duty Role
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select value={selectedUnit || "__none__"} onValueChange={(v) => setSelectedUnit(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                {units.filter(u => u.id && String(u.id).trim()).length === 0 ? (
                  <SelectItem value="__none__" disabled>No units available</SelectItem>
                ) : (
                  units.filter(u => u.id && String(u.id).trim()).map(unit => (
                    <SelectItem key={unit.id} value={String(unit.id).trim()} className="text-xs">
                      {unit.name} ({unit.hierarchy_level || 'squad'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={selectedUser || "__none__"} onValueChange={(v) => setSelectedUser(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                {users.filter(u => u.id && String(u.id).trim()).length === 0 ? (
                  <SelectItem value="__none__" disabled>No users available</SelectItem>
                ) : (
                  users.filter(u => u.id && String(u.id).trim()).map(user => (
                    <SelectItem key={user.id} value={String(user.id).trim()} className="text-xs">
                      {user.callsign || user.rsi_handle || user.full_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={selectedRole || "__none__"} onValueChange={(v) => setSelectedRole(v === "__none__" ? "" : v)}>
              <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {DUTY_ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value} className="text-xs">
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={handleAssign}
            disabled={!selectedUnit || !selectedUser || !selectedRole || createAssignmentMutation.isPending}
            className="w-full h-7 bg-amber-900 hover:bg-amber-800 text-white"
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Assign Duty
          </Button>
        </div>

        {/* Current Assignments */}
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
            Active Assignments ({assignments.length})
          </div>

          {assignments.length === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-xs italic">
              No duty assignments yet
            </div>
          ) : (
            <div className="space-y-2">
              {assignments.map(assignment => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between bg-zinc-900/50 p-2 rounded border border-zinc-800"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Star className={cn(
                      "w-3 h-3 shrink-0",
                      `text-${getRoleColor(assignment.duty_role)}-500`
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-zinc-300 truncate">
                        {getUserName(assignment.user_id)}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {assignment.duty_role} • {getUnitName(assignment.unit_id)}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeAssignmentMutation.mutate(assignment.id)}
                    className="h-6 w-6 p-0 text-zinc-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}