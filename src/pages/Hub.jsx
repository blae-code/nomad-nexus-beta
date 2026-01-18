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
    <div className="h-full overflow-y-auto bg-zinc-950">
      <div className="container mx-auto max-w-[1800px] p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Terminal className="w-10 h-10 text-[#ea580c]" />
              Command Hub
            </h1>
            <p className="text-zinc-500 mt-1 font-mono text-sm">
              Welcome back, <span className="text-[#ea580c]">{user?.callsign || user?.rsi_handle || "Operative"}</span>
            </p>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickLinks.map((link, idx) => (
            <a key={idx} href={link.href} className="block group">
              <div className={`p-4 border ${link.bg} hover:bg-opacity-50 transition-all flex items-center gap-3`}>
                <link.icon className={`w-6 h-6 ${link.color}`} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white group-hover:text-[#ea580c] transition-colors">{link.label}</div>
                  <div className="text-[10px] text-zinc-600 font-mono">QUICK ACCESS</div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-[#ea580c] transition-colors" />
              </div>
            </a>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Rescue Alert */}
            <RescueAlertPanel />

            {/* Upcoming Operations */}
            <div className="border border-zinc-800 bg-zinc-900/50">
              <div className="bg-zinc-900 px-4 py-2 border-b border-zinc-800">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Mission Projection</h2>
              </div>
              <div className="p-4">
                <EventProjectionPanel user={user} />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-4 space-y-6">
            <StatusAlertsWidget />
            <PersonalActivityWidget />
            <ArmoryStatusPanel />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrgResourcesWidget />
          </div>
        </div>

      </div>
    </div>
  );
}