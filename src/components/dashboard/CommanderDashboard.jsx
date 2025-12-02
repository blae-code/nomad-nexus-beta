import React from 'react';
import TacticalMap from '@/components/ops/TacticalMap';
import EventProjectionPanel from '@/components/dashboard/EventProjectionPanel';
import StatusAlertsWidget from '@/components/dashboard/StatusAlertsWidget';
import OrgStatusWidget from '@/components/dashboard/OrgStatusWidget';
import { Shield, Target, Users, Activity } from 'lucide-react';

export default function CommanderDashboard({ user }) {
  return (
    <div className="h-full w-full grid grid-cols-12 grid-rows-12 gap-4 p-4">
      
      {/* Top Bar: High Level Stats */}
      <div className="col-span-12 row-span-1 grid grid-cols-4 gap-4">
         <div className="bg-zinc-900/50 border border-zinc-800 p-3 flex items-center gap-3">
            <Shield className="w-5 h-5 text-emerald-500" />
            <div>
               <div className="text-[10px] text-zinc-500 uppercase">Defcon Level</div>
               <div className="text-lg font-bold text-white leading-none">5 (NORMAL)</div>
            </div>
         </div>
         <div className="bg-zinc-900/50 border border-zinc-800 p-3 flex items-center gap-3">
            <Target className="w-5 h-5 text-amber-500" />
            <div>
               <div className="text-[10px] text-zinc-500 uppercase">Active Ops</div>
               <div className="text-lg font-bold text-white leading-none">3 DEPLOYED</div>
            </div>
         </div>
         <div className="bg-zinc-900/50 border border-zinc-800 p-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-500" />
            <div>
               <div className="text-[10px] text-zinc-500 uppercase">Personnel</div>
               <div className="text-lg font-bold text-white leading-none">12 ONLINE</div>
            </div>
         </div>
         <div className="bg-zinc-900/50 border border-zinc-800 p-3 flex items-center gap-3">
            <Activity className="w-5 h-5 text-red-500" />
            <div>
               <div className="text-[10px] text-zinc-500 uppercase">Threats</div>
               <div className="text-lg font-bold text-white leading-none">NONE</div>
            </div>
         </div>
      </div>

      {/* Main Tactical Map */}
      <div className="col-span-12 md:col-span-8 row-span-7 md:row-span-8 relative">
         <div className="absolute top-0 left-0 bg-emerald-900/20 text-emerald-500 text-[10px] font-bold px-2 py-1 z-10 border-b border-r border-emerald-900/50">
            TACTICAL COMMAND INTERFACE
         </div>
         <TacticalMap className="w-full h-full" />
      </div>

      {/* Right Column: Status & Alerts */}
      <div className="col-span-12 md:col-span-4 row-span-11 flex flex-col gap-4">
         <div className="h-1/3">
            <OrgStatusWidget />
         </div>
         <div className="flex-1">
            <StatusAlertsWidget />
         </div>
      </div>

      {/* Bottom Row: Events Timeline */}
      <div className="col-span-12 md:col-span-8 row-span-4 md:row-span-3">
         <EventProjectionPanel user={user} />
      </div>

    </div>
  );
}