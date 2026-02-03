import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, Plus } from 'lucide-react';

const AVAILABLE_ROLES = [
  'COMMANDER',
  'LEAD',
  'MEDIC',
  'LOGISTICS',
  'PILOT',
  'GUNNER',
  'SCOUT',
  'ENGINEER',
];

export default function RoleAssignment({ member, onComplete, onMemberUpdate }) {
  const [roles, setRoles] = useState(member.profile?.roles || []);
  const [availableRoles, setAvailableRoles] = useState(AVAILABLE_ROLES);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAvailableRoles(AVAILABLE_ROLES.filter((r) => !roles.includes(r)));
  }, [roles]);

  const addRole = (role) => {
    setRoles([...roles, role]);
  };

  const removeRole = (role) => {
    setRoles(roles.filter((r) => r !== role));
  };

  const saveRoles = async () => {
    setSaving(true);
    try {
      const profileId = member.profile?.id || member.id;
      const profile = await base44.entities.MemberProfile.filter({ id: profileId });
      if (profile.length > 0) {
        await base44.entities.MemberProfile.update(profile[0].id, { roles });
      }
      onMemberUpdate();
      onComplete();
    } catch (error) {
      console.error('Failed to save roles:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-purple-950/30 border border-purple-600/50 rounded space-y-4">
      <h4 className="font-bold text-purple-300 text-sm uppercase">Assign Roles</h4>

      {/* Current Roles */}
      <div className="space-y-2">
        <div className="text-xs text-zinc-400">Assigned Roles:</div>
        {roles.length === 0 ? (
          <div className="text-xs text-zinc-500">No roles assigned</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {roles.map((role) => (
              <div
                key={role}
                className="flex items-center gap-2 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded"
              >
                {role}
                <button
                  onClick={() => removeRole(role)}
                  className="hover:text-red-300 transition"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Roles */}
      {availableRoles.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-zinc-400">Add Roles:</div>
          <div className="flex flex-wrap gap-2">
            {availableRoles.map((role) => (
              <button
                key={role}
                onClick={() => addRole(role)}
                className="flex items-center gap-1 px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded border border-zinc-700 transition"
              >
                <Plus className="w-3 h-3" />
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button onClick={saveRoles} disabled={saving} size="sm" className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {saving ? 'Saving...' : 'Save Roles'}
        </Button>
        <Button onClick={onComplete} variant="outline" size="sm" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}
