import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Users, Edit, Lock } from "lucide-react";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function UserEditDialog({ user, trigger, isAdmin, existingPioneer }) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [pioneerError, setPioneerError] = useState(null);
  const [validatingPioneer, setValidatingPioneer] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user) {
      setEditData({
        rank: user.rank || 'Vagrant',
        voyager_number: user.voyager_number || null,
        role_tags: user.role_tags || [],
        assigned_role_ids: user.assigned_role_ids || [],
        is_shaman: user.is_shaman || false,
        is_system_administrator: user.is_system_administrator || false
      });
    }
  }, [user]);

  const { data: allRoles = [] } = useQuery({
    queryKey: ['all-roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isAdmin
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Validate rank change permission
      if (data.rank !== user.rank) {
        setValidatingPioneer(true);
        const permResponse = await base44.functions.invoke('validateRankChangePermission', {
          targetUserId: user.id,
          newRank: data.rank
        });
        setValidatingPioneer(false);

        if (!permResponse.data.permitted) {
          setPioneerError(permResponse.data.error);
          throw new Error(permResponse.data.error);
        }
      }

      // Validate Pioneer uniqueness before submit
      if (data.rank === 'Pioneer' && existingPioneer?.id !== user.id) {
        setValidatingPioneer(true);
        const response = await base44.functions.invoke('validatePioneerUniqueness', {
          userId: user.id,
          newRank: 'Pioneer'
        });
        setValidatingPioneer(false);

        if (!response.data.valid) {
          setPioneerError(response.data.error);
          throw new Error(response.data.error);
        }
      }

      // Validate Voyager Number uniqueness before submit
      if (data.rank === 'Voyager') {
        setValidatingPioneer(true);
        const response = await base44.functions.invoke('validateVoyagerNumber', {
          userId: user.id,
          newRank: 'Voyager',
          voyagerNumber: data.voyager_number
        });
        setValidatingPioneer(false);

        if (!response.data.valid) {
          setPioneerError(response.data.error);
          throw new Error(response.data.error);
        }
      }

      await base44.asServiceRole.entities.User.update(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User updated successfully');
      setPioneerError(null);
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setPioneerError(null);
    updateMutation.mutate(editData);
  };

  const handleRankChange = (newRank) => {
    setPioneerError(null);
    setEditData({ ...editData, rank: newRank });
  };

  const availableTags = ['MEDIC', 'PILOT', 'ENGINEER', 'GUNNER', 'LEAD', 'RESCUE', 'RANGER', 'LOGISTICS'];

  const toggleRoleTag = (tag) => {
    const tags = editData.role_tags || [];
    if (tags.includes(tag)) {
      setEditData({ ...editData, role_tags: tags.filter(t => t !== tag) });
    } else {
      setEditData({ ...editData, role_tags: [...tags, tag] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white uppercase tracking-wide">
            Edit User Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Full Name</Label>
              <Input value={user?.full_name || ''} disabled className="bg-zinc-900 border-zinc-800 text-zinc-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase">Email</Label>
              <Input value={user?.email || ''} disabled className="bg-zinc-900 border-zinc-800 text-zinc-500" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-[#ea580c] uppercase font-bold">Rank / Clearance</Label>
            <Select value={editData.rank || 'Vagrant'} onValueChange={handleRankChange}>
              <SelectTrigger className={`bg-zinc-900 border-zinc-800 ${editData.rank === 'Pioneer' && existingPioneer?.id !== user.id && existingPioneer ? 'border-red-700' : ''}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vagrant">Vagrant</SelectItem>
                <SelectItem value="Scout">Scout</SelectItem>
                <SelectItem value="Voyager">Voyager</SelectItem>
                <SelectItem value="Founder">Founder</SelectItem>
                <SelectItem value="Pioneer" disabled={existingPioneer?.id !== user.id && !!existingPioneer}>
                  Pioneer {existingPioneer?.id !== user.id && existingPioneer && `(assigned to ${existingPioneer.callsign || existingPioneer.email})`}
                </SelectItem>
              </SelectContent>
            </Select>
            {pioneerError && (
              <div className="text-xs text-red-500 bg-red-950/20 border border-red-900/50 rounded p-2">
                {pioneerError}
              </div>
            )}
          </div>

          {editData.rank === 'Voyager' && (
            <div className="space-y-2">
              <Label className="text-xs text-[#ea580c] uppercase font-bold">Voyager Number</Label>
              <Input
                type="number"
                min="1"
                max="99"
                placeholder="01-99"
                value={editData.voyager_number || ''}
                onChange={(e) => {
                  setPioneerError(null);
                  setEditData({ ...editData, voyager_number: e.target.value ? parseInt(e.target.value) : null });
                }}
                className="bg-zinc-900 border-zinc-800"
              />
              <div className="text-xs text-zinc-500 italic">
                Unique two-digit identifier (01-99). Required for Voyager rank.
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase">System Administrator</Label>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editData.is_system_administrator || false}
                onChange={(e) => setEditData({ ...editData, is_system_administrator: e.target.checked })}
                className="w-4 h-4 cursor-pointer"
              />
              <Label className="text-xs text-zinc-400 cursor-pointer">
                Grant System Administrator privileges (independent from rank)
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase">Assigned Roles</Label>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 max-h-[200px] overflow-y-auto space-y-2">
              {allRoles.length === 0 ? (
                <div className="text-xs text-zinc-600 italic text-center py-4">
                  No roles available. Create roles first in Role Management.
                </div>
              ) : (
                allRoles.map(role => (
                  <div
                    key={role.id}
                    className={cn(
                      "p-2 rounded border cursor-pointer transition-colors",
                      editData.assigned_role_ids?.includes(role.id)
                        ? "bg-[#ea580c] border-[#ea580c] text-white"
                        : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                    )}
                    onClick={() => {
                      const roleIds = editData.assigned_role_ids || [];
                      if (roleIds.includes(role.id)) {
                        setEditData({ ...editData, assigned_role_ids: roleIds.filter(id => id !== role.id) });
                      } else {
                        setEditData({ ...editData, assigned_role_ids: [...roleIds, role.id] });
                      }
                    }}
                  >
                    <div className="font-bold text-sm">{role.name}</div>
                    {role.description && (
                      <div className="text-xs opacity-80">{role.description}</div>
                    )}
                    <div className="text-[10px] mt-1 opacity-60">
                      {role.permissions?.length || 0} permissions
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-zinc-400 uppercase">Role Tags</Label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={cn(
                    "cursor-pointer transition-colors",
                    editData.role_tags?.includes(tag)
                      ? "bg-[#ea580c] border-[#ea580c] text-white"
                      : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                  )}
                  onClick={() => toggleRoleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending || validatingPioneer} 
              className="bg-[#ea580c] hover:bg-[#c2410c]"
            >
              {updateMutation.isPending || validatingPioneer ? 'Validating...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        allUsers.map(async (user) => {
          if (user.assigned_role_ids && user.assigned_role_ids.length > 0) {
            const roles = await Promise.all(
              user.assigned_role_ids.map(roleId => 
                base44.entities.Role.get(roleId).catch(() => null)
              )
            );
            return { ...user, assigned_roles: roles.filter(Boolean) };
          }
          return { ...user, assigned_roles: [] };
        })
      );
      
      return usersWithRoles;
    },
    enabled: isAdmin
  });

  // Find current Pioneer
  const existingPioneer = users.find(u => u.rank === 'Pioneer');

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-red-900 mx-auto opacity-50" />
          <h1 className="text-lg font-black uppercase tracking-widest text-red-800">Access Denied</h1>
          <p className="text-xs font-mono text-zinc-500">ADMIN CLEARANCE REQUIRED</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.callsign?.toLowerCase().includes(query) ||
      user.rsi_handle?.toLowerCase().includes(query);

    const matchesRank = rankFilter === 'all' || user.rank === rankFilter;

    return matchesSearch && matchesRank;
  });

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Users className="w-5 h-5 text-[#ea580c]" />
            User Management
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            View and manage all system users, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input
                placeholder="Search by name, email, callsign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border-zinc-800 pl-9 text-sm"
              />
            </div>

            <Select value={rankFilter || "all"} onValueChange={setRankFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Filter by Rank" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranks</SelectItem>
                <SelectItem value="Pioneer">Pioneer</SelectItem>
                <SelectItem value="Founder">Founder</SelectItem>
                <SelectItem value="Voyager">Voyager</SelectItem>
                <SelectItem value="Scout">Scout</SelectItem>
                <SelectItem value="Vagrant">Vagrant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-zinc-500 font-mono mb-3">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              Loading users...
            </CardContent>
          </Card>
        ) : filteredUsers.length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              No users found
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.id} className="bg-zinc-950 border-zinc-800 hover:border-[#ea580c]/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <div className="text-white font-bold">
                          {user.callsign || user.rsi_handle || user.full_name}
                        </div>
                        <div className="text-xs text-zinc-500 font-mono">{user.email}</div>
                      </div>
                      {user.role === 'admin' && (
                        <Badge variant="destructive" className="text-[10px]">ADMIN</Badge>
                      )}
                      {user.is_shaman && (
                        <Badge className="bg-yellow-900 text-yellow-400 text-[10px]">SHAMAN</Badge>
                      )}
                      {user.is_system_administrator && (
                        <Badge className="bg-purple-900 text-purple-400 text-[10px]">SYS ADMIN</Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className={cn("text-[10px] uppercase", getRankColorClass(user.rank, 'bg'))}>
                          {user.rank || 'Vagrant'}
                        </Badge>
                        
                        {user.role_tags && user.role_tags.length > 0 && (
                          <div className="flex gap-1">
                            {user.role_tags.map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {user.assigned_roles && user.assigned_roles.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {user.assigned_roles.map((role, idx) => (
                            <Badge key={idx} className="text-[9px] bg-[#ea580c]/20 text-[#ea580c] border-[#ea580c]/50">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <UserEditDialog
                    user={user}
                    isAdmin={isAdmin}
                    existingPioneer={existingPioneer}
                    trigger={
                      <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-[#ea580c]">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}