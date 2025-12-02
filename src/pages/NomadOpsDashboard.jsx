import React from "react";
import OrgResourcesWidget from "@/components/dashboard/OrgResourcesWidget";
import OrgStatusWidget from "@/components/dashboard/OrgStatusWidget";
import StatusAlertsWidget from "@/components/dashboard/StatusAlertsWidget";
import PersonalizedFeedWidget from "@/components/dashboard/PersonalizedFeedWidget";
import { Monitor } from "lucide-react";

export default function NomadOpsDashboard() {
  return (
    <div className="h-full w-full flex flex-col font-sans">
      
      {/* Main Grid Content */}
      <main className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 relative h-full">
         
         {/* Background Grid Effect */}
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
              style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
         />

         {/* 1. Left Column (Org Resources) */}
         <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-12 md:row-span-12">
            <OrgResourcesWidget />
         </div>

         {/* 2. Main Center Area (Personalized Feed) */}
         <div className="col-span-12 md:col-span-8 lg:col-span-6 row-span-6 md:row-span-8">
             <PersonalizedFeedWidget />
         </div>

         {/* 3. Right Column (Status & Org Overview) */}
         <div className="col-span-12 md:col-span-12 lg:col-span-3 row-span-6 md:row-span-4 lg:row-span-12 flex flex-col gap-4">
            {/* Top Right: Critical Alerts & Status */}
            <div className="shrink-0">
               <StatusAlertsWidget />
            </div>
            {/* Below: Org Status Monitor (Moved from Center) */}
            <div className="flex-1 overflow-hidden">
               <OrgStatusWidget />
            </div>
         </div>

         {/* 4. Bottom Center Info (Extra row for wide screens) */}
         <div className="hidden lg:block col-span-6 row-span-4 bg-zinc-900/20 border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 mb-2">
               <Monitor className="w-4 h-4" />
               <span className="text-xs uppercase tracking-widest font-bold">System Messages</span>
            </div>
            <div className="font-mono text-[10px] text-zinc-600 space-y-1">
               <div>> Initializing secure connection... OK</div>
               <div>> Loading operational parameters... OK</div>
               <div>> Syncing fleet telemetry... OK</div>
               <div className="text-orange-500/50">> Awaiting operator input_</div>
            </div>
         </div>

      </main>
    </div>
  );
}