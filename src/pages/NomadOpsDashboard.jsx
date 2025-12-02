import React, { useState, useEffect } from "react";
import OrgResourcesWidget from "@/components/dashboard/OrgResourcesWidget";
import OrgStatusWidget from "@/components/dashboard/OrgStatusWidget";
import StatusAlertsWidget from "@/components/dashboard/StatusAlertsWidget";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import ArmoryStatusPanel from "@/components/dashboard/ArmoryStatusPanel";
import PioneerUplink from "@/components/dashboard/PioneerUplink";
import RankVisualizer from "@/components/dashboard/RankVisualizer";
import CommanderDashboard from "@/components/dashboard/CommanderDashboard";
import OperatorDashboard from "@/components/dashboard/OperatorDashboard";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { getUserRankValue } from "@/components/permissions";
import { LayoutDashboard, Map, Radio } from "lucide-react";

export default function NomadOpsDashboard() {
  const { data: user } = useQuery({
     queryKey: ['dashboard-user'],
     queryFn: () => base44.auth.me().catch(() => null)
  });

  const [viewMode, setViewMode] = useState('standard');

  // Determine default view based on rank/role
  useEffect(() => {
     if (user) {
        const rankVal = getUserRankValue(user.rank);
        if (rankVal >= 5) { // Founder/Pioneer
           setViewMode('commander');
        } else if (rankVal >= 3 && rankVal <= 4) { // Scout/Voyager
           setViewMode('operator');
        } else {
           setViewMode('standard');
        }
     }
  }, [user]);

  const StandardDashboard = () => (
    <div className="h-full w-full flex flex-col font-sans relative">
      {/* Main Grid Content */}
      <main className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 relative h-full">
         
         {/* Background Grid Effect */}
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
              style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
         />

         {/* 1. Left Column (Org Resources) */}
         <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-12 md:row-span-12 overflow-hidden">
            <OrgResourcesWidget />
         </div>

         {/* 2. Main Center Area (Visual Hub) */}
         <div className="col-span-12 md:col-span-8 lg:col-span-6 row-span-12 md:row-span-12 flex flex-col gap-4">
            
            {/* A. Event Projection (Primary Visual) - 40% Height */}
            <div className="h-[40%] shrink-0">
                <EventProjectionPanel user={user} />
            </div>

            {/* B. Personal Log (Alerts) - Variable */}
            <div className="flex-1 min-h-0">
               <PersonalLogPanel user={user} />
            </div>

            {/* C. Armory Status - Fixed Height */}
            <div className="h-32 shrink-0">
               <ArmoryStatusPanel />
            </div>

         </div>

         {/* 3. Right Column (Status & Org Overview) */}
         <div className="col-span-12 md:col-span-12 lg:col-span-3 row-span-12 md:row-span-12 flex flex-col gap-4 overflow-hidden">
            
            {/* High Authority Uplink */}
            <div className="shrink-0">
               <PioneerUplink />
            </div>

            {/* Critical Alerts & Status */}
            <div className="shrink-0">
               <StatusAlertsWidget />
            </div>

            {/* Org Status Monitor */}
            <div className="flex-1 overflow-hidden min-h-0">
               <OrgStatusWidget />
            </div>

            {/* Rank Progression */}
            <div className="flex-1 min-h-0 overflow-hidden">
               <RankVisualizer currentRank={user?.rank || 'Vagrant'} />
            </div>

         </div>

      </main>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative bg-black">
       {/* Dashboard Switcher / Header */}
       <div className="h-10 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-4 shrink-0 z-50">
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">View Mode:</span>
             <div className="flex bg-zinc-900 border border-zinc-800 p-0.5 rounded-sm">
                <button 
                  onClick={() => setViewMode('standard')}
                  className={`p-1 hover:bg-zinc-800 rounded-sm transition-colors ${viewMode === 'standard' ? 'text-emerald-500 bg-zinc-800' : 'text-zinc-500'}`}
                  title="Standard Dashboard"
                >
                   <LayoutDashboard className="w-4 h-4" />
                </button>
                {getUserRankValue(user?.rank) >= 3 && (
                  <button 
                     onClick={() => setViewMode('operator')}
                     className={`p-1 hover:bg-zinc-800 rounded-sm transition-colors ${viewMode === 'operator' ? 'text-emerald-500 bg-zinc-800' : 'text-zinc-500'}`}
                     title="Operator Console"
                  >
                     <Radio className="w-4 h-4" />
                  </button>
                )}
                {getUserRankValue(user?.rank) >= 5 && (
                  <button 
                     onClick={() => setViewMode('commander')}
                     className={`p-1 hover:bg-zinc-800 rounded-sm transition-colors ${viewMode === 'commander' ? 'text-emerald-500 bg-zinc-800' : 'text-zinc-500'}`}
                     title="Tactical Command"
                  >
                     <Map className="w-4 h-4" />
                  </button>
                )}
             </div>
          </div>
          
          {user?.rank && (
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">
               {user.rank} CLEARANCE
            </div>
          )}
       </div>

       {/* Dashboard Content */}
       <div className="flex-1 overflow-hidden relative">
          {viewMode === 'commander' && <CommanderDashboard user={user} />}
          {viewMode === 'operator' && <OperatorDashboard user={user} />}
          {viewMode === 'standard' && <StandardDashboard />}
       </div>
    </div>
  );
}