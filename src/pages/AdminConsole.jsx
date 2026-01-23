import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, Lock, CheckCircle, Clock, Radio, TestTube, Plus, FileText, Activity, Settings, Search, UserCog, Save, ChevronLeft, Trash2, Zap, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import RoleManager from "@/components/auth/RoleManager";
import SystemChecklist from "@/components/admin/SystemChecklist";
import EventApprovalQueue from "@/components/admin/EventApprovalQueue";
import CommsCapabilityContract from "@/components/comms/CommsCapabilityContract";
import CommsArray from "@/components/admin/CommsArray";
import VoiceNetForm from "@/components/comms/VoiceNetForm";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import UserManagement from "@/components/admin/UserManagement";
import SystemHealthMonitor from "@/components/admin/SystemHealthMonitor";
import SquadManagement from "@/components/admin/SquadManagement";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tabs as InnerTabs, TabsContent as InnerTabsContent, TabsList as InnerTabsList, TabsTrigger as InnerTabsTrigger } from "@/components/ui/tabs";
import { hasMinRank } from "@/components/permissions";
import { PERMISSIONS, PERMISSION_LABELS } from "@/components/auth/permissionConstants";
import PageShell from "@/components/layout/PageShell";
import AnomalyDetectionPanel from "@/components/ai/AnomalyDetectionPanel";
import SituationalAwarenessPanel from "@/components/ai/SituationalAwarenessPanel";
import NetConfigurationAssistant from "@/components/ai/NetConfigurationAssistant";
import RankRoleManagement from "@/components/admin/RankRoleManagement";
import EventReportingDashboard from "@/components/events/EventReportingDashboard";
import RolePermissionMatrix from "@/components/admin/RolePermissionMatrix";
import AdminDevTools from "@/components/admin/AdminDevTools";
import SchemaContractCheck from "@/components/admin/SchemaContractCheck";
import UserProfileCard from "@/components/admin/UserProfileCard";

