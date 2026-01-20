import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from "@/components/ui/OpsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, ArrowRight, Users, Clock, ArrowLeft, ChevronDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import { canCreateEvent, canEditEvent } from "@/components/permissions";
import { getEventSeverity, getSeverityBadge, getPrioritySeverity } from "@/components/utils/severitySystem";
import { typographyClasses } from "@/components/utils/typography";
import { cn } from "@/lib/utils";
import EventForm from "@/components/events/EventForm";
import EventCard from "@/components/events/EventCard";
import EventActionBar from "@/components/events/EventActionBar";
import LoadingState from "@/components/feedback/LoadingState";
import EmptyState from "@/components/feedback/EmptyState";
import EventCommunicationLogs from "@/components/events/EventCommunicationLogs";
import EventPostAnalysis from "@/components/events/EventPostAnalysis";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";
import CommsPanel from "@/components/events/CommsPanel";
import SquadManager from "@/components/events/SquadManager";
import PlayerStatusSection from "@/components/events/PlayerStatusSection";
import EventParticipants from "@/components/events/EventParticipants";
import EventEconomy from "@/components/events/EventEconomy";
import CommsConfig from "@/components/events/CommsConfig";
import AIInsightsPanel from "@/components/ai/AIInsightsPanel";
import EventObjectives from "@/components/events/EventObjectives";
import EventTimeline from "@/components/events/EventTimeline";
import EventAAR from "@/components/events/EventAAR";
import OpsMap from "@/components/ops/OpsMap";
import EventPhaseGates from "@/components/events/EventPhaseGates";
import EventCommandStaff from "@/components/events/EventCommandStaff";
import EventReadinessChecklist from "@/components/events/EventReadinessChecklist";
import AITacticalAdvisor from "@/components/ai/AITacticalAdvisor";
import AIAfterActionReportGenerator from "@/components/ai/AIAfterActionReportGenerator";
import { Rocket } from "lucide-react";

