import React from 'react';
import OpsEventSelector from "@/components/ops/OpsEventSelector";
import OpsCommandCenter from "@/components/ops/OpsCommandCenter";

export default function OpsDashboardPage() {
  const [selectedEvent, setSelectedEvent] = React.useState(null);

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 lg:p-6 flex flex-col">
      {/* Top Nav / Branding */}
      <div className="mb-6 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-3 h-12 bg-red-900 rounded-sm" />
            <div>
               <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Command<span className="text-red-700">Net</span></h1>
               <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Tactical Operations Overview</p>
            </div>
         </div>
         <div className="text-right hidden md:block">
            <div className="text-xs font-mono text-zinc-600">SYS_TIME_UTC</div>
            <div className="text-lg font-bold text-zinc-400">{new Date().toLocaleTimeString([], {timeZone: 'UTC'})}</div>
         </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
         
         {/* Sidebar: Event Selector */}
         <div className="lg:col-span-3 h-[500px] lg:h-auto">
            <OpsEventSelector 
               selectedEventId={selectedEvent?.id} 
               onSelect={setSelectedEvent} 
            />
         </div>

         {/* Main Command View */}
         <div className="lg:col-span-9 bg-zinc-950/50 rounded-lg border border-zinc-900 p-6 shadow-2xl relative overflow-hidden">
            {/* CRT Scanline Effect (Decoration) */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20 z-10" />
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/0 to-zinc-900/50 z-0" />
            
            <div className="relative z-20 h-full">
               <OpsCommandCenter event={selectedEvent} />
            </div>
         </div>

      </div>
    </div>
  );
}