import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { PERMISSIONS, PERMISSION_LABELS, PERMISSION_CATEGORIES } from "@/components/auth/permissionConstants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RolePermissionMatrix() {
  const [editingRole, setEditingRole] = useState(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles-permission-matrix'],
    queryFn: () => base44.entities.Role.list()
  });

  const createRoleMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.Role.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permission-matrix'] });
      setNewRoleName("");
      setNewRoleDescription("");
      setSelectedPermissions([]);
      toast.success("Role created successfully");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, data }) => {
      return await base44.entities.Role.update(roleId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permission-matrix'] });
      setEditingRole(null);
      setSelectedPermissions([]);
      toast.success("Role updated successfully");
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId) => {
      return await base44.entities.Role.delete(roleId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles-permission-matrix'] });
      toast.success("Role deleted");
    }
  });

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    createRoleMutation.mutate({
      name: newRoleName,
      description: newRoleDescription,
      permissions: selectedPermissions
    });
  };

  const handleEditRole = (role) => {
    setEditingRole(role);
    setSelectedPermissions(role.permissions || []);
  };

  const handleSaveEdit = () => {
    if (!editingRole) return;
    updateRoleMutation.mutate({
      roleId: editingRole.id,
      data: {
        ...editingRole,
        permissions: selectedPermissions
      }
    });
  };

  const handleTogglePermission = (permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleDeleteRole = (roleId, roleName, isSystem) => {
    if (isSystem) {
      toast.error("Cannot delete system roles");
      return;
    }
    if (confirm(`Delete role "${roleName}"? This cannot be undone.`)) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create New Role */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900">
          <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400">
            Create New Role
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Role name (e.g., Flight Leader)"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
            <Input
              placeholder="Description"
              value={newRoleDescription}
              onChange={e => setNewRoleDescription(e.target.value)}
              className="bg-zinc-900 border-zinc-800"
            />
          </div>

          <div className="space-y-3">
            {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
              <div key={key} className="border border-zinc-800 p-3">
                <div className="text-xs uppercase font-bold text-[#ea580c] mb-2">{category.label}</div>
                <div className="grid grid-cols-2 gap-2">
                  {category.permissions.map(permKey => (
                    <label key={permKey} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900/50 p-2 rounded transition-colors">
                      <Checkbox
                        checked={selectedPermissions.includes(PERMISSIONS[permKey])}
                        onCheckedChange={() => handleTogglePermission(PERMISSIONS[permKey])}
                      />
                      <span className="text-xs text-zinc-400">{PERMISSION_LABELS[PERMISSIONS[permKey]]}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleCreateRole}
            disabled={!newRoleName.trim() || createRoleMutation.isPending}
            className="bg-[#ea580c] hover:bg-[#ea580c]/80 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Role
          </Button>
        </CardContent>
      </Card>

      {/* Existing Roles Matrix */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900">
          <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-2">
            Role Permission Matrix
            <Badge variant="outline" className="text-[9px] font-mono text-zinc-600">
              {roles.length} ROLES
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider sticky left-0 bg-zinc-900">
                    Role
                  </th>
                  {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                    <th key={key} colSpan={category.permissions.length} className="text-center p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider border-l border-zinc-800">
                      {category.label}
                    </th>
                  ))}
                  <th className="text-right p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider border-l border-zinc-800">
                    Actions
                  </th>
                </tr>
                <tr className="bg-zinc-900/50">
                  <th className="sticky left-0 bg-zinc-900/50"></th>
                  {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => 
                    category.permissions.map((permKey, idx) => (
                      <th key={`${catKey}-${permKey}`} className={cn(
                        "text-center p-2 text-[8px] text-zinc-700 font-normal",
                        idx === 0 && "border-l border-zinc-800"
                      )}>
                        <div className="writing-mode-vertical transform rotate-180 whitespace-nowrap">
                          {PERMISSION_LABELS[PERMISSIONS[permKey]]}
                        </div>
                      </th>
                    ))
                  )}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="100" className="p-8 text-center text-sm text-zinc-600">
                      Loading roles...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan="100" className="p-8 text-center">
                      <Shield className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
                      <div className="text-sm text-zinc-600">No roles created yet</div>
                    </td>
                  </tr>
                ) : (
                  roles.map(role => (
                    <tr key={role.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                      <td className="p-3 sticky left-0 bg-zinc-950">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#ea580c]" />
                          <div>
                            <div className="text-sm font-bold text-white">{role.name}</div>
                            {role.description && (
                              <div className="text-[10px] text-zinc-600">{role.description}</div>
                            )}
                            {role.is_system && (
                              <Badge className="mt-1 bg-purple-900/20 text-purple-500 border-purple-900 text-[8px]">
                                SYSTEM
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => 
                        category.permissions.map((permKey, idx) => (
                          <td key={`${catKey}-${permKey}`} className={cn(
                            "text-center p-2",
                            idx === 0 && "border-l border-zinc-800"
                          )}>
                            {role.permissions?.includes(PERMISSIONS[permKey]) ? (
                              <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-zinc-800 mx-auto" />
                            )}
                          </td>
                        ))
                      )}
                      <td className="p-3 text-right border-l border-zinc-800">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleEditRole(role)}
                            size="sm"
                            variant="ghost"
                            className="text-zinc-500 hover:text-[#ea580c] h-7 text-xs"
                          >
                            Edit
                          </Button>
                          {!role.is_system && (
                            <Button
                              onClick={() => handleDeleteRole(role.id, role.name, role.is_system)}
                              size="sm"
                              variant="ghost"
                              className="text-zinc-500 hover:text-red-500 h-7 text-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Role Modal */}
      {editingRole && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-zinc-950 border-zinc-800 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-zinc-900 sticky top-0 bg-zinc-950">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg uppercase font-bold tracking-wider">
                  Edit Role: {editingRole.name}
                </CardTitle>
                <button
                  onClick={() => {
                    setEditingRole(null);
                    setSelectedPermissions([]);
                  }}
                  className="text-zinc-600 hover:text-zinc-400 text-2xl"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {editingRole.is_system && (
                <div className="border border-amber-900/50 bg-amber-950/20 p-3 rounded flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                  <div className="text-xs text-amber-500">
                    <div className="font-bold mb-1">System Role</div>
                    <div className="text-amber-600">
                      This is a system role. Be careful when modifying permissions.
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="border border-zinc-800 p-3">
                    <div className="text-xs uppercase font-bold text-[#ea580c] mb-2">{category.label}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {category.permissions.map(permKey => (
                        <label key={permKey} className="flex items-center gap-2 cursor-pointer hover:bg-zinc-900/50 p-2 rounded transition-colors">
                          <Checkbox
                            checked={selectedPermissions.includes(PERMISSIONS[permKey])}
                            onCheckedChange={() => handleTogglePermission(PERMISSIONS[permKey])}
                          />
                          <span className="text-xs text-zinc-400">{PERMISSION_LABELS[PERMISSIONS[permKey]]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  onClick={() => {
                    setEditingRole(null);
                    setSelectedPermissions([]);
                  }}
                  variant="outline"
                  className="border-zinc-800 text-zinc-400"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateRoleMutation.isPending}
                  className="bg-[#ea580c] hover:bg-[#ea580c]/80 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}