import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus, X, Shield, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

export default function EventRolesManager({ eventId, canEdit = false }) {
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ role_type: '', min_rank: 'Vagrant', user_id: null });
  const queryClient = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => base44.entities.Event.get(eventId),
    enabled: !!eventId
  });

  const { data: dutyAssignments = [] } = useQuery({
    queryKey: ['event-duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId }),
    enabled: !!eventId
  });

  const { users, userById } = useUserDirectory();

  const createAssignmentMutation = useMutation({
    mutationFn: (data) => base44.entities.EventDutyAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-duty-assignments']);
      toast.success('Role assigned');
      setShowAddRole(false);
      setNewRole({ role_type: '', min_rank: 'Vagrant', user_id: null });
    }
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id) => base44.entities.EventDutyAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-duty-assignments']);
      toast.success('Role removed');
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ data }) => base44.entities.Event.update(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['event-detail']);
      toast.success('Command staff updated');
    }
  });

  const roleTypes = [
    { value: 'commander', label: 'Commander', icon: Shield },
    { value: 'xo', label: 'Executive Officer', icon: Shield },
    { value: 'squad_lead', label: 'Squad Leader', icon: Users },
    { value: 'medic', label: 'Medical', icon: AlertCircle },
    { value: 'engineer', label: 'Engineer', icon: AlertCircle },
    { value: 'pilot', label: 'Pilot', icon: AlertCircle },
    { value: 'gunner', label: 'Gunner', icon: AlertCircle },
    { value: 'comms', label: 'Communications', icon: AlertCircle },
    { value: 'logistics', label: 'Logistics', icon: AlertCircle }
  ];

  const handleAddRole = () => {
    if (!newRole.role_type) return;
    
    createAssignmentMutation.mutate({
      event_id: eventId,
      role_type: newRole.role_type,
      min_rank: newRole.min_rank,
      assigned_user_id: newRole.user_id,
      is_required: true,
      is_filled: !!newRole.user_id
    });
  };

  const handleCommandStaffChange = (field, userId) => {
    if (!canEdit || !event) return;
    
    const commandStaff = event.command_staff || {};
    updateEventMutation.mutate({
      data: {
        command_staff: {
          ...commandStaff,
          [field]: userId
        }
      }
    });
  };

  const assignedRoles = dutyAssignments.filter(d => d.is_filled);
  const unfilledRoles = dutyAssignments.filter(d => !d.is_filled);
  const requiredUnfilled = unfilledRoles.filter(d => d.is_required).length;

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-500" />
            <span>EVENT ROLES</span>
            {requiredUnfilled > 0 && (
              <Badge className="bg-amber-900/50 text-amber-400 border-amber-800 text-[8px] h-4">
                {requiredUnfilled} UNFILLED
              </Badge>
            )}
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowAddRole(!showAddRole)}
              className="h-6 text-[9px] text-zinc-400 hover:text-white"
            >
              <UserPlus className="w-3 h-3 mr-1" />
              ADD ROLE
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Command Staff */}
        <div className="border border-zinc-800 bg-zinc-950/50 p-2">
          <div className="text-[8px] text-zinc-600 uppercase font-bold mb-2 font-mono tracking-widest">
            COMMAND STAFF
          </div>
          <div className="space-y-1.5">
            {['commander_id', 'xo_id', 'comms_officer_id'].map(field => {
              const userId = event?.command_staff?.[field];
              const user = userId ? userById[userId] : null;
              const label = field === 'commander_id' ? 'Commander' : 
                           field === 'xo_id' ? 'XO' : 'Comms Officer';
              
              return (
                <div key={field} className="flex items-center justify-between text-[9px]">
                  <span className="text-zinc-500 uppercase font-mono">{label}</span>
                  {canEdit ? (
                    <Select
                      value={userId || ''}
                      onValueChange={(val) => handleCommandStaffChange(field, val || null)}
                    >
                      <SelectTrigger className="h-6 text-[9px] w-32 bg-zinc-900 border-zinc-800">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Unassigned</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.callsign || u.rsi_handle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-zinc-300 font-mono">
                      {user ? (user.callsign || user.rsi_handle) : 'Unassigned'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Role Form */}
        {showAddRole && canEdit && (
          <div className="border border-zinc-800 bg-zinc-950/50 p-2 space-y-2">
            <div className="text-[8px] text-zinc-600 uppercase font-bold mb-2 font-mono tracking-widest">
              NEW ROLE
            </div>
            <Select value={newRole.role_type} onValueChange={(val) => setNewRole({...newRole, role_type: val})}>
              <SelectTrigger className="h-6 text-[9px] bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Select role type" />
              </SelectTrigger>
              <SelectContent>
                {roleTypes.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={newRole.min_rank} onValueChange={(val) => setNewRole({...newRole, min_rank: val})}>
                <SelectTrigger className="h-6 text-[9px] bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Vagrant', 'Scout', 'Voyager', 'Pioneer'].map(rank => (
                    <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newRole.user_id || ''} onValueChange={(val) => setNewRole({...newRole, user_id: val || null})}>
                <SelectTrigger className="h-6 text-[9px] bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Assign user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.callsign || u.rsi_handle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleAddRole}
                disabled={!newRole.role_type}
                className="h-6 text-[9px] bg-[#ea580c] hover:bg-[#c2410c]"
              >
                ADD
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddRole(false)}
                className="h-6 text-[9px]"
              >
                CANCEL
              </Button>
            </div>
          </div>
        )}

        {/* Assigned Roles */}
        {assignedRoles.length > 0 && (
          <div className="space-y-1">
            <div className="text-[8px] text-zinc-600 uppercase font-bold font-mono tracking-widest">
              ASSIGNED ({assignedRoles.length})
            </div>
            {assignedRoles.map(assignment => {
              const user = userById[assignment.assigned_user_id];
              const roleType = roleTypes.find(rt => rt.value === assignment.role_type);
              
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-1.5 bg-zinc-900/50 border border-zinc-800 text-[9px]"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge className="bg-emerald-900/50 text-emerald-400 border-emerald-800 text-[7px] h-4">
                      {roleType?.label || assignment.role_type}
                    </Badge>
                    <span className="text-zinc-300 font-mono truncate">
                      {user ? (user.callsign || user.rsi_handle) : 'Unknown'}
                    </span>
                    <span className="text-zinc-600">({assignment.min_rank}+)</span>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors ml-2"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unfilled Roles */}
        {unfilledRoles.length > 0 && (
          <div className="space-y-1">
            <div className="text-[8px] text-zinc-600 uppercase font-bold font-mono tracking-widest">
              OPEN POSITIONS ({unfilledRoles.length})
            </div>
            {unfilledRoles.map(assignment => {
              const roleType = roleTypes.find(rt => rt.value === assignment.role_type);
              
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-1.5 bg-zinc-900/50 border border-zinc-800 text-[9px]"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-900/50 text-amber-400 border-amber-800 text-[7px] h-4">
                      {roleType?.label || assignment.role_type}
                    </Badge>
                    <span className="text-zinc-500 font-mono">Seeking {assignment.min_rank}+</span>
                    {assignment.is_required && (
                      <span className="text-[7px] text-red-500">REQUIRED</span>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {dutyAssignments.length === 0 && !showAddRole && (
          <div className="text-center text-zinc-600 text-[9px] py-3">
            No roles defined for this event
          </div>
        )}
      </CardContent>
    </Card>
  );
}