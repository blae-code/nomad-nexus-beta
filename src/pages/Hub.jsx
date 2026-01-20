import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Radio, Calendar, Shield, Users, Coins, Terminal, ArrowRight } from "lucide-react";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import StatusAlertsWidget from "@/components/dashboard/StatusAlertsWidget";
import PersonalActivityWidget from "@/components/dashboard/PersonalActivityWidget";
import OrgResourcesWidget from "@/components/dashboard/OrgResourcesWidget";
import ArmoryStatusPanel from "@/components/dashboard/ArmoryStatusPanel";
import EventCalendarView from "@/components/dashboard/EventCalendarView";
import OpsMap from "@/components/ops/OpsMap";

export default function HubPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const quickLinks = [
    { icon: Radio, label: "Comms Console", href: createPageUrl('CommsConsole'), color: "text-emerald-500", bg: "bg-emerald-950/30 border-emerald-900" },
    { icon: Calendar, label: "Operations", href: createPageUrl('Events'), color: "text-blue-500", bg: "bg-blue-950/30 border-blue-900" },
    { icon: Shield, label: "Fleet Manager", href: createPageUrl('FleetManager'), color: "text-purple-500", bg: "bg-purple-950/30 border-purple-900" },
    { icon: Coins, label: "Treasury", href: createPageUrl('Treasury'), color: "text-amber-500", bg: "bg-amber-950/30 border-amber-900" },
  ];

  return (
    <div className="h-full bg-zinc-950 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-full px-3 py-3 lg:px-4 lg:py-4 space-y-2">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2 lg:gap-3">
              <Terminal className="w-7 h-7 lg:w-9 lg:h-9 text-[#ea580c]" />
              Command Hub
            </h1>
            <p className="text-zinc-500 mt-1 font-mono text-xs lg:text-sm">
              Welcome back, <span className="text-[#ea580c]">{user?.callsign || user?.rsi_handle || "Operative"}</span>
            </p>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {quickLinks.map((link, idx) => (
            <a key={idx} href={link.href} className="block group">
              <div className={`p-3 lg:p-4 border ${link.bg} hover:bg-opacity-50 transition-all flex items-center gap-2 lg:gap-3`}>
                <link.icon className={`w-5 h-5 lg:w-6 lg:h-6 ${link.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs lg:text-sm font-bold text-white group-hover:text-[#ea580c] transition-colors truncate">{link.label}</div>
                  <div className="text-[9px] lg:text-[10px] text-zinc-600 font-mono">QUICK ACCESS</div>
                </div>
                <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4 text-zinc-600 group-hover:text-[#ea580c] transition-colors shrink-0" />
              </div>
            </a>
          ))}
        </div>

        {/* Event Calendar View */}
        <EventCalendarView />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-3">
            {/* Rescue Alert */}
            <RescueAlertPanel />

            {/* Upcoming Operations */}
            <div className="border border-zinc-800 bg-zinc-900/50">
              <div className="bg-zinc-900 px-3 py-1.5 border-b border-zinc-800">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Mission Projection</h2>
              </div>
              <div className="p-3">
                <EventProjectionPanel user={user} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-3">
            <StatusAlertsWidget />
            <PersonalActivityWidget />
            <ArmoryStatusPanel />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <OrgResourcesWidget />
          </div>
        </div>

        {/* Tactical Map */}
        <div className="border border-zinc-800 bg-zinc-900/50">
          <div className="bg-zinc-900 px-3 py-1.5 border-b border-zinc-800">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Theater Map</h2>
          </div>
          <div style={{ height: '400px' }} className="p-3">
            <OpsMap eventId={null} readOnly={true} />
          </div>
        </div>

        </div>
      </div>
    </div>
  );
}