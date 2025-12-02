import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Users, Lock } from "lucide-react";
import RoleManager from "@/components/auth/RoleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminPage() {
  // In a real app, we'd check for ADMIN permission here and redirect if not authorized
  // For now, we rely on the UI being hidden/protected

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

          <Tabs defaultValue="roles" className="space-y-6">
            <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-0 h-auto w-full justify-start">
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
            </TabsList>

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
          </Tabs>
       </div>
    </div>
  );
}