import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Radio, Plus, Zap, AlertTriangle, Phone, User, FileText, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from "@/components/ui/OpsPanel";
import { TYPOGRAPHY } from "@/components/utils/typographySystem";
import EventProjectionPanel from "@/components/dashboard/EventProjectionPanel";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import StatusAlertsWidget from "@/components/dashboard/StatusAlertsWidget";
import PersonalActivityWidget from "@/components/dashboard/PersonalActivityWidget";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import NotificationCenter from "@/components/notifications/NotificationCenter";

export default function MissionControlPage() {
  const [user, setUser] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch next active/upcoming event
  const { data: nextEvent, isLoading: eventLoading } = useQuery({
    queryKey: ['next-event'],
    queryFn: async () => {
      const events = await base44.entities.Event.filter(
        { status: 'active' },
        '-start_time',
        1
      );
      if (events?.length > 0) return events[0];
      
      // Fallback to upcoming scheduled
      const scheduled = await base44.entities.Event.filter(
        { status: 'scheduled' },
        'start_time',
        1
      );
      return scheduled?.[0] || null;
    },
    enabled: !!user,
    refetchInterval: 30000
  });

  // Fetch critical alerts count
  const { data: criticalCount = 0 } = useQuery({
    queryKey: ['critical-alerts-count'],
    queryFn: async () => {
      const incidents = await base44.entities.Incident.filter(
        { severity: 'CRITICAL', status: 'active' },
        '-created_date',
        100
      );
      return incidents?.length || 0;
    },
    enabled: !!user,
    refetchInterval: 5000
  });

  const quickActions = [
    {
      label: "Launch Mission",
      icon: Plus,
      color: "bg-emerald-600 hover:bg-emerald-700",
      onClick: () => window.dispatchEvent(new CustomEvent('open-event-form')),
      desc: "New operation"
    },
    {
      label: "Open Comms",
      icon: Radio,
      color: "bg-blue-600 hover:bg-blue-700",
      href: createPageUrl('CommsConsole'),
      desc: "Active nets"
    },
    {
      label: "SOS",
      icon: AlertTriangle,
      color: "bg-red-600 hover:bg-red-700",
      onClick: () => {},
      desc: "Distress signal"
    },
    {
      label: "Status",
      icon: User,
      color: "bg-purple-600 hover:bg-purple-700",
      href: createPageUrl('Profile'),
      desc: "Set status"
    },
  ];

  return (
    <div className="h-full bg-[#09090b] flex flex-col overflow-hidden">
      {/* Mission Control Header */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Radio className="w-5 h-5 text-[#ea580c] animate-pulse" />
          <h1 className="text-sm font-black uppercase tracking-widest text-white">MISSION CONTROL</h1>
          <div className="text-[9px] font-mono text-zinc-600 ml-4">
            {new Date().toLocaleTimeString([], { hour12: false })}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {criticalCount > 0 && (
            <div className="flex items-center gap-2 px-2 py-1 bg-red-950/50 border border-red-900/50 text-red-400 text-[10px] font-mono">
              <AlertTriangle className="w-3 h-3" />
              {criticalCount} CRITICAL
            </div>
          )}
          <NotificationCenter user={user} />
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 overflow-hidden flex gap-2 p-2">
        
        {/* LEFT COLUMN: Next Operation + Quick Actions */}
        <OpsPanel className="w-72 lg:w-80 flex flex-col overflow-hidden shrink-0">
          <OpsPanelHeader>
            <OpsPanelTitle className={TYPOGRAPHY.LABEL_SM}>Next Operation</OpsPanelTitle>
            {eventLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
          </OpsPanelHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            <OpsPanelContent>
            {nextEvent ? (
              <div
                className="p-3 border border-zinc-700 bg-zinc-900/50 hover:border-[#ea580c] transition-colors cursor-pointer"
                onClick={() => setSelectedEventId(nextEvent.id)}
              >
                <div className={TYPOGRAPHY.CALLSIGN}>{nextEvent.title}</div>
                <div className={TYPOGRAPHY.TIMESTAMP_LG}>
                  {new Date(nextEvent.start_time).toLocaleString([], { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className={`${TYPOGRAPHY.STATUS_SM} px-2 py-1 bg-zinc-800 text-zinc-400`}>
                  {nextEvent.status.toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="text-center text-zinc-600 text-[10px] py-6 font-mono">
                NO SCHEDULED<br/>OPERATIONS
              </div>
            )}
            </OpsPanelContent>

            {/* Quick Actions */}
            <OpsPanelContent className="border-t border-zinc-800 space-y-2">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const content = (
                  <div className={`p-2 border border-zinc-700 ${action.color} text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-between transition-all`}>
                    <span>{action.label}</span>
                    <Icon className="w-3 h-3" />
                  </div>
                );
                return action.href ? (
                  <a key={idx} href={action.href} className="block">
                    {content}
                  </a>
                ) : (
                  <button key={idx} onClick={action.onClick} className="w-full text-left">
                    {content}
                  </button>
                );
              })}
            </OpsPanelContent>
          </div>
        </OpsPanel>

        {/* CENTER COLUMN: Live Ops Feed */}
        <OpsPanel className="flex-1 flex flex-col overflow-hidden">
          <OpsPanelHeader>
            <OpsPanelTitle className={TYPOGRAPHY.LABEL_SM}>Live Ops Feed</OpsPanelTitle>
          </OpsPanelHeader>
          
          <OpsPanelContent className="flex-1 overflow-y-auto space-y-2">
            {/* Rescue Alerts */}
            <RescueAlertPanel />
            
            {/* Critical Alerts */}
            {selectedEventId && (
              <OpsPanel>
                <OpsPanelHeader>
                  <OpsPanelTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    CRITICAL ALERTS
                  </OpsPanelTitle>
                </OpsPanelHeader>
                <OpsPanelContent>
                  <AIInsightsPanel eventId={selectedEventId} />
                </OpsPanelContent>
              </OpsPanel>
            )}
            
            {/* Status Alerts */}
            <StatusAlertsWidget />
          </OpsPanelContent>
        </OpsPanel>

        {/* RIGHT COLUMN: Personal Status + Notifications */}
        <OpsPanel className="w-72 lg:w-80 flex flex-col overflow-hidden shrink-0">
          <OpsPanelHeader>
            <OpsPanelTitle className={TYPOGRAPHY.LABEL_SM}>Personal Status</OpsPanelTitle>
          </OpsPanelHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
            <OpsPanelContent>
            {/* User Card */}
            {user && (
              <div className="p-3 border border-zinc-700 bg-zinc-900/50">
                <div className={TYPOGRAPHY.CALLSIGN}>
                  {user.callsign || user.rsi_handle || 'OPERATIVE'}
                </div>
                <div className={TYPOGRAPHY.STATUS_SM + ' text-zinc-500 mb-2'}>
                  Rank: {user.rank || 'VAGRANT'}
                </div>
                <a href={createPageUrl('Profile')} className="text-[9px] text-[#ea580c] hover:underline font-mono">
                  View Profile →
                </a>
              </div>
            )}

            {/* Activity Widget */}
            <PersonalActivityWidget />

            {/* Voice Status */}
            <div className="p-3 border border-zinc-700 bg-zinc-900/50">
              <div className={TYPOGRAPHY.LABEL_SM + ' text-zinc-300 mb-2 flex items-center gap-2'}>
                <Phone className="w-3 h-3 text-emerald-500" />
                Voice Status
              </div>
              <div className={TYPOGRAPHY.LOG}>
                <div>MODE: Open Push-to-Talk</div>
                <div>AUDIO: Nominal</div>
              </div>
            </div>
            </OpsPanelContent>

            {/* Quick Nav */}
            <OpsPanelContent className="border-t border-zinc-800 space-y-2">
              <a href={createPageUrl('Admin')} className="block p-2 border border-zinc-700 bg-zinc-900/50 hover:border-[#ea580c] text-[9px] font-mono text-zinc-400 hover:text-[#ea580c] transition-colors">
                Admin Panel →
              </a>
              <a href={createPageUrl('Events')} className="block p-2 border border-zinc-700 bg-zinc-900/50 hover:border-[#ea580c] text-[9px] font-mono text-zinc-400 hover:text-[#ea580c] transition-colors">
                All Ops →
              </a>
            </OpsPanelContent>
          </div>
        </OpsPanel>
      </div>
    </div>
  );
}