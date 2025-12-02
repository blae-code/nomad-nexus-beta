import React from "react";
import OrgResourcesWidget from "@/components/dashboard/OrgResourcesWidget";
import OrgStatusWidget from "@/components/dashboard/OrgStatusWidget";
import StatusAlertsWidget from "@/components/dashboard/StatusAlertsWidget";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import PersonalLogPanel from "@/components/dashboard/PersonalLogPanel";
import ArmoryStatusPanel from "@/components/dashboard/ArmoryStatusPanel";
import PioneerUplink from "@/components/dashboard/PioneerUplink";
import RankVisualizer from "@/components/dashboard/RankVisualizer";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function NomadOpsDashboard() {
  const { data: user } = useQuery({
     queryKey: ['dashboard-user'],
     queryFn: () => base44.auth.me().catch(() => null)
  });

  return (
    <div className="h-full w-full flex flex-col font-sans relative">
      
      {/* Rank Overlay Label */}
      {user?.rank && (
         <div className="absolute top-0 right-0 bg-white text-black text-[9px] font-black px-2 py-0.5 z-50 uppercase tracking-widest opacity-80">
            {user.rank} CLEARANCE
         </div>
      )}

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
            <div className="shrink-0">
               <RankVisualizer currentRank={user?.rank || 'Vagrant'} />
            </div>

         </div>

      </main>
    </div>
  );
}