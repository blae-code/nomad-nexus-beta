import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PERMISSIONS, PERMISSION_LABELS } from "@/components/auth/permissionConstants";

export default function RoleManager() {
  const queryClient = useQueryClient();
  const [editingRole, setEditingRole] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Roles
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list()
  });

  // Mutations
  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setIsCreating(false);
      setEditingRole(null);
      toast.success("Role created successfully");
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      setEditingRole(null);
      toast.success("Role updated successfully");
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success("Role deleted");
    }
  });

  if (isLoading) return <div className="p-6 text-zinc-500 font-mono">LOADING ROLES...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#ea580c]" />
          Role Definitions
        </h2>
        <Button 
          onClick={() => { setIsCreating(true); setEditingRole({ name: "", description: "", permissions: [] }); }}
          className="bg-zinc-900 border border-zinc-800 hover:border-[#ea580c] text-zinc-300"
        >
          <Plus className="w-4 h-4 mr-2" /> New Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1 space-y-3">
          {roles.map(role => (
            <div 
              key={role.id}
              className={`p-4 rounded-sm border transition-all cursor-pointer ${
                editingRole?.id === role.id 
                  ? "bg-zinc-900 border-[#ea580c]" 
                  : "bg-zinc-950 border-zinc-900 hover:border-zinc-800"
              }`}
              onClick={() => { setIsCreating(false); setEditingRole(role); }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-zinc-200">{role.name}</div>
                  <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{role.description}</div>
                </div>
                {role.is_system && <Badge variant="secondary" className="text-[10px]">SYSTEM</Badge>}
              </div>
              <div className="mt-3 flex gap-1 flex-wrap">
                {role.permissions.slice(0, 3).map(p => (
                  <span key={p} className="px-1.5 py-0.5 bg-zinc-900 text-[9px] font-mono text-zinc-500 rounded">
                    {p.split('_')[1]}
                  </span>
                ))}
                {role.permissions.length > 3 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono text-zinc-600">+{role.permissions.length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Role Editor */}
        <div className="lg:col-span-2">
          {(editingRole || isCreating) ? (
            <Card className="bg-zinc-950 border-zinc-800">
              <CardHeader className="pb-4 border-b border-zinc-900">
                <CardTitle className="text-lg font-mono uppercase tracking-wider">
                  {isCreating ? "Create New Role" : `Editing: ${editingRole.name}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Role Name</Label>
                    <Input 
                      value={editingRole.name}
                      onChange={e => setEditingRole({...editingRole, name: e.target.value})}
                      className="bg-zinc-900 border-zinc-800"
                      placeholder="e.g. Tactical Command"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input 
                      value={editingRole.description}
                      onChange={e => setEditingRole({...editingRole, description: e.target.value})}
                      className="bg-zinc-900 border-zinc-800"
                      placeholder="Role responsibilities..."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-zinc-400 uppercase text-xs font-bold tracking-wider">Permissions</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                      const hasPerm = editingRole.permissions?.includes(key);
                      return (
                        <div 
                          key={key}
                          onClick={() => {
                            const newPerms = hasPerm 
                              ? editingRole.permissions.filter(p => p !== key)
                              : [...(editingRole.permissions || []), key];
                            setEditingRole({...editingRole, permissions: newPerms});
                          }}
                          className={`p-3 rounded border text-xs cursor-pointer select-none flex items-center justify-between transition-colors ${
                            hasPerm 
                              ? "bg-[#ea580c]/10 border-[#ea580c]/30 text-orange-200" 
                              : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:bg-zinc-900"
                          }`}
                        >
                          <span>{label}</span>
                          {hasPerm && <Shield className="w-3 h-3 text-[#ea580c]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t border-zinc-900">
                  {!isCreating && !editingRole.is_system && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => {
                        if(confirm("Delete this role?")) deleteRoleMutation.mutate(editingRole.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button variant="ghost" onClick={() => { setEditingRole(null); setIsCreating(false); }}>Cancel</Button>
                    <Button 
                      onClick={() => {
                        if (isCreating) createRoleMutation.mutate(editingRole);
                        else updateRoleMutation.mutate({ id: editingRole.id, data: editingRole });
                      }}
                      className="bg-[#ea580c] hover:bg-[#c2410c]"
                    >
                      <Save className="w-4 h-4 mr-2" /> Save Role
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 border border-zinc-900 rounded-sm bg-zinc-950/50 p-10 border-dashed">
              <Shield className="w-12 h-12 mb-4 opacity-20" />
              <p className="uppercase tracking-widest text-sm">Select a role to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}