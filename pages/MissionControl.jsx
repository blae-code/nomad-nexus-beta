import { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Radio, Plus, AlertTriangle, Phone, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import PageLayout, { ScrollArea, Panel } from "@/components/layout/PageLayout";
import { TYPOGRAPHY } from "@/components/utils/typographySystem";
import RescueAlertPanel from "@/components/dashboard/RescueAlertPanel";
import StatusAlertsWidget from "@/components/dashboard/StatusAlertsWidget";
import PersonalActivityWidget from "@/components/dashboard/PersonalActivityWidget";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";

function MissionControlPage() {
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

  // Critical alert status header
  const headerStatus = criticalCount > 0 ? (
    <div className="flex items-center gap-2 px-2 py-1 bg-red-950/50 border border-red-900/50 text-red-400 text-[10px] font-mono">
      <AlertTriangle className="w-3 h-3" />
      {criticalCount} CRITICAL
    </div>
  ) : null;

  return (
    <PageLayout
      title="Mission Control"
      actions={headerStatus}
    >
      {/* Main 3-Column Layout */}
      <div className="h-full overflow-hidden flex gap-[var(--gutter)] p-[var(--gutter)]">
        
        {/* LEFT COLUMN: Next Operation + Quick Actions */}
        <div className="w-72 flex flex-col gap-[var(--gutter)] shrink-0 min-h-0">
          <Panel title="Next Operation" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 space-y-3 p-[var(--space-lg)]">
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
              {eventLoading && <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />}
            </ScrollArea>
          </Panel>

          {/* Quick Actions */}
          <Panel title="Quick Actions" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 space-y-2 p-[var(--space-lg)]">
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
            </ScrollArea>
          </Panel>
        </div>

        {/* CENTER COLUMN: Live Ops Feed */}
        <Panel title="Live Ops Feed" className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 space-y-2 p-[var(--space-lg)]">
            {/* Rescue Alerts */}
            <RescueAlertPanel />
            
            {/* Critical Alerts */}
            {selectedEventId && (
              <div className="border border-zinc-700 bg-zinc-900/50">
                <div className="flex items-center gap-2 px-[var(--space-lg)] py-[var(--space-md)] border-b border-zinc-700">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-xs font-bold uppercase text-zinc-400">Critical Alerts</span>
                </div>
                <div className="p-[var(--space-lg)]">
                  <AIInsightsPanel eventId={selectedEventId} />
                </div>
              </div>
            )}
            
            {/* Status Alerts */}
            <StatusAlertsWidget />
          </ScrollArea>
        </Panel>

        {/* RIGHT COLUMN: Personal Status */}
        <div className="w-72 flex flex-col gap-[var(--gutter)] shrink-0 min-h-0">
          <Panel title="Personal Status" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 space-y-3 p-[var(--space-lg)]">
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
            </ScrollArea>
          </Panel>

          {/* Quick Nav */}
          <Panel title="Navigation" className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 space-y-2 p-[var(--space-lg)]">
              <a href={createPageUrl('Admin')} className="block p-2 border border-zinc-700 bg-zinc-900/50 hover:border-[#ea580c] text-[9px] font-mono text-zinc-400 hover:text-[#ea580c] transition-colors">
                Admin Panel →
              </a>
              <a href={createPageUrl('Events')} className="block p-2 border border-zinc-700 bg-zinc-900/50 hover:border-[#ea580c] text-[9px] font-mono text-zinc-400 hover:text-[#ea580c] transition-colors">
                All Ops →
              </a>
            </ScrollArea>
          </Panel>
        </div>
      </div>
    </PageLayout>
  );
}

export default MissionControlPage;