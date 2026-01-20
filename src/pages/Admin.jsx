import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, Lock, CheckCircle, Clock, Radio, TestTube, Plus, FileText } from "lucide-react";
import RoleManager from "@/components/auth/RoleManager";
import SystemChecklist from "@/components/admin/SystemChecklist";
import EventApprovalQueue from "@/components/admin/EventApprovalQueue";
import CommsCapabilityContract from "@/components/comms/CommsCapabilityContract";
import CommsTestPanel from "@/components/admin/CommsTestPanel";
import VoiceNetForm from "@/components/comms/VoiceNetForm";
import AuditLogViewer from "@/components/admin/AuditLogViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasMinRank } from "@/components/permissions";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [activeTab, setActiveTab] = React.useState("approvals");

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Admin access check
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black text-zinc-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="w-16 h-16 text-red-900 mx-auto opacity-50" />
          <h1 className="text-2xl font-black uppercase tracking-widest text-red-800">Access Denied</h1>
          <p className="text-xs font-mono text-zinc-500">ADMIN CLEARANCE REQUIRED</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-200 p-6 overflow-y-auto">
       <div className="max-w-7xl mx-auto space-y-8">
          <header className="flex items-center gap-4 pb-6 border-b border-zinc-800">
             <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#ea580c]" />
             </div>
             <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter text-white">System Administration</h1>
                <p className="text-zinc-500 font-mono text-xs tracking-widest">ACCESS CONTROL // USER MANAGEMENT // LOGS</p>
             </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
           <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 h-auto w-full justify-start">
             <TabsTrigger 
               value="approvals"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
             >
               <Clock className="w-4 h-4 mr-2" /> Event Approvals
             </TabsTrigger>
             <TabsTrigger 
               value="checklist"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
             >
               <CheckCircle className="w-4 h-4 mr-2" /> System Checklist
             </TabsTrigger>
             <TabsTrigger 
               value="roles"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
             >
               <Shield className="w-4 h-4 mr-2" /> Roles & Permissions
             </TabsTrigger>
             <TabsTrigger 
               value="users"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
             >
               <Users className="w-4 h-4 mr-2" /> User Assignment
             </TabsTrigger>
             <TabsTrigger 
               value="comms-diagnostics"
               className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
             >
               <Radio className="w-4 h-4 mr-2" /> Comms Diagnostics
             </TabsTrigger>
             <TabsTrigger 
                value="comms-provision"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
              >
                <TestTube className="w-4 h-4 mr-2" /> Provision & Test
              </TabsTrigger>
              {currentUser && hasMinRank(currentUser, 'Scout') && (
                <TabsTrigger 
                  value="create-net"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Voice Net
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="audit-logs"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#ea580c] data-[state=active]:bg-zinc-800/50 px-6 py-3 text-zinc-400 font-mono uppercase text-xs tracking-wider"
              >
                <FileText className="w-4 h-4 mr-2" /> Audit Logs
              </TabsTrigger>
              </TabsList>

           <TabsContent value="approvals">
              {currentUser && <EventApprovalQueue user={currentUser} />}
           </TabsContent>

           <TabsContent value="checklist">
              {currentUser && <SystemChecklist user={currentUser} />}
           </TabsContent>

           <TabsContent value="roles">
              <RoleManager />
           </TabsContent>

           <TabsContent value="users">
              <div className="p-12 text-center border border-zinc-800 border-dashed text-zinc-600 font-mono">
                 USER MANAGEMENT MODULE INITIALIZING...
                 <br/>
                 <span className="text-xs mt-2 block">(Use Role Manager to define roles first)</span>
              </div>
           </TabsContent>

           <TabsContent value="comms-diagnostics">
              <CommsCapabilityContract />
           </TabsContent>

           <TabsContent value="comms-provision">
              <CommsTestPanel />
           </TabsContent>

           {currentUser && hasMinRank(currentUser, 'Scout') && (
             <TabsContent value="create-net">
               <VoiceNetForm />
             </TabsContent>
           )}

           <TabsContent value="audit-logs">
             <AuditLogViewer />
           </TabsContent>
          </Tabs>
       </div>
    </div>
  );
}