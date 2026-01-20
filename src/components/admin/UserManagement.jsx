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
import { Search, Users, Edit, Shield, Tag } from "lucide-react";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function UserEditDialog({ user, trigger }) {
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (user) {
      setEditData({
        rank: user.rank || 'Vagrant',
        role_tags: user.role_tags || [],
        is_shaman: user.is_shaman || false
      });
    }
  }, [user]);

  const { data: allRoles = [] } = useQuery({
    queryKey: ['all-roles'],
    queryFn: () => base44.entities.Role.list()
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.asServiceRole.entities.User.update(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User updated successfully');
      setOpen(false);
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(editData);
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
            <Select value={editData.rank} onValueChange={(v) => setEditData({ ...editData, rank: v })}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vagrant">Vagrant</SelectItem>
                <SelectItem value="Scout">Scout</SelectItem>
                <SelectItem value="Voyager">Voyager</SelectItem>
                <SelectItem value="Founder">Founder</SelectItem>
                <SelectItem value="Pioneer">Pioneer</SelectItem>
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={updateMutation.isPending} className="bg-[#ea580c] hover:bg-[#c2410c]">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);
      return allUsers;
    }
  });

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

            <Select value={rankFilter} onValueChange={setRankFilter}>
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
                    </div>

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
                  </div>

                  <UserEditDialog
                    user={user}
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