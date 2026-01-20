import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Radio, Calendar, Shield, Coins, AlertCircle, Users, Zap, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TYPOGRAPHY } from "@/components/utils/typographySystem";
import PageLayout, { ScrollArea, Panel } from "@/components/layout/PageLayout";
import Divider from "@/components/layout/Divider";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import EventCalendarView from "@/components/dashboard/EventCalendarView";
import LiveOperationsFeed from "@/components/dashboard/LiveOperationsFeed";
import LiveIncidentCenter from "@/components/incidents/LiveIncidentCenter";
import VoiceControlToolkit from "@/components/voice/VoiceControlToolkit";

export default function HubPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const quickLinks = [
    { icon: Radio, label: "Comms", href: createPageUrl('CommsConsole'), color: "text-emerald-500" },
    { icon: Calendar, label: "Ops", href: createPageUrl('Events'), color: "text-blue-500" },
    { icon: Shield, label: "Fleet", href: createPageUrl('FleetManager'), color: "text-purple-500" },
    { icon: Coins, label: "Treasury", href: createPageUrl('Treasury'), color: "text-amber-500" },
  ];

  const quickActions = [
    { icon: Plus, label: "New Event", action: () => alert('Create Event') },
    { icon: Radio, label: "Join Comms", action: () => alert('Join Comms') },
    { icon: AlertCircle, label: "Distress", action: () => alert('Send Distress') },
  ];

  return (
    <PageLayout
      title="Command Hub"
      subtitle={`Welcome, ${user?.callsign || user?.rsi_handle || 'Operative'}`}
      className="bg-zinc-950"
    >
      {/* Layout with sidebar */}
      <div className="flex gap-[var(--gutter)] h-full overflow-hidden p-[var(--gutter)]">
        {/* Main content */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-[var(--gutter)]">
           {/* Quick Access Tiles */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
             {quickLinks.map((link, idx) => {
               const Icon = link.icon;
               return (
                 <a key={idx} href={link.href} className="block group">
                   <Panel className="h-20 flex flex-col items-center justify-center text-center hover:bg-zinc-900 transition-colors">
                     <Icon className={cn("w-5 h-5 mb-1", link.color)} />
                     <div className={cn(TYPOGRAPHY.LABEL_SM, "text-zinc-300 group-hover:text-[#ea580c]")}>{link.label}</div>
                   </Panel>
                 </a>
               );
             })}
           </div>

          {/* Tabbed Work Area */}
          <Tabs defaultValue="ops" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start">
              <TabsTrigger value="ops">Operations</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
              <TabsTrigger value="incidents">Incidents</TabsTrigger>
              <TabsTrigger value="comms">Feed</TabsTrigger>
            </TabsList>

            {/* Ops */}
            <TabsContent value="ops" className="h-80 mt-0">
              <Panel title="Mission Projection" className="h-full">
                <ScrollArea className="h-full">
                  <EventProjectionPanel user={user} />
                </ScrollArea>
              </Panel>
            </TabsContent>

            {/* Alerts */}
            <TabsContent value="alerts" className="h-80 mt-0">
              <Panel title="Status Alerts" className="h-full">
                <ScrollArea className="h-full">
                  <RescueAlertPanel />
                </ScrollArea>
              </Panel>
            </TabsContent>

            {/* Incidents */}
            <TabsContent value="incidents" className="h-80 mt-0">
              <Panel title="Live Incidents" className="h-full">
                <ScrollArea className="h-full">
                  <LiveIncidentCenter />
                </ScrollArea>
              </Panel>
            </TabsContent>

            {/* Feed */}
            <TabsContent value="comms" className="h-80 mt-0">
              <Panel title="Feed" className="h-full">
                <ScrollArea className="h-full">
                  <LiveOperationsFeed eventId={null} limit={20} />
                </ScrollArea>
              </Panel>
            </TabsContent>
          </Tabs>

          {/* Quick Actions */}
          <Panel title="Quick Actions">
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={idx}
                    onClick={action.action}
                    variant="outline"
                    className="flex items-center gap-1 h-8 text-xs"
                  >
                    <Icon className="w-3 h-3" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          </Panel>
          </div>
          </ScrollArea>

          {/* Right sidebar - Voice Toolkit */}
          <div className="w-72 shrink-0 overflow-y-auto pr-4">
          <VoiceControlToolkit />
          </div>
          </div>
          </PageLayout>
          );
          }