import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Crown, Star, Lock, AlertCircle, CheckCircle, Users, Search, RefreshCw } from "lucide-react";
import { getRankColorClass } from "@/components/utils/rankUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RankRoleManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isSystemAdmin = currentUser?.is_system_administrator;
  const isPioneer = currentUser?.rank === 'Pioneer';

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['rank-role-users'],
    queryFn: () => base44.asServiceRole.entities.User.list('-created_date', 500),
    enabled: !!currentUser && (isSystemAdmin || isPioneer),
    refetchInterval: 10000
  });

  // Real-time subscription for user changes
  useEffect(() => {
    if (!currentUser || (!isSystemAdmin && !isPioneer)) return;

    const unsubscribe = base44.entities.User.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['rank-role-users'] });
    });

    return unsubscribe;
  }, [currentUser, isSystemAdmin, isPioneer, queryClient]);

  const { data: roles = [] } = useQuery({
    queryKey: ['rank-role-roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isSystemAdmin || isPioneer
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      await base44.asServiceRole.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rank-role-users'] });
      toast.success("User updated");
      setSelectedUser(null);
    }
  });

  if (!isSystemAdmin && !isPioneer) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-red-900 mx-auto opacity-50" />
          <h1 className="text-lg font-black uppercase tracking-widest text-red-800">Access Denied</h1>
          <p className="text-xs font-mono text-zinc-500">SYSTEM ADMIN OR PIONEER CLEARANCE REQUIRED</p>
        </div>
      </div>
    );
  }

  const currentPioneer = users.find(u => u.rank === 'Pioneer');
  const voyagers = users.filter(u => u.rank === 'Voyager');
  const sysAdmins = users.filter(u => u.is_system_administrator);

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      u.callsign?.toLowerCase().includes(query) ||
      u.rsi_handle?.toLowerCase().includes(query) ||
      u.id?.toLowerCase().includes(query)
    );
  });

  const handleRankChange = async (userId, newRank, voyagerNumber = null) => {
    try {
      const data = { rank: newRank };
      if (newRank === 'Voyager' && voyagerNumber) {
        data.voyager_number = voyagerNumber;
      }
      await updateUserMutation.mutateAsync({ userId, data });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleToggleSystemAdmin = async (userId, currentStatus) => {
    await updateUserMutation.mutateAsync({
      userId,
      data: { is_system_administrator: !currentStatus }
    });
  };

  return (
    <div className="space-y-6">
      {/* Leadership Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-950/20 to-zinc-950 border-red-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-5 h-5 text-red-500" />
              <span className="text-xs uppercase font-bold text-red-500 tracking-wider">Pioneer</span>
            </div>
            <div className="space-y-1">
              {currentPioneer ? (
                <>
                  <div className="text-white font-bold">{currentPioneer.callsign || currentPioneer.rsi_handle || 'OPERATIVE'}</div>
                  <div className="text-xs text-zinc-500">ID: {currentPioneer.id.slice(0, 8)}</div>
                </>
              ) : (
                <div className="text-zinc-600 text-sm">Not Assigned</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-950/20 to-zinc-950 border-purple-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-purple-500" />
              <span className="text-xs uppercase font-bold text-purple-500 tracking-wider">System Admins</span>
            </div>
            <div className="text-2xl font-black text-white">{sysAdmins.length}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {sysAdmins.slice(0, 2).map(u => u.callsign || u.rsi_handle || 'OPERATIVE').join(', ')}
              {sysAdmins.length > 2 && ` +${sysAdmins.length - 2}`}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-950/20 to-zinc-950 border-teal-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-5 h-5 text-teal-500" />
              <span className="text-xs uppercase font-bold text-teal-500 tracking-wider">Voyagers</span>
            </div>
            <div className="text-2xl font-black text-white">{voyagers.length}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {voyagers.length > 0 ? `V-${voyagers.map(v => v.voyager_number).filter(Boolean).join(', V-')}` : 'None assigned'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {isSystemAdmin && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-900">
            <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  const user = prompt("Enter user callsign to designate as Pioneer:");
                  if (user) {
                    const foundUser = users.find(u => u.callsign === user || u.rsi_handle === user);
                    if (foundUser) {
                      handleRankChange(foundUser.id, 'Pioneer');
                    } else {
                      toast.error("User not found");
                    }
                  }
                }}
                className="bg-red-900/20 border border-red-900 text-red-500 hover:bg-red-900/30"
                disabled={!!currentPioneer}
              >
                <Crown className="w-4 h-4 mr-2" />
                Designate Pioneer
              </Button>
              <Button
                onClick={() => {
                  const user = prompt("Enter user callsign to grant System Admin:");
                  if (user) {
                    const foundUser = users.find(u => u.callsign === user || u.rsi_handle === user);
                    if (foundUser) {
                      handleToggleSystemAdmin(foundUser.id, foundUser.is_system_administrator);
                    } else {
                      toast.error("User not found");
                    }
                  }
                }}
                className="bg-purple-900/20 border border-purple-900 text-purple-500 hover:bg-purple-900/30"
              >
                <Shield className="w-4 h-4 mr-2" />
                Grant Sys Admin
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User List */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase font-bold tracking-wider text-zinc-400 flex items-center gap-2">
              User Directory
              <Badge variant="outline" className="text-[9px] font-mono text-zinc-600">
                {users.length} TOTAL
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => refetchUsers()}
                size="sm"
                variant="ghost"
                className="h-8 px-2 text-zinc-500 hover:text-[#ea580c]"
                disabled={usersLoading}
              >
                <RefreshCw className={cn("w-4 h-4", usersLoading && "animate-spin")} />
              </Button>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <Input
                  placeholder="Search callsign, RSI handle..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                <tr>
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider">User</th>
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Rank</th>
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Roles</th>
                  <th className="text-left p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Access</th>
                  <th className="text-right p-3 text-[10px] uppercase font-bold text-zinc-600 tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center">
                      <div className="text-sm text-zinc-600">Loading users...</div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center">
                      <Users className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
                      <div className="text-sm text-zinc-600">
                        {searchQuery ? 'No users match your search' : `No users found (Total loaded: ${users.length})`}
                      </div>
                    </td>
                  </tr>
                ) : null}
                {filteredUsers.map(user => (
                  <tr key={user.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          user.rank === 'Pioneer' && "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]",
                          user.is_system_administrator && "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]",
                          !user.rank || user.rank === 'Pioneer' || user.is_system_administrator || "bg-emerald-500"
                        )} />
                        <div>
                          <div className="text-sm text-white font-medium">{user.callsign || user.rsi_handle || 'OPERATIVE'}</div>
                          <div className="text-[10px] text-zinc-600 font-mono">ID: {user.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={cn("text-[9px] uppercase font-bold", getRankColorClass(user.rank, 'bg'))}>
                        {user.rank || 'Vagrant'}
                        {user.rank === 'Voyager' && user.voyager_number && ` #${user.voyager_number}`}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {user.assigned_role_ids?.length > 0 ? (
                          user.assigned_role_ids.slice(0, 2).map(roleId => {
                            const role = roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} variant="outline" className="text-[8px] border-zinc-700 text-zinc-400">
                                {role.name}
                              </Badge>
                            ) : null;
                          })
                        ) : (
                          <span className="text-[10px] text-zinc-700">None</span>
                        )}
                        {user.assigned_role_ids?.length > 2 && (
                          <Badge variant="outline" className="text-[8px] border-zinc-700 text-zinc-500">
                            +{user.assigned_role_ids.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {user.is_system_administrator && (
                          <Badge className="bg-purple-900/20 text-purple-500 border-purple-900 text-[8px]">
                            <Shield className="w-2 h-2 mr-1" />
                            SYS ADMIN
                          </Badge>
                        )}
                        {user.role === 'admin' && (
                          <Badge className="bg-red-900/20 text-red-500 border-red-900 text-[8px]">
                            ADMIN
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        onClick={() => setSelectedUser(user)}
                        size="sm"
                        variant="ghost"
                        className="text-zinc-500 hover:text-[#ea580c] h-7 text-xs"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Panel */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-zinc-950 border-zinc-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-zinc-900 sticky top-0 bg-zinc-950">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg uppercase font-bold tracking-wider">
                  {selectedUser.callsign || selectedUser.rsi_handle || 'OPERATIVE'}
                </CardTitle>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-zinc-600 hover:text-zinc-400 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-zinc-600 font-mono">ID: {selectedUser.id.slice(0, 12)}</div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Rank Management */}
              <div className="space-y-3">
                <h3 className="text-xs uppercase font-bold text-[#ea580c] tracking-wider flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Rank Assignment
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'].map(rank => {
                    const isCurrentRank = selectedUser.rank === rank;
                    const isPioneerRank = rank === 'Pioneer';
                    const isPioneerTaken = isPioneerRank && currentPioneer?.id !== selectedUser.id && currentPioneer;
                    const canAssign = isSystemAdmin || (isPioneer && rank !== 'Pioneer');

                    return (
                      <button
                        key={rank}
                        disabled={!canAssign || isPioneerTaken}
                        onClick={() => {
                          if (rank === 'Voyager') {
                            const num = prompt('Enter Voyager number (01-99):');
                            if (num) {
                              handleRankChange(selectedUser.id, rank, parseInt(num));
                            }
                          } else if (rank === 'Pioneer') {
                            if (confirm(`Designate ${selectedUser.callsign || selectedUser.rsi_handle || 'this user'} as Pioneer?`)) {
                              handleRankChange(selectedUser.id, rank);
                            }
                          } else {
                            handleRankChange(selectedUser.id, rank);
                          }
                        }}
                        className={cn(
                          "p-3 border text-left transition-all",
                          isCurrentRank && "border-[#ea580c] bg-[#ea580c]/10",
                          !isCurrentRank && !isPioneerTaken && canAssign && "border-zinc-800 hover:border-zinc-700",
                          isPioneerTaken && "opacity-50 cursor-not-allowed border-zinc-900"
                        )}
                      >
                        <div className={cn("text-sm font-bold", getRankColorClass(rank, 'text'))}>
                          {rank}
                        </div>
                        {isPioneerTaken && (
                          <div className="text-[9px] text-red-500 mt-1">Assigned</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Administrator */}
              {isSystemAdmin && (
                <div className="space-y-3">
                  <h3 className="text-xs uppercase font-bold text-purple-500 tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    System Administrator
                  </h3>
                  <button
                    onClick={() => handleToggleSystemAdmin(selectedUser.id, selectedUser.is_system_administrator)}
                    className={cn(
                      "w-full p-4 border text-left transition-all",
                      selectedUser.is_system_administrator 
                        ? "border-purple-500 bg-purple-900/20" 
                        : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">System Admin Privileges</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          Full system access, bypass rank restrictions
                        </div>
                      </div>
                      {selectedUser.is_system_administrator && (
                        <CheckCircle className="w-5 h-5 text-purple-500" />
                      )}
                    </div>
                  </button>
                </div>
              )}

              {/* Warnings */}
              {(selectedUser.rank === 'Pioneer' || selectedUser.is_system_administrator) && (
                <div className="border border-amber-900/50 bg-amber-950/20 p-3 rounded">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                    <div className="text-xs text-amber-500">
                      <div className="font-bold mb-1">High Privilege Account</div>
                      <div className="text-amber-600">
                        This user has elevated system privileges. Changes should be made with caution.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}