import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const DEFAULT_ROLES = [
  { name: 'Commander', min_count: 1, max_count: 1, rank_required: 'Scout' },
  { name: 'Executive Officer', min_count: 0, max_count: 1, rank_required: 'Scout' },
  { name: 'Squad Leader', min_count: 1, max_count: 5, rank_required: 'Vagrant' },
  { name: 'Pilot', min_count: 1, max_count: 10, rank_required: 'Vagrant' },
  { name: 'Medic', min_count: 1, max_count: 3, rank_required: 'Vagrant' },
  { name: 'Engineer', min_count: 0, max_count: 5, rank_required: 'Vagrant' }
];

export default function EventRoleManager({ eventId, canEdit }) {
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', min_count: 0, max_count: 1, rank_required: 'Vagrant' });
  const queryClient = useQueryClient();

  const { data: event } = useQuery({
    queryKey: ['event-detail', eventId],
    queryFn: () => base44.entities.Event.get(eventId)
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list()
  });

  const { data: eventDutyAssignments = [] } = useQuery({
    queryKey: ['event-duty-assignments', eventId],
    queryFn: () => base44.entities.EventDutyAssignment.filter({ event_id: eventId }),
    refetchInterval: 5000
  });

  const roles = event?.required_roles || [];

  const updateEventMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Event.update(eventId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['event-detail', eventId]);
      toast.success('Roles updated');
    }
  });

  const assignUserMutation = useMutation({
    mutationFn: async ({ userId, roleName }) => {
      await base44.entities.EventDutyAssignment.create({
        event_id: eventId,
        user_id: userId,
        role_name: roleName,
        assigned_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['event-duty-assignments', eventId]);
      toast.success('User assigned');
    }
  });

  const unassignUserMutation = useMutation({
    mutationFn: async (assignmentId) => {
      await base44.entities.EventDutyAssignment.delete(assignmentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['event-duty-assignments', eventId]);
      toast.success('User unassigned');
    }
  });

  const addRole = () => {
    if (!newRole.name) return;
    updateEventMutation.mutate({
      required_roles: [...roles, newRole]
    });
    setNewRole({ name: '', min_count: 0, max_count: 1, rank_required: 'Vagrant' });
    setAddingRole(false);
  };

  const removeRole = (index) => {
    updateEventMutation.mutate({
      required_roles: roles.filter((_, i) => i !== index)
    });
  };

  const loadDefaults = () => {
    updateEventMutation.mutate({
      required_roles: DEFAULT_ROLES
    });
  };

  const getAssignmentsForRole = (roleName) => {
    return eventDutyAssignments.filter(a => a.role_name === roleName);
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950">
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-3 h-3 text-[#ea580c]" />
          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 font-mono">
            Personnel Roles
          </span>
        </div>
        {canEdit && (
          <div className="flex gap-1">
            {roles.length === 0 && (
              <button
                onClick={loadDefaults}
                className="text-[8px] px-2 py-1 border border-zinc-800 text-zinc-400 hover:border-zinc-700 font-mono uppercase tracking-wider"
              >
                LOAD DEFAULTS
              </button>
            )}
            <button
              onClick={() => setAddingRole(!addingRole)}
              className="text-[8px] px-2 py-1 bg-[#ea580c]/20 border border-[#ea580c] text-[#ea580c] hover:bg-[#ea580c]/30 font-mono uppercase tracking-wider"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {addingRole && (
          <div className="border border-zinc-800 bg-zinc-900/30 p-2 space-y-2">
            <Input
              placeholder="Role name..."
              value={newRole.name}
              onChange={e => setNewRole({ ...newRole, name: e.target.value })}
              className="bg-zinc-900 border-zinc-800 h-7 text-xs"
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={newRole.min_count}
                onChange={e => setNewRole({ ...newRole, min_count: parseInt(e.target.value) || 0 })}
                className="bg-zinc-900 border-zinc-800 h-7 text-xs"
              />
              <Input
                type="number"
                placeholder="Max"
                value={newRole.max_count}
                onChange={e => setNewRole({ ...newRole, max_count: parseInt(e.target.value) || 1 })}
                className="bg-zinc-900 border-zinc-800 h-7 text-xs"
              />
              <Select
                value={newRole.rank_required}
                onValueChange={val => setNewRole({ ...newRole, rank_required: val })}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-800 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vagrant">Vagrant</SelectItem>
                  <SelectItem value="Scout">Scout</SelectItem>
                  <SelectItem value="Voyager">Voyager</SelectItem>
                  <SelectItem value="Founder">Founder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1">
              <Button onClick={addRole} className="h-6 px-2 text-[9px] bg-[#ea580c] hover:bg-[#c2410c]">
                ADD
              </Button>
              <Button onClick={() => setAddingRole(false)} variant="outline" className="h-6 px-2 text-[9px]">
                CANCEL
              </Button>
            </div>
          </div>
        )}

        {roles.length === 0 && !addingRole && (
          <div className="text-xs text-zinc-600 text-center py-4 italic">
            No roles defined. Click + to add or load defaults.
          </div>
        )}

        {roles.map((role, index) => {
          const assignments = getAssignmentsForRole(role.name);
          const isFilled = assignments.length >= role.min_count;
          const isOverfilled = assignments.length > role.max_count;

          return (
            <div key={index} className="border border-zinc-800 bg-zinc-900/30 p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{role.name}</span>
                  <Badge className={cn(
                    "text-[8px] h-4",
                    isFilled ? "bg-emerald-900/30 text-emerald-400" : "bg-amber-900/30 text-amber-400"
                  )}>
                    {assignments.length}/{role.min_count}-{role.max_count}
                  </Badge>
                  <span className="text-[8px] text-zinc-600 font-mono">
                    REQ: {role.rank_required}
                  </span>
                </div>
                {canEdit && (
                  <button
                    onClick={() => removeRole(index)}
                    className="text-zinc-600 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {assignments.map(assignment => {
                  const user = users.find(u => u.id === assignment.user_id);
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800 px-2 py-1"
                    >
                      <span className="text-[9px] text-zinc-300 font-mono">
                        {user?.callsign || user?.email || 'Unknown'}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => unassignUserMutation.mutate(assignment.id)}
                          className="text-zinc-600 hover:text-red-500 text-[9px]"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}

                {canEdit && assignments.length < role.max_count && (
                  <Select
                    onValueChange={userId => assignUserMutation.mutate({ userId, roleName: role.name })}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-6 text-[9px]">
                      <SelectValue placeholder="+ Assign user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users
                        .filter(u => !assignments.find(a => a.user_id === u.id))
                        .map(user => (
                          <SelectItem key={user.id} value={user.id} className="text-[9px]">
                            {user.callsign || user.email} ({user.rank})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}