import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AVAILABLE_PERMISSIONS = [
  { value: 'manage_events', label: 'Manage Events' },
  { value: 'manage_members', label: 'Manage Members' },
  { value: 'manage_resources', label: 'Manage Resources' },
  { value: 'manage_roles', label: 'Manage Roles' },
  { value: 'create_voice_nets', label: 'Create Voice Nets' },
  { value: 'manage_treasury', label: 'Manage Treasury' },
  { value: 'schedule_operations', label: 'Schedule Operations' },
  { value: 'view_reports', label: 'View Reports' }
];

export default function SquadRoleManager({ squadId }) {
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#71717a',
    permissions: [],
    is_leadership_role: false
  });

  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['squad-roles', squadId],
    queryFn: () => base44.entities.SquadRole.filter({ squad_id: squadId })
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.SquadRole.create({ ...data, squad_id: squadId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-roles', squadId] });
      resetForm();
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SquadRole.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-roles', squadId] });
      resetForm();
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.SquadRole.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['squad-roles', squadId] })
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      color: '#71717a',
      permissions: [],
      is_leadership_role: false
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingRole) {
      updateRoleMutation.mutate({ id: editingRole.id, data: formData });
    } else {
      createRoleMutation.mutate(formData);
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      color: role.color,
      permissions: role.permissions || [],
      is_leadership_role: role.is_leadership_role || false
    });
    setShowForm(true);
  };

  const togglePermission = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-zinc-200">CUSTOM ROLES</h3>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1 text-[7px]"
        >
          <Plus className="w-3 h-3" />
          New Role
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-zinc-800 bg-zinc-900/50 p-3 space-y-3"
        >
          <Input
            placeholder="Role name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="text-xs"
          />
          
          <Textarea
            placeholder="Description and responsibilities"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="text-xs h-16"
          />

          <div className="flex items-center gap-2">
            <label className="text-[7px] text-zinc-400">Role Color:</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-8 h-8 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={formData.is_leadership_role}
              onCheckedChange={(checked) => setFormData({ ...formData, is_leadership_role: checked })}
            />
            <label className="text-[7px] text-zinc-400">Leadership Role</label>
          </div>

          <div className="space-y-2">
            <label className="text-[7px] text-zinc-400 block">Permissions:</label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_PERMISSIONS.map(perm => (
                <div key={perm.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.permissions.includes(perm.value)}
                    onCheckedChange={() => togglePermission(perm.value)}
                  />
                  <label className="text-[7px] text-zinc-400 cursor-pointer">{perm.label}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} className="text-[7px]">
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm} className="text-[7px]">
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-2">
        {roles.map((role, idx) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="border border-zinc-800 bg-zinc-900/30 p-2 flex items-start justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-3 h-3"
                  style={{ backgroundColor: role.color }}
                />
                <span className="text-[8px] font-bold text-zinc-200">{role.name}</span>
                {role.is_leadership_role && (
                  <Badge className="text-[6px] bg-orange-900/50 text-orange-300 border-orange-900/50">LEAD</Badge>
                )}
              </div>
              {role.description && (
                <p className="text-[7px] text-zinc-400 line-clamp-2 mb-1">{role.description}</p>
              )}
              <div className="flex flex-wrap gap-1">
                {role.permissions?.slice(0, 3).map(perm => (
                  <Badge key={perm} className="text-[6px] bg-blue-900/30 text-blue-300 border-blue-900/30">
                    {perm.replace(/_/g, ' ')}
                  </Badge>
                ))}
                {role.permissions?.length > 3 && (
                  <Badge className="text-[6px] bg-zinc-800 text-zinc-400">+{role.permissions.length - 3}</Badge>
                )}
              </div>
            </div>

            <div className="flex gap-1 ml-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleEdit(role)}
                className="w-6 h-6"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteRoleMutation.mutate(role.id)}
                className="w-6 h-6 text-red-500 hover:text-red-600"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}