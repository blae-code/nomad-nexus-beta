import React from "react";
import CriticalAlertsWidget from "@/components/dashboard/CriticalAlertsWidget";
import PersonalActivityWidget from "@/components/dashboard/PersonalActivityWidget";
import OrgStatusWidget from "@/components/dashboard/OrgStatusWidget";
import { Monitor, Terminal } from "lucide-react";

export default function NomadOpsDashboard() {
  return (
    <div className="h-screen w-screen bg-[#09090b] text-zinc-200 overflow-hidden flex flex-col font-sans selection:bg-orange-500/30">
      
      {/* Top Status Bar */}
      <header className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 justify-between relative z-10">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-orange-600 flex items-center justify-center rounded-sm">
              <Terminal className="w-5 h-5 text-black" />
           </div>
           <div>
              <h1 className="text-sm font-black uppercase tracking-[0.15em] text-white leading-none">Nomad Nexus</h1>
              <div className="text-[9px] font-mono text-orange-500 tracking-widest opacity-80">OPS DASHBOARD V4.0</div>
           </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px] text-zinc-500">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>SYSTEM ONLINE</span>
           </div>
           <div>SERVER_TIME: <span className="text-zinc-300">{new Date().toLocaleTimeString()}</span></div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 relative">
         
         {/* Background Grid Effect */}
         <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
              style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
         />

         {/* 1. Critical Alerts (Top Left / Priority) - Spans full height on mobile, or large chunk on desktop */}
         <div className="col-span-12 md:col-span-4 lg:col-span-3 row-span-12 md:row-span-12">
            <CriticalAlertsWidget />
         </div>

         {/* 2. Main Center Area (Org Status & Map Placeholder?) */}
         <div className="col-span-12 md:col-span-8 lg:col-span-6 row-span-6 md:row-span-8 flex flex-col gap-4">
            {/* Org Status occupying central visual space */}
            <div className="flex-1">
               <OrgStatusWidget />
            </div>
            {/* Placeholder for future map or additional data */}
            <div className="h-1/3 bg-zinc-900/20 border border-zinc-800 border-dashed flex items-center justify-center text-zinc-700 text-xs uppercase tracking-widest">
               Tactical Map [Offline]
            </div>
         </div>

         {/* 3. Personal Activity (Right Side) */}
         <div className="col-span-12 md:col-span-12 lg:col-span-3 row-span-6 md:row-span-4 lg:row-span-12">
            <PersonalActivityWidget />
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