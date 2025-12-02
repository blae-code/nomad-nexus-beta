import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Shield, UserCog, Save, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/components/auth/useUserPermissions";
import { createPageUrl } from "@/utils";

export default function UserManagerPage() {
  const { isAdmin, isLoading: authLoading } = useUserPermissions();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['users-manage'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users-manage']);
      toast.success("User updated");
    }
  });

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase().includes(search.toLowerCase())) ||
    (u.rsi_handle?.toLowerCase().includes(search.toLowerCase())) ||
    (u.callsign?.toLowerCase().includes(search.toLowerCase()))
  );

  if (authLoading) return <div className="p-10 text-zinc-500">Verifying clearance...</div>;
  if (!isAdmin) return <div className="p-10 text-red-500 font-bold">ACCESS DENIED: INSUFFICIENT CLEARANCE</div>;

  const handleRoleToggle = (roleId) => {
    if (!selectedUser) return;
    const currentRoles = selectedUser.assigned_role_ids || [];
    let newRoles;
    if (currentRoles.includes(roleId)) {
      newRoles = currentRoles.filter(id => id !== roleId);
    } else {
      newRoles = [...currentRoles, roleId];
    }
    
    // Optimistic update for UI
    setSelectedUser({ ...selectedUser, assigned_role_ids: newRoles });
    updateUserMutation.mutate({ 
       id: selectedUser.id, 
       data: { assigned_role_ids: newRoles } 
    });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="icon" onClick={() => window.location.href = createPageUrl('RoleManager')}>
                <ChevronLeft className="w-6 h-6 text-zinc-500" />
             </Button>
             <div className="flex flex-col">
                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">User Management</h1>
                <p className="text-zinc-500 font-mono text-xs tracking-widest">ASSIGNMENTS // CLEARANCE</p>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-1 space-y-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input 
                   placeholder="Search operatives..." 
                   className="bg-zinc-900 border-zinc-800 pl-9"
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                />
             </div>
             
             <div className="bg-zinc-900/20 border border-zinc-800 rounded-md overflow-hidden max-h-[70vh] overflow-y-auto">
               {filteredUsers.map(user => (
                  <div 
                     key={user.id}
                     onClick={() => setSelectedUser(user)}
                     className={`p-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedUser?.id === user.id ? 'bg-zinc-900 border-l-4 border-l-[#ea580c]' : ''}`}
                  >
                     <div className="font-bold text-sm text-zinc-200">{user.callsign || user.rsi_handle || user.full_name}</div>
                     <div className="text-[10px] font-mono text-zinc-500 flex gap-2 mt-1">
                        <span>{user.rank}</span>
                        <span>•</span>
                        <span className="text-zinc-400">{(user.assigned_role_ids?.length || 0)} Roles</span>
                     </div>
                  </div>
               ))}
             </div>
          </div>

          {/* User Details & Roles */}
          <div className="lg:col-span-2">
             {selectedUser ? (
               <Card className="bg-zinc-950 border-zinc-800">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       <UserCog className="w-5 h-5 text-[#ea580c]" />
                       <span className="uppercase">{selectedUser.callsign || selectedUser.rsi_handle}</span>
                    </CardTitle>
                    <div className="text-xs font-mono text-zinc-500">{selectedUser.email}</div>
                 </CardHeader>
                 <CardContent>
                    <div className="mb-6">
                       <h3 className="text-xs font-bold uppercase text-zinc-500 mb-3">Assign Roles</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {roles.map(role => {
                             const isAssigned = selectedUser.assigned_role_ids?.includes(role.id);
                             return (
                                <div 
                                   key={role.id}
                                   onClick={() => handleRoleToggle(role.id)}
                                   className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between ${isAssigned ? 'bg-[#ea580c]/10 border-[#ea580c] text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                >
                                   <div>
                                      <div className="font-bold text-sm">{role.name}</div>
                                      <div className="text-[10px] opacity-70">{role.description}</div>
                                   </div>
                                   {isAssigned && <Shield className="w-4 h-4 text-[#ea580c]" />}
                                </div>
                             );
                          })}
                       </div>
                    </div>
                 </CardContent>
               </Card>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                  <UserCog className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm uppercase tracking-widest">Select an operative</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}