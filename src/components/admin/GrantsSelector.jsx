import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const AVAILABLE_GRANTS = [
  {
    id: 'read_only',
    label: 'Read Only',
    description: 'View-only access to core features',
  },
  {
    id: 'comms_access',
    label: 'Comms Access',
    description: 'Access to communication channels',
  },
  {
    id: 'event_creation',
    label: 'Event Creation',
    description: 'Ability to create and manage events',
  },
  {
    id: 'fleet_management',
    label: 'Fleet Management',
    description: 'Manage fleet assets and deployments',
  },
  {
    id: 'admin_access',
    label: 'Admin Access',
    description: 'Full administrative privileges',
  },
  {
    id: 'voice_net_control',
    label: 'Voice Net Control',
    description: 'Manage voice communication networks',
  },
];

export default function GrantsSelector({ selectedGrants, onChange }) {
  const handleToggleGrant = (grantId) => {
    if (selectedGrants.includes(grantId)) {
      onChange(selectedGrants.filter((g) => g !== grantId));
    } else {
      onChange([...selectedGrants, grantId]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-zinc-300 block mb-2">Grants</label>
        <div className="space-y-2">
          {AVAILABLE_GRANTS.map((grant) => (
            <div
              key={grant.id}
              className="flex items-start gap-3 p-2 rounded hover:bg-zinc-800/30 transition-colors cursor-pointer"
              onClick={() => handleToggleGrant(grant.id)}
            >
              <Checkbox
                checked={selectedGrants.includes(grant.id)}
                onCheckedChange={() => handleToggleGrant(grant.id)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="text-sm text-zinc-200 font-medium">{grant.label}</div>
                <div className="text-xs text-zinc-500">{grant.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedGrants.length > 0 && (
        <div>
          <div className="text-xs text-zinc-400 mb-2">Selected Grants:</div>
          <div className="flex flex-wrap gap-2">
            {selectedGrants.map((grantId) => {
              const grant = AVAILABLE_GRANTS.find((g) => g.id === grantId);
              return (
                <Badge key={grantId} className="bg-orange-600 text-white">
                  {grant.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}