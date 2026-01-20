import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, Shield, UserPlus, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LUCIDE_ICONS = ['Sword', 'Heart', 'Zap', 'Target', 'Shield', 'Rocket', 'Star', 'Flame'];

function SquadDialog({ squad, trigger, mode = 'create' }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'Shield',
    hierarchy_level: 'squad',
    parent_id: null,
    is_invite_only: false,
    requirements: ''
  });
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (squad && mode === 'edit') {
      setFormData({
        name: squad.name || '',
        description: squad.description || '',
        icon: squad.icon || 'Shield',
        hierarchy_level: squad.hierarchy_level || 'squad',
        parent_id: squad.parent_id || null,
        is_invite_only: squad.is_invite_only || false,
        requirements: squad.requirements || ''
      });
    }
  }, [squad, mode, open]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.Squad.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      toast.success('Squad created successfully');
      setOpen(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.asServiceRole.entities.Squad.update(squad.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      toast.success('Squad updated successfully');
      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white uppercase tracking-wide">
            {mode === 'create' ? 'Create Squad' : 'Edit Squad'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-[#ea580c] uppercase font-bold">Squad Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Red Rangers, Alpha Wing..."
                className="bg-zinc-900 border-zinc-800"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Icon</Label>
              <Select value={formData.icon || 'Shield'} onValueChange={(v) => setFormData({ ...formData, icon: v })}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LUCIDE_ICONS.filter(icon => icon && String(icon).trim()).map(icon => (
                    <SelectItem key={icon} value={String(icon).trim()}>{icon}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Hierarchy Level</Label>
              <Select value={formData.hierarchy_level || 'squad'} onValueChange={(v) => setFormData({ ...formData, hierarchy_level: v })}>
                <SelectTrigger className="bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fleet">Fleet</SelectItem>
                  <SelectItem value="wing">Wing</SelectItem>
                  <SelectItem value="squad">Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the squad's purpose..."
                className="bg-zinc-900 border-zinc-800 min-h-[80px]"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Requirements</Label>
              <Input
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="e.g., Scout rank or higher"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="invite_only"
                checked={formData.is_invite_only}
                onChange={(e) => setFormData({ ...formData, is_invite_only: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="invite_only" className="text-xs text-zinc-400 cursor-pointer">
                Invite Only (requires approval to join)
              </Label>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#ea580c] hover:bg-[#c2410c]">
              {mode === 'create' ? 'Create Squad' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SquadMembersDialog({ squad, trigger }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: memberships = [] } = useQuery({
    queryKey: ['squad-memberships', squad.id],
    queryFn: () => base44.entities.SquadMembership.filter({ squad_id: squad.id, status: 'active' }),
    enabled: !!squad.id && open
  });

  const { data: members = [] } = useQuery({
    queryKey: ['squad-members', memberships.map(m => m.user_id).join(',')],
    queryFn: async () => {
      if (memberships.length === 0) return [];
      const users = await Promise.all(
        memberships.map(m => base44.entities.User.get(m.user_id).catch(() => null))
      );
      return users.filter(Boolean).map((user, idx) => ({
        ...user,
        membership: memberships[idx]
      }));
    },
    enabled: memberships.length > 0
  });

  const removeMutation = useMutation({
    mutationFn: (membershipId) => base44.asServiceRole.entities.SquadMembership.delete(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-memberships'] });
      toast.success('Member removed');
    }
  });

  const toggleLeaderMutation = useMutation({
    mutationFn: ({ membershipId, newRole }) => 
      base44.asServiceRole.entities.SquadMembership.update(membershipId, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squad-memberships'] });
      toast.success('Role updated');
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white uppercase tracking-wide">
            {squad.name} - Members
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {members.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No members in this squad yet
            </div>
          ) : (
            members.map((member) => (
              <Card key={member.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">
                        {member.callsign || member.rsi_handle || member.full_name}
                      </div>
                      <div className="text-xs text-zinc-500">{member.email}</div>
                      <Badge className="text-[9px] mt-1" variant={member.membership.role === 'leader' ? 'default' : 'outline'}>
                        {member.membership.role}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleLeaderMutation.mutate({
                          membershipId: member.membership.id,
                          newRole: member.membership.role === 'leader' ? 'member' : 'leader'
                        })}
                        className="text-xs"
                      >
                        {member.membership.role === 'leader' ? 'Demote' : 'Promote'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeMutation.mutate(member.membership.id)}
                        className="text-xs text-red-500 hover:text-red-400"
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SquadManagement() {
  const queryClient = useQueryClient();

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (squadId) => base44.asServiceRole.entities.Squad.delete(squadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['squads'] });
      toast.success('Squad deleted successfully');
    }
  });

  const handleDelete = (squad) => {
    if (confirm(`Are you sure you want to delete "${squad.name}"?`)) {
      deleteMutation.mutate(squad.id);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ea580c]" />
                Squad Management
              </CardTitle>
              <CardDescription className="text-xs font-mono text-zinc-600">
                Create and manage organizational squads, wings, and fleets
              </CardDescription>
            </div>
            <SquadDialog
              mode="create"
              trigger={
                <Button className="bg-[#ea580c] hover:bg-[#c2410c]">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Squad
                </Button>
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-xs text-zinc-500 font-mono">
            {squads.length} squad(s) configured
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              Loading squads...
            </CardContent>
          </Card>
        ) : squads.length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              No squads configured
            </CardContent>
          </Card>
        ) : (
          squads.map((squad) => (
            <Card key={squad.id} className="bg-zinc-950 border-zinc-800 hover:border-[#ea580c]/50 transition-colors">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-white font-bold">{squad.name}</div>
                        <Badge variant="outline" className="text-[9px]">
                          {squad.hierarchy_level}
                        </Badge>
                        {squad.is_invite_only && (
                          <Badge className="text-[9px] bg-amber-900 text-amber-400">INVITE ONLY</Badge>
                        )}
                      </div>
                      {squad.description && (
                        <div className="text-xs text-zinc-500">{squad.description}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <SquadMembersDialog
                        squad={squad}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-blue-500">
                            <Users className="w-3 h-3" />
                          </Button>
                        }
                      />
                      <SquadDialog
                        squad={squad}
                        mode="edit"
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-[#ea580c]">
                            <Edit className="w-3 h-3" />
                          </Button>
                        }
                      />
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-zinc-500 hover:text-red-500"
                        onClick={() => handleDelete(squad)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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