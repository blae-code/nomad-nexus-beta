import React from 'react';
import { base44 } from '@/api/base44Client';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { User, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useUserDirectory } from '@/components/hooks/useUserDirectory';

const STAFF_ROLES = [
  { key: 'commander_id', label: 'EVENT COMMANDER', description: 'Leads operation' },
  { key: 'xo_id', label: 'EXECUTIVE OFFICER', description: 'Second in command' },
  { key: 'comms_officer_id', label: 'COMMS OFFICER', description: 'Manages communications' }
];

export default function EventCommandStaff({ event, canEdit }) {
   if (!event) return null;
   
   const [staff, setStaff] = React.useState(event.command_staff || {});

   const commandStaff = event?.command_staff ?? {};
   const staffUserIds = Object.values(commandStaff).filter(Boolean);
   const { users, userById } = useUserDirectory(staffUserIds.length > 0 ? staffUserIds : null);

  const handleAssignRole = async (roleKey, userId) => {
    if (!canEdit) return;

    try {
      const updated = { ...staff, [roleKey]: userId };
      await base44.entities.Event.update(event.id, { command_staff: updated });
      setStaff(updated);
      toast.success('STAFF ASSIGNMENT UPDATED');
    } catch (err) {
      toast.error('STAFF UPDATE FAILED');
    }
  };

  const handleRemoveRole = async (roleKey) => {
    if (!canEdit) return;

    try {
      const updated = { ...staff, [roleKey]: null };
      await base44.entities.Event.update(event.id, { command_staff: updated });
      setStaff(updated);
      toast.success('STAFF ASSIGNMENT REMOVED');
    } catch (err) {
      toast.error('REMOVAL FAILED');
    }
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <User className="w-3 h-3" />
          COMMAND STAFF
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-3">
        {STAFF_ROLES.map((role) => {
          const assignedUserId = staff[role.key];
          const assignedUser = users.find(u => u.id === assignedUserId);

          return (
            <div key={role.key} className="p-2 bg-zinc-900/50 border border-zinc-800 rounded space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-zinc-300">{role.label}</div>
                  <div className="text-[9px] text-zinc-600">{role.description}</div>
                </div>
              </div>

              {assignedUser ? (
                <div className="flex items-center justify-between p-2 bg-emerald-900/10 border border-emerald-900/30 rounded">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-emerald-400">
                      {assignedUser.callsign || assignedUser.rsi_handle || assignedUser.email}
                    </div>
                    <div className="text-[9px] text-emerald-300/60">{assignedUser.rank}</div>
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveRole(role.key)}
                      className="p-1 hover:bg-red-900/30 rounded transition-colors"
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  )}
                </div>
              ) : (
                canEdit && (
                  <Select onValueChange={(userId) => handleAssignRole(role.key, userId)}>
                    <SelectTrigger className="h-8 text-xs bg-zinc-950 border-zinc-700">
                      <SelectValue placeholder="SELECT STAFF" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.callsign || user.rsi_handle || user.email} ({user.rank})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )
              )}
            </div>
          );
        })}
      </OpsPanelContent>
    </OpsPanel>
  );
}