export default function AdminConsolePage({ initialTab = "approvals" }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [search, setSearch] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [editingRole, setEditingRole] = React.useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Admin-gated queries
  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isAdmin
  });

  // User mutations
  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success("User updated");
    }
  });

  // Role mutations
  const createRoleMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success("Role created");
      setEditingRole(null);
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success("Role updated");
      setEditingRole(null);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success("Role deleted");
    }
  });

  // Access denied check
  if (currentUser && !isAdmin) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-red-900 mx-auto opacity-50" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-800">Access Denied</h1>
          <p className="text-xs font-mono text-zinc-500">ADMIN CLEARANCE REQUIRED</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase().includes(search.toLowerCase())) ||
    (u.rsi_handle?.toLowerCase().includes(search.toLowerCase())) ||
    (u.callsign?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleRoleToggle = (roleId) => {
    if (!selectedUser) return;
    const currentRoles = selectedUser.assigned_role_ids || [];
    let newRoles;
    if (currentRoles.includes(roleId)) {
      newRoles = currentRoles.filter(id => id !== roleId);
    } else {
      newRoles = [...currentRoles, roleId];
    }
    
    setSelectedUser({ ...selectedUser, assigned_role_ids: newRoles });
    updateUserMutation.mutate({ 
      id: selectedUser.id, 
      data: { assigned_role_ids: newRoles } 
    });
  };

  const handleRankChange = (newRank) => {
    if (!selectedUser) return;
    setSelectedUser({ ...selectedUser, rank: newRank });
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: { rank: newRank }
    });
  };

  const handleFieldChange = (field, value) => {
    if (!selectedUser) return;
    setSelectedUser({ ...selectedUser, [field]: value });
    updateUserMutation.mutate({
      id: selectedUser.id,
      data: { [field]: value }
    });
  };

  const handleSaveRole = (e) => {
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
      updateRoleMutation.mutate({ id: editingRole.id, data: roleData });
    } else {
      createRoleMutation.mutate(roleData);
    }
  };

  return (
    <PageShell
      title="System Administration"
      subtitle="CONTROL PANEL"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-6 py-6 space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 h-auto w-full justify-start">
          <TabsTrigger 
            value="approvals"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Clock className="w-4 h-4 mr-2" /> APPROVALS
          </TabsTrigger>
          <TabsTrigger 
            value="checklist"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> CHECKLIST
          </TabsTrigger>
          <TabsTrigger 
            value="users"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Users className="w-4 h-4 mr-2" /> USER MGMT
          </TabsTrigger>
          <TabsTrigger 
            value="comms-array"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Radio className="w-4 h-4 mr-2" /> COMMS ARRAY
          </TabsTrigger>
          <TabsTrigger 
            value="health"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Activity className="w-4 h-4 mr-2" /> HEALTH
          </TabsTrigger>
          <TabsTrigger 
            value="schema-contract"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Database className="w-4 h-4 mr-2" /> SCHEMA CONTRACT
          </TabsTrigger>
          <TabsTrigger 
            value="squads"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Users className="w-4 h-4 mr-2" /> SQUADS
          </TabsTrigger>
          {currentUser && hasMinRank(currentUser, 'Scout') && (
            <TabsTrigger 
              value="create-net"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
            >
              <Plus className="w-4 h-4 mr-2" /> NEW NET
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="audit-logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <FileText className="w-4 h-4 mr-2" /> LOGS
          </TabsTrigger>
          <TabsTrigger 
            value="ai-ops"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Activity className="w-4 h-4 mr-2" /> AI OPS
          </TabsTrigger>
          <TabsTrigger 
            value="event-reporting"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <FileText className="w-4 h-4 mr-2" /> EVENT ANALYTICS
          </TabsTrigger>
          <TabsTrigger 
            value="dev-tools"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
          >
            <Zap className="w-4 h-4 mr-2" /> DEV TOOLS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals">
          {currentUser && <EventApprovalQueue user={currentUser} />}
        </TabsContent>

        <TabsContent value="checklist">
          {currentUser && <SystemChecklist user={currentUser} />}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <InnerTabs defaultValue="operatives" className="w-full">
            <InnerTabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 h-auto w-full justify-start">
             <InnerTabsTrigger 
               value="operatives"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-4 py-2 text-zinc-400 font-mono uppercase text-xs"
             >
               OPERATIVES
             </InnerTabsTrigger>
             <InnerTabsTrigger 
               value="roles"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-4 py-2 text-zinc-400 font-mono uppercase text-xs"
             >
               ROLE DEFINITIONS
             </InnerTabsTrigger>
             <InnerTabsTrigger 
               value="ranks"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-4 py-2 text-zinc-400 font-mono uppercase text-xs"
             >
               RANK MANAGEMENT
             </InnerTabsTrigger>
             <InnerTabsTrigger 
               value="permissions"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-4 py-2 text-zinc-400 font-mono uppercase text-xs"
             >
               PERMISSIONS
             </InnerTabsTrigger>
            </InnerTabsList>

            <InnerTabsContent value="operatives">
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

                   <div className="bg-zinc-900/20 border border-zinc-800 rounded-md overflow-hidden min-h-0 h-80 overflow-y-auto">
                     {filteredUsers.sort((a, b) => (a.callsign || "Operative").localeCompare(b.callsign || "Operative")).map(user => (
                       <div 
                         key={user.id}
                         onClick={() => setSelectedUser(user)}
                         className={`p-3 border-b border-zinc-800/50 cursor-pointer hover:bg-zinc-900/50 transition-colors ${selectedUser?.id === user.id ? 'bg-zinc-900 border-l-4 border-l-[#ea580c]' : ''}`}
                       >
                         <div className="font-bold text-sm text-zinc-200">{user.callsign}</div>
                         <div className="text-[10px] font-mono text-zinc-500 flex gap-2 mt-1">
                           {(isAdmin || currentUser?.callsign === user.callsign) && user.email && (
                             <>
                               <span className="text-zinc-400">{user.email}</span>
                               <span>•</span>
                             </>
                           )}
                           <span>{user.rank}</span>
                           <span>•</span>
                           <span className="text-zinc-400">{(user.assigned_role_ids?.length || 0)} Roles</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 {/* User Profile Card */}
                 <div className="lg:col-span-2">
                   {selectedUser ? (
                     <UserProfileCard 
                       user={selectedUser}
                       roles={roles}
                       onRoleToggle={handleRoleToggle}
                       isAdmin={isAdmin}
                       currentUser={currentUser}
                     />
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                       <UserCog className="w-16 h-16 mb-4 opacity-20" />
                       <p className="text-sm uppercase tracking-widest">Select an operative</p>
                     </div>
                   )}
                 </div>
               </div>
            </InnerTabsContent>

            <InnerTabsContent value="roles">
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
                               onClick={(e) => { e.stopPropagation(); if(confirm('Delete role?')) deleteRoleMutation.mutate(role.id); }}
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
                         <form onSubmit={handleSaveRole} className="space-y-6">
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
                       <Button onClick={() => setEditingRole({ permissions: [] })} className="mt-4 bg-[#ea580c] hover:bg-[#c2410c]">
                         <Plus className="w-4 h-4 mr-2" /> New Role
                       </Button>
                     </div>
                   )}
                 </div>
               </div>
            </InnerTabsContent>

            <InnerTabsContent value="ranks">
             <RankRoleManagement />
            </InnerTabsContent>

            <InnerTabsContent value="permissions">
             <RolePermissionMatrix />
            </InnerTabsContent>
            </InnerTabs>
            </TabsContent>

            <TabsContent value="comms-array">
          <CommsArray />
        </TabsContent>

        <TabsContent value="health">
          <SystemHealthMonitor />
        </TabsContent>

        <TabsContent value="schema-contract">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle>Schema Contract Validation</CardTitle>
              <CardDescription className="text-zinc-400">Detect field drift across core entities in real-time</CardDescription>
            </CardHeader>
            <CardContent>
              <SchemaContractCheck />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="squads">
          <SquadManagement />
        </TabsContent>

        {currentUser && hasMinRank(currentUser, 'Scout') && (
          <TabsContent value="create-net">
            <VoiceNetForm />
          </TabsContent>
        )}

        <TabsContent value="audit-logs">
          <AuditLogViewer />
        </TabsContent>

        <TabsContent value="ai-ops">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnomalyDetectionPanel timeWindowMinutes={30} />
              <SituationalAwarenessPanel timeWindowMinutes={15} />
            </div>
            <NetConfigurationAssistant eventId={null} />
          </div>
        </TabsContent>

        <TabsContent value="event-reporting">
          <EventReportingDashboard timeRange="30d" />
        </TabsContent>

        <TabsContent value="dev-tools">
          <AdminDevTools />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}