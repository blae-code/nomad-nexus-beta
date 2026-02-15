import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Plus, Trash2, Save, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ACCESS_LEVELS, getDefaultPermissionsForRole, clearPermissionCache } from '../nexus-os/services/permissionService';

export default function RolePermissionManager({ availablePanels = [], availableRoles = [] }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPanel, setSelectedPanel] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const perms = await base44.entities.PanelPermission.list('-created_date', 500);
      setPermissions(perms);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setMessage('Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const addPermission = async () => {
    if (!selectedRole || !selectedPanel) {
      setMessage('Select both role and panel');
      return;
    }

    // Check if permission already exists
    const existing = permissions.find(
      (p) => p.role_name === selectedRole && p.panel_id === selectedPanel
    );

    if (existing) {
      setMessage('Permission already exists for this role/panel combination');
      return;
    }

    try {
      const defaults = getDefaultPermissionsForRole(selectedRole);
      const newPerm = await base44.entities.PanelPermission.create({
        role_name: selectedRole,
        panel_id: selectedPanel,
        access_level: defaults.access_level,
        feature_permissions: defaults.feature_permissions,
        is_active: true,
      });

      setPermissions([...permissions, newPerm]);
      clearPermissionCache();
      setMessage('Permission added successfully');
      setSelectedPanel('');
    } catch (error) {
      console.error('Failed to add permission:', error);
      setMessage('Failed to add permission');
    }
  };

  const updatePermission = async (permId, updates) => {
    try {
      await base44.entities.PanelPermission.update(permId, updates);
      setPermissions(
        permissions.map((p) => (p.id === permId ? { ...p, ...updates } : p))
      );
      clearPermissionCache();
      setMessage('Permission updated');
    } catch (error) {
      console.error('Failed to update permission:', error);
      setMessage('Failed to update permission');
    }
  };

  const deletePermission = async (permId) => {
    if (!confirm('Delete this permission rule?')) return;

    try {
      await base44.entities.PanelPermission.delete(permId);
      setPermissions(permissions.filter((p) => p.id !== permId));
      clearPermissionCache();
      setMessage('Permission deleted');
    } catch (error) {
      console.error('Failed to delete permission:', error);
      setMessage('Failed to delete permission');
    }
  };

  const applyDefaultsToRole = async (roleName) => {
    if (!confirm(`Apply default permissions to all panels for role "${roleName}"?`)) return;

    setSaving(true);
    try {
      const defaults = getDefaultPermissionsForRole(roleName);

      for (const panel of availablePanels) {
        const existing = permissions.find(
          (p) => p.role_name === roleName && p.panel_id === panel.id
        );

        if (existing) {
          await base44.entities.PanelPermission.update(existing.id, {
            access_level: defaults.access_level,
            feature_permissions: defaults.feature_permissions,
          });
        } else {
          await base44.entities.PanelPermission.create({
            role_name: roleName,
            panel_id: panel.id,
            access_level: defaults.access_level,
            feature_permissions: defaults.feature_permissions,
            is_active: true,
          });
        }
      }

      await loadPermissions();
      clearPermissionCache();
      setMessage(`Applied defaults for ${roleName}`);
    } catch (error) {
      console.error('Failed to apply defaults:', error);
      setMessage('Failed to apply defaults');
    } finally {
      setSaving(false);
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.role_name]) acc[perm.role_name] = [];
    acc[perm.role_name].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-5 h-5 animate-spin text-orange-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-zinc-950 rounded-lg border border-zinc-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-orange-400" />
          <h2 className="text-lg font-bold text-zinc-100">Role-Based Access Control</h2>
        </div>
        <Button size="sm" variant="outline" onClick={loadPermissions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {message && (
        <div className="px-3 py-2 rounded bg-zinc-900 border border-zinc-700 text-sm text-zinc-300">
          {message}
        </div>
      )}

      {/* Add New Permission */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Add Permission Rule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {availableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPanel} onValueChange={setSelectedPanel}>
            <SelectTrigger>
              <SelectValue placeholder="Select panel" />
            </SelectTrigger>
            <SelectContent>
              {availablePanels.map((panel) => (
                <SelectItem key={panel.id} value={panel.id}>
                  {panel.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={addPermission} disabled={!selectedRole || !selectedPanel}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      {/* Role Defaults */}
      <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Bulk Actions</h3>
        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role) => (
            <Button
              key={role}
              size="sm"
              variant="outline"
              onClick={() => applyDefaultsToRole(role)}
              disabled={saving}
            >
              Apply Defaults to {role}
            </Button>
          ))}
        </div>
      </div>

      {/* Permissions List */}
      <div className="space-y-4">
        {Object.entries(groupedPermissions).map(([role, perms]) => (
          <div key={role} className="rounded border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
            <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">{role}</h3>
            <div className="space-y-2">
              {perms.map((perm) => {
                const panel = availablePanels.find((p) => p.id === perm.panel_id);
                return (
                  <div
                    key={perm.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 rounded bg-zinc-950/60 border border-zinc-800"
                  >
                    <div className="md:col-span-3 min-w-0">
                      <div className="text-sm text-zinc-200 truncate">{panel?.title || perm.panel_id}</div>
                      <div className="text-xs text-zinc-500 truncate">{perm.panel_id}</div>
                    </div>

                    <div className="md:col-span-2">
                      <Select
                        value={perm.access_level}
                        onValueChange={(value) => updatePermission(perm.id, { access_level: value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ACCESS_LEVELS.NONE}>None</SelectItem>
                          <SelectItem value={ACCESS_LEVELS.READ}>Read</SelectItem>
                          <SelectItem value={ACCESS_LEVELS.EDIT}>Edit</SelectItem>
                          <SelectItem value={ACCESS_LEVELS.ADMIN}>Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-6 flex flex-wrap gap-2 text-xs">
                      {['can_export', 'can_share', 'can_delete', 'can_configure', 'can_view_sensitive_data'].map((feature) => (
                        <label key={feature} className="flex items-center gap-1.5 text-zinc-400">
                          <Switch
                            checked={perm.feature_permissions?.[feature] || false}
                            onCheckedChange={(checked) =>
                              updatePermission(perm.id, {
                                feature_permissions: {
                                  ...perm.feature_permissions,
                                  [feature]: checked,
                                },
                              })
                            }
                          />
                          {feature.replace('can_', '').replace('_', ' ')}
                        </label>
                      ))}
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deletePermission(perm.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {Object.keys(groupedPermissions).length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            No permission rules defined. Add rules above to control panel access.
          </div>
        )}
      </div>
    </div>
  );
}