function EventDetail({ id }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('briefing');
  const [showNoteForm, setShowNoteForm] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event-detail', id],
    queryFn: async () => {
      if (!id) return null;
      return base44.entities.Event.get(id);
    },
    enabled: !!id
  });

  const { users: allUsers, userById } = useUserDirectory(event?.created_by ? [event.created_by] : null);
  const creator = event?.created_by ? userById[event.created_by] : null;
  const { data: allAssets } = useQuery({ queryKey: ['event-assets-detail'], queryFn: () => base44.entities.FleetAsset.list(), initialData: [] });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center bg-zinc-950"><LoadingState message="LOADING OPERATION..." /></div>;
  }

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950">
        <EmptyState
          title="Operation Not Found"
          description="This operation may have been archived or deleted."
          action={<a href={createPageUrl('Events')}><Badge variant="outline" className="hover:bg-zinc-800 cursor-pointer">RETURN TO BOARD</Badge></a>}
        />
      </div>
    );
  }

  // Collapse state for long sections
  const [expandedSections, setExpandedSections] = useState({
    objectives: false,
    assets: false,
    participants: false
  });

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-3 py-2 lg:px-4 lg:py-3">
        
          {/* Compact Header */}
          <div className="mb-3 space-y-2">
            <button 
              onClick={() => window.location.href = createPageUrl('Events')}
              className={cn("inline-flex items-center text-xs transition-colors hover:text-red-500", typographyClasses.labelSecondary)}
            >
              <ArrowLeft className="w-3 h-3 mr-1" /> Back
            </button>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getSeverityBadge(event.event_type === 'focused' ? 'critical' : 'nominal')} size="sm">
                  {event.event_type.toUpperCase()}
                </Badge>
                {event.priority && (
                  <Badge variant="outline" className={getSeverityBadge(getPrioritySeverity(event.priority))} size="sm">
                    {event.priority}
                  </Badge>
                )}
                <span className={cn(typographyClasses.timestamp, "text-[10px] text-zinc-400")}>
                  OP-ID: {event.id.slice(0, 8)}
                </span>
              </div>
              <h1 className={cn(typographyClasses.commandTitle, "text-2xl")}>
                {event.title}
              </h1>
            </div>

            <EventActionBar
              event={event}
              currentUser={currentUser}
              onModify={() => setIsEditOpen(true)}
              className="inline-flex gap-2"
            />
            <EventForm 
              event={event} 
              open={isEditOpen} 
              onOpenChange={setIsEditOpen} 
            />
          </div>

          {/* Compact Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
            <TabsList className="h-8 gap-1">
              {[
                { id: 'briefing', label: 'Briefing' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'aar', label: 'AAR' },
                { id: 'map', label: 'Tactical' }
              ].map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-[10px] h-7 px-2">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Briefing Tab - Collapsible sections */}
            <TabsContent value="briefing" className="space-y-2 mt-3">
              <OpsPanel>
                <OpsPanelHeader>
                  <OpsPanelTitle>Op Summary</OpsPanelTitle>
                </OpsPanelHeader>
                <OpsPanelContent className="text-xs text-zinc-400 space-y-3">
                  <p className="leading-relaxed line-clamp-3">{event.description}</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-800/50 text-[10px]">
                    <div>
                      <div className={typographyClasses.commandLabel}>Start</div>
                      <div className="text-zinc-200">{new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</div>
                    </div>
                    <div>
                      <div className={typographyClasses.commandLabel}>Time</div>
                      <div className="text-zinc-200">{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    </div>
                    <div>
                      <div className={typographyClasses.commandLabel}>Location</div>
                      <div className="text-zinc-200 truncate">{event.location || "TBD"}</div>
                    </div>
                    <div>
                      <div className={typographyClasses.commandLabel}>CO</div>
                      <div className="text-zinc-200 truncate">{creator?.callsign || "Unknown"}</div>
                    </div>
                  </div>
                </OpsPanelContent>
              </OpsPanel>

              {/* Collapsible Objectives */}
              <div className="border border-zinc-800 bg-zinc-950/50">
                <button 
                  onClick={() => setExpandedSections({...expandedSections, objectives: !expandedSections.objectives})}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-zinc-900/50 transition-colors border-b border-zinc-800/50"
                >
                  <span className="text-[10px] font-bold uppercase text-zinc-400">Objectives</span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", expandedSections.objectives && "rotate-180")} />
                </button>
                {expandedSections.objectives && (
                  <div className="p-2">
                    <EventObjectives 
                      event={event} 
                      users={allUsers} 
                      assets={allAssets} 
                      canEdit={canEditEvent(currentUser, event)} 
                    />
                  </div>
                )}
              </div>

              {/* Collapsible Assets */}
              {event.assigned_asset_ids?.length > 0 && (
                <div className="border border-zinc-800 bg-zinc-950/50">
                  <button 
                    onClick={() => setExpandedSections({...expandedSections, assets: !expandedSections.assets})}
                    className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-zinc-900/50 transition-colors border-b border-zinc-800/50"
                  >
                    <span className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                      <Rocket className="w-3 h-3" /> Assets ({event.assigned_asset_ids.length})
                    </span>
                    <ChevronDown className={cn("w-3 h-3 transition-transform", expandedSections.assets && "rotate-180")} />
                  </button>
                  {expandedSections.assets && (
                    <div className="p-2 grid grid-cols-2 gap-1">
                      {allAssets.filter(a => event.assigned_asset_ids.includes(a.id)).map(asset => (
                        <div key={asset.id} className="flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-800 text-[9px]">
                          <div className="w-5 h-5 bg-blue-900/20 flex items-center justify-center text-blue-400 border border-blue-900/30">
                            <Rocket className="w-2.5 h-2.5" />
                          </div>
                          <div>
                            <div className="font-bold text-zinc-200">{asset.name}</div>
                            <div className="text-zinc-500">{asset.model}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compact 2x2 grid for status panels */}
              <div className="grid grid-cols-2 gap-2">
                <EventPhaseGates event={event} canEdit={canEditEvent(currentUser, event)} />
                <EventReadinessChecklist event={event} canEdit={canEditEvent(currentUser, event)} />
                <EventCommandStaff event={event} canEdit={canEditEvent(currentUser, event)} />
                <SquadManager eventId={event.id} />
              </div>

              {/* Collapsible Participants */}
              <div className="border border-zinc-800 bg-zinc-950/50">
                <button 
                  onClick={() => setExpandedSections({...expandedSections, participants: !expandedSections.participants})}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-zinc-900/50 transition-colors border-b border-zinc-800/50"
                >
                  <span className="text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Participants
                  </span>
                  <ChevronDown className={cn("w-3 h-3 transition-transform", expandedSections.participants && "rotate-180")} />
                </button>
                {expandedSections.participants && (
                  <div className="p-2">
                    <EventParticipants eventId={event.id} />
                  </div>
                )}
              </div>

              {/* Compact bottom panels */}
              <div className="grid grid-cols-2 gap-2">
                <EventEconomy eventId={event.id} />
                <PlayerStatusSection eventId={event.id} />
              </div>

              <EventCommunicationLogs eventId={event.id} />
              <EventPostAnalysis event={event} canEdit={canEditEvent(currentUser, event)} />
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-3">
              <OpsPanel>
                <OpsPanelContent className="p-2">
                  <EventTimeline 
                    eventId={event.id}
                    onAddNote={() => setShowNoteForm(!showNoteForm)}
                  />
                  {showNoteForm && (
                    <div className="mt-3 pt-3 border-t border-zinc-700 space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="RECORD ENTRY..."
                        className="w-full bg-zinc-950 border border-zinc-700 text-white p-1.5 text-xs font-mono"
                        rows="2"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (noteText.trim()) {
                              await base44.entities.EventLog.create({
                                event_id: event.id,
                                type: 'NOTE',
                                severity: 'LOW',
                                actor_user_id: currentUser.id,
                                summary: noteText.slice(0, 100),
                                details: { full_note: noteText }
                              });
                              setNoteText('');
                              setShowNoteForm(false);
                            }
                          }}
                          className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-[9px] h-6 px-2"
                        >
                          RECORD
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowNoteForm(false)}
                          className="text-[9px] h-6 px-2"
                        >
                          DISMISS
                        </Button>
                      </div>
                    </div>
                  )}
                </OpsPanelContent>
              </OpsPanel>
            </TabsContent>

            {/* AAR Tab */}
            <TabsContent value="aar" className="space-y-2 mt-3">
              <OpsPanel>
                <OpsPanelContent className="p-2">
                  <EventAAR eventId={event.id} eventTitle={event.title} />
                </OpsPanelContent>
              </OpsPanel>
              <AIAfterActionReportGenerator eventId={event.id} eventTitle={event.title} />
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map" className="mt-3">
              <div style={{ height: '500px' }}>
                <OpsMap eventId={event.id} readOnly={false} />
              </div>
            </TabsContent>
          </Tabs>

          {/* Compact Sidebar - 2 column at 1440p */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            <AITacticalAdvisor eventId={event.id} />
            <AIInsightsPanel eventId={event.id} />
            {canEditEvent(currentUser, event) && (
              <CommsConfig eventId={event.id} />
            )}
            <CommsPanel eventId={event.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  
  // Check for Detail View
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: events, isLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: () => base44.entities.Event.list(),
    initialData: []
  });

  const { users: allUsers, userById } = useUserDirectory();

  // Helper to get event status using severity system
  const getEventStatus = (event) => {
    const now = new Date();
    const start = new Date(event.start_time);
    const end = event.end_time ? new Date(event.end_time) : null;
    
    const statusLabel = 
      event.status === 'cancelled' || event.status === 'failed' || event.status === 'aborted' ? event.status.toUpperCase() :
      event.status === 'completed' ? 'COMPLETED' :
      event.status === 'active' || (now >= start && (!end || now <= end)) ? 'ACTIVE' :
      now < start ? 'UPCOMING' : 'SCHEDULED';
    
    const severity = getEventSeverity(event.status);
    
    return { label: statusLabel, color: getSeverityBadge(severity) };
  };

  // Helper to format time consistently
  const formatEventTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    };
  };

  // Render Detail View if ID is present
  if (id) {
    return <EventDetail id={id} />;
  }

  // Render List View
  return (
    <PageShell
      title="Operations Board"
      subtitle="Upcoming missions and deployments."
      actions={canCreateEvent(currentUser) && (
        <>
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="bg-red-900 hover:bg-red-800 text-white"
          >
            INITIALIZE OPERATION
          </Button>
          <EventForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </>
      )}
    >
      <div className="px-6 py-6">

        {isLoading ? (
           <LoadingState message="RETRIEVING OPERATIONS..." />
         ) : events.length === 0 ? (
          <EmptyState
            title="No Scheduled Operations"
            description="Initialize a new operation to begin planning."
            action={canCreateEvent(currentUser) && (
              <Button 
                onClick={() => setIsCreateOpen(true)} 
                className="bg-red-900 hover:bg-red-800 text-white text-xs"
              >
                INITIALIZE OPERATION
              </Button>
            )}
          />
         ) : (
          <div className="grid gap-4">
             {events.map((event) => {
               const creator = userById[event.created_by];
               return (
                <EventCard
                  key={event.id}
                  event={event}
                  creator={creator}
                  onActionClick={(evt) => window.location.href = createPageUrl(`Events?id=${evt.id}`)}
                />
              );
            })}
          </div>
         )}
          </div>
          </PageShell>
          );
          }