import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Plus, Trash2, Save, Users } from "lucide-react";
import { toast } from "sonner";
import { PERMISSIONS, PERMISSION_LABELS } from "@/components/auth/permissionConstants";
import { useUserPermissions } from "@/components/auth/useUserPermissions";
import { createPageUrl } from "@/utils";

export default function RoleManagerPage() {
  const { isAdmin, isLoading: authLoading } = useUserPermissions();
  const [editingRole, setEditingRole] = useState(null);
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isAdmin
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success("Role created");
      setEditingRole(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success("Role updated");
      setEditingRole(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast.success("Role deleted");
    }
  });

  if (authLoading) return <div className="p-10 text-zinc-500">Verifying clearance...</div>;
  if (!isAdmin) return <div className="p-10 text-red-500 font-bold">ACCESS DENIED: INSUFFICIENT CLEARANCE</div>;

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get("name");
    const description = formData.get("description");
    
    const selectedPerms = Object.keys(PERMISSIONS).filter(key => 
      formData.get(`perm_${key}`) === "on"
    );

    const roleData = {
      name,
      description,
      permissions: selectedPerms
    };

    if (editingRole?.id) {
      updateMutation.mutate({ id: editingRole.id, data: roleData });
    } else {
      createMutation.mutate(roleData);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#ea580c]" />
             </div>
             <div>
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">Role Command</h1>
                <p className="text-zinc-500 font-mono text-xs tracking-widest">SECURITY // PERMISSIONS // HIERARCHY</p>
             </div>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => window.location.href = createPageUrl('UserManager')}>
                <Users className="w-4 h-4 mr-2" /> Manage Users
             </Button>
             <Button onClick={() => setEditingRole({ permissions: [] })} className="bg-[#ea580c] hover:bg-[#c2410c]">
                <Plus className="w-4 h-4 mr-2" /> New Role
             </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Role List */}
          <div className="lg:col-span-1 space-y-4">
            {roles.map(role => (
              <Card 
                key={role.id} 
                className={`bg-zinc-900/50 border-zinc-800 cursor-pointer transition-all hover:border-zinc-600 ${editingRole?.id === role.id ? 'border-[#ea580c] bg-zinc-900' : ''}`}
                onClick={() => setEditingRole(role)}
              >
                <CardHeader className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                       <CardTitle className="text-sm font-bold uppercase text-white">{role.name}</CardTitle>
                       <CardDescription className="text-xs font-mono mt-1">{role.description}</CardDescription>
                    </div>
                    {!role.is_system && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-zinc-600 hover:text-red-500 -mr-2 -mt-2"
                        onClick={(e) => { e.stopPropagation(); if(confirm('Delete role?')) deleteMutation.mutate(role.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                     {role.permissions?.slice(0, 3).map(p => (
                        <span key={p} className="text-[9px] bg-zinc-800 px-1 py-0.5 rounded text-zinc-400">{p}</span>
                     ))}
                     {(role.permissions?.length || 0) > 3 && (
                        <span className="text-[9px] text-zinc-500">+{role.permissions.length - 3} more</span>
                     )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Editor */}
          <div className="lg:col-span-2">
            {editingRole ? (
              <Card className="bg-zinc-950 border-zinc-800 sticky top-6">
                <CardHeader className="border-b border-zinc-900 pb-4">
                  <CardTitle className="text-lg uppercase font-black tracking-wide">
                     {editingRole.id ? `Edit Role: ${editingRole.name}` : 'Create New Role'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid gap-4">
                      <div>
                         <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Role Name</label>
                         <Input name="name" defaultValue={editingRole.name} required className="bg-zinc-900 border-zinc-800" placeholder="e.g. Operator" />
                      </div>
                      <div>
                         <label className="text-xs uppercase font-bold text-zinc-500 mb-1 block">Description</label>
                         <Input name="description" defaultValue={editingRole.description} className="bg-zinc-900 border-zinc-800" placeholder="Role duties..." />
                      </div>
                    </div>

                    <div>
                       <label className="text-xs uppercase font-bold text-[#ea580c] mb-3 block">Permissions Clearance</label>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                             <div key={key} className="flex items-center space-x-2 bg-zinc-900/50 p-2 rounded border border-zinc-800/50 hover:border-zinc-700">
                                <Checkbox 
                                   id={`perm_${key}`} 
                                   name={`perm_${key}`} 
                                   defaultChecked={editingRole.permissions?.includes(key)} 
                                />
                                <label
                                   htmlFor={`perm_${key}`}
                                   className="text-xs text-zinc-300 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                                >
                                   {label}
                                </label>
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-zinc-900">
                       <Button type="button" variant="ghost" onClick={() => setEditingRole(null)}>Cancel</Button>
                       <Button type="submit" className="bg-[#ea580c] hover:bg-[#c2410c]">
                          <Save className="w-4 h-4 mr-2" /> Save Role Definition
                       </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
               <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-lg p-12 text-zinc-600">
                  <Shield className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm uppercase tracking-widest font-bold">Select a role to edit</p>
                  <p className="text-xs">or create a new permission set</p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}