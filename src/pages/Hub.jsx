import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Radio, Calendar, Shield, Coins, AlertCircle, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import LiveOperationsFeed from "@/components/dashboard/LiveOperationsFeed";
import LiveIncidentCenter from "@/components/incidents/LiveIncidentCenter";


export default function HubPage() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('ops');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const quickLinks = [
    { icon: Radio, label: "Comms", href: createPageUrl('CommsConsole') },
    { icon: Calendar, label: "Ops", href: createPageUrl('Events') },
    { icon: Shield, label: "Fleet", href: createPageUrl('FleetManager') },
    { icon: Coins, label: "Treasury", href: createPageUrl('Treasury') },
  ];

  const quickActions = [
    { icon: Plus, label: "New Event", action: () => alert('Create Event') },
    { icon: Radio, label: "Join Comms", action: () => alert('Join Comms') },
    { icon: AlertCircle, label: "Distress", action: () => alert('Send Distress') },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 p-6 overflow-auto">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2 mb-8">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
            COMMAND HUB
          </h1>
          <p className="text-sm font-mono text-zinc-500 tracking-widest">
            Welcome, {user?.callsign || user?.rsi_handle || 'OPERATIVE'}
          </p>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <a key={idx} href={link.href}>
                <div className="flex items-center gap-2 px-3 py-2.5 border border-zinc-800/50 bg-zinc-900/40 hover:border-[#ea580c]/50 hover:bg-zinc-900/60 transition-all duration-100 group cursor-pointer">
                  <Icon className="w-4 h-4 text-[#ea580c] shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-zinc-300 group-hover:text-[#ea580c] transition-colors tracking-wider">
                    {link.label}
                  </span>
                </div>
              </a>
            );
          })}
        </div>

        {/* Tabbed Work Area */}
        <div className="space-y-2">
          {/* Tab Navigation */}
          <div className="flex gap-1 border-b border-zinc-800">
            {[
              { id: 'ops', label: 'OPERATIONS' },
              { id: 'alerts', label: 'ALERTS' },
              { id: 'incidents', label: 'INCIDENTS' },
              { id: 'comms', label: 'FEED' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-[9px] font-bold uppercase tracking-wider transition-all duration-100 border-b-2',
                  activeTab === tab.id
                    ? 'text-[#ea580c] border-b-[#ea580c]'
                    : 'text-zinc-500 border-b-transparent hover:text-zinc-400'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="border border-zinc-800/50 bg-zinc-950 min-h-96">
            <div className="p-4">
              {activeTab === 'ops' && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                    MISSION PROJECTION
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <EventProjectionPanel user={user} />
                  </div>
                </div>
              )}
              {activeTab === 'alerts' && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                    STATUS ALERTS
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <RescueAlertPanel />
                  </div>
                </div>
              )}
              {activeTab === 'incidents' && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                    LIVE INCIDENTS
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <LiveIncidentCenter />
                  </div>
                </div>
              )}
              {activeTab === 'comms' && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-zinc-600 mb-4 border-b border-zinc-800/50 pb-2 tracking-wider">
                    OPERATIONAL FEED
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <LiveOperationsFeed eventId={null} limit={20} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase text-zinc-600 px-1 tracking-wider">
            QUICK ACTIONS
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={action.action}
                  className="flex items-center justify-center gap-2 px-3 py-2.5 border border-zinc-800/50 bg-zinc-900/40 hover:border-[#ea580c]/50 hover:bg-zinc-900/60 transition-all duration-100 text-[9px] font-bold uppercase tracking-wider text-zinc-400 hover:text-[#ea580c]"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}