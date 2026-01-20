import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Trash2, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PERMISSIONS, PERMISSION_CATEGORIES } from "@/components/auth/permissionsList";
import { Checkbox } from "@/components/ui/checkbox";

function RoleDialog({ role, trigger, mode = 'create' }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    is_system: false
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (role && mode === 'edit') {
      setFormData({
        name: role.name || '',
        description: role.description || '',
        permissions: role.permissions || [],
        is_system: role.is_system || false
      });
    } else if (mode === 'create') {
      setFormData({
        name: '',
        description: '',
        permissions: [],
        is_system: false
      });
    }
  }, [role, mode, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role created successfully');
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to create role: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.Role.update(role.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role updated successfully');
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update role: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (mode === 'create') {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate(formData);
    }
  };

  const togglePermission = (permission) => {
    const permissions = formData.permissions || [];
    if (permissions.includes(permission)) {
      setFormData({ ...formData, permissions: permissions.filter(p => p !== permission) });
    } else {
      setFormData({ ...formData, permissions: [...permissions, permission] });
    }
  };

  const toggleCategory = (category) => {
    const categoryPerms = PERMISSION_CATEGORIES[category];
    const currentPerms = formData.permissions || [];
    const allSelected = categoryPerms.every(p => currentPerms.includes(p));
    
    if (allSelected) {
      setFormData({ 
        ...formData, 
        permissions: currentPerms.filter(p => !categoryPerms.includes(p)) 
      });
    } else {
      const newPerms = new Set([...currentPerms, ...categoryPerms]);
      setFormData({ ...formData, permissions: Array.from(newPerms) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white uppercase tracking-wide">
            {mode === 'create' ? 'Create New Role' : 'Edit Role'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-[#ea580c] uppercase font-bold">Role Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Event Manager, Moderator..."
                className="bg-zinc-900 border-zinc-800"
                required
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What can this role do?"
                className="bg-zinc-900 border-zinc-800 min-h-[80px]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-xs text-zinc-400 uppercase">Permissions</Label>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                const allSelected = perms.every(p => formData.permissions?.includes(p));
                const someSelected = perms.some(p => formData.permissions?.includes(p));
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleCategory(category)}
                        className={someSelected && !allSelected ? "bg-zinc-700" : ""}
                      />
                      <Label className="text-sm font-bold text-white cursor-pointer" onClick={() => toggleCategory(category)}>
                        {category}
                      </Label>
                      <Badge variant="outline" className="text-[9px] ml-auto">
                        {perms.filter(p => formData.permissions?.includes(p)).length}/{perms.length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-6">
                      {perms.map(perm => (
                        <div key={perm} className="flex items-center gap-2">
                          <Checkbox
                            checked={formData.permissions?.includes(perm)}
                            onCheckedChange={() => togglePermission(perm)}
                          />
                          <Label className="text-xs text-zinc-400 cursor-pointer" onClick={() => togglePermission(perm)}>
                            {PERMISSIONS[perm]}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-zinc-500">
              Selected: {formData.permissions?.length || 0} permissions
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-[#ea580c] hover:bg-[#c2410c]"
            >
              {mode === 'create' ? 'Create Role' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RoleManager() {
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId) => base44.asServiceRole.entities.Role.delete(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Role deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete role: ' + error.message);
    }
  });

  const handleDelete = (role) => {
    if (role.is_system) {
      toast.error('Cannot delete system roles');
      return;
    }
    if (confirm(`Are you sure you want to delete "${role.name}"?`)) {
      deleteMutation.mutate(role.id);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#ea580c]" />
                Role Management
              </CardTitle>
              <CardDescription className="text-xs font-mono text-zinc-600">
                Create and manage custom roles with granular permissions
              </CardDescription>
            </div>
            <RoleDialog
              mode="create"
              trigger={
                <Button className="bg-[#ea580c] hover:bg-[#c2410c]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-xs text-zinc-500 font-mono">
            {roles.length} role(s) configured
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              Loading roles...
            </CardContent>
          </Card>
        ) : roles.length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              No roles configured. Create your first role to get started.
            </CardContent>
          </Card>
        ) : (
          roles.map((role) => (
            <Card key={role.id} className="bg-zinc-950 border-zinc-800 hover:border-[#ea580c]/50 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-bold">{role.name}</div>
                        {role.is_system && (
                          <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">
                            SYSTEM
                          </Badge>
                        )}
                      </div>
                      {role.description && (
                        <div className="text-xs text-zinc-500">{role.description}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <RoleDialog
                        role={role}
                        mode="edit"
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-[#ea580c]">
                            <Edit className="w-3 h-3" />
                          </Button>
                        }
                      />
                      {!role.is_system && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-zinc-500 hover:text-red-500"
                          onClick={() => handleDelete(role)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wider">
                      Permissions ({role.permissions?.length || 0})
                    </div>
                    {role.permissions && role.permissions.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 6).map((perm, idx) => (
                          <Badge key={idx} variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">
                            {perm}
                          </Badge>
                        ))}
                        {role.permissions.length > 6 && (
                          <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-500">
                            +{role.permissions.length - 6} more
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-600 italic">No permissions assigned</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}