import React from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import RolePermissionManager from '@/components/admin/RolePermissionManager';
import { Shield, AlertTriangle } from 'lucide-react';

// Define available panels (should match your app's panels)
const AVAILABLE_PANELS = [
  { id: 'map-tactical', title: 'Tactical Map' },
  { id: 'comms-hub', title: 'Communications Hub' },
  { id: 'voice-control', title: 'Voice Control' },
  { id: 'operations', title: 'Operations Dashboard' },
  { id: 'fleet-command', title: 'Fleet Command' },
  { id: 'system-health', title: 'System Health' },
  { id: 'diagnostics', title: 'Diagnostics' },
  { id: 'team-roster', title: 'Team Roster' },
  { id: 'event-manager', title: 'Event Manager' },
];

const AVAILABLE_ROLES = [
  'admin',
  'moderator',
  'user',
  'pilot',
  'medic',
  'logistics',
  'scout',
  'rank:pioneer',
  'rank:founder',
  'rank:pathfinder',
  'rank:vagrant',
];

export default function RoleManagement() {
  const { user } = useAuth();

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-lg border border-red-500/40 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-zinc-400">
            You must be an administrator to manage role permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold text-zinc-100">Role & Permission Management</h1>
          </div>
          <p className="text-zinc-400">
            Configure granular access controls for panels, features, and data visibility across different user roles.
          </p>
        </div>

        <RolePermissionManager 
          availablePanels={AVAILABLE_PANELS}
          availableRoles={AVAILABLE_ROLES}
        />

        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">Access Levels</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <div className="font-semibold text-zinc-400 mb-1">None</div>
              <div className="text-zinc-500">Panel is completely hidden</div>
            </div>
            <div>
              <div className="font-semibold text-zinc-400 mb-1">Read</div>
              <div className="text-zinc-500">View only, no modifications</div>
            </div>
            <div>
              <div className="font-semibold text-zinc-400 mb-1">Edit</div>
              <div className="text-zinc-500">Can modify content within panel</div>
            </div>
            <div>
              <div className="font-semibold text-zinc-400 mb-1">Admin</div>
              <div className="text-zinc-500">Full control including configuration</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}