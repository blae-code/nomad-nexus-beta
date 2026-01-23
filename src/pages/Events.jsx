import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from "@/components/ui/OpsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, ArrowRight, Users, Clock, ArrowLeft, ChevronDown } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from 'react-router-dom';
import { canCreateEvent, canEditEvent } from "@/components/permissions";
import { getEventSeverity, getSeverityBadge, getPrioritySeverity } from "@/components/utils/severitySystem";
import { TYPOGRAPHY } from "@/components/utils/typographySystem";
import { cn } from "@/lib/utils";
import EventForm from "@/components/events/EventForm";
import EventCard from "@/components/events/EventCard";
import EventActionBar from "@/components/events/EventActionBar";
import LoadingState from "@/components/feedback/LoadingState";
import EmptyState from "@/components/feedback/EmptyState";
import EventCommunicationLogs from "@/components/events/EventCommunicationLogs";
import EventPostAnalysis from "@/components/events/EventPostAnalysis";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";
import EventDeleteDialog from "@/components/events/EventDeleteDialog";
import CommsPanel from "@/components/events/CommsPanel";
import SquadManager from "@/components/events/SquadManager";
import EventPlanningWizard from "@/components/events/EventPlanningWizard";
import SquadCommsSetup from "@/components/events/SquadCommsSetup";
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
import EventCalendarView from "@/components/events/EventCalendarView";
import EventRoleManager from "@/components/events/EventRoleManager";
import EventReportExporter from "@/components/events/EventReportExporter";
import { Rocket } from "lucide-react";

function EventDetail({ id }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('briefing');
  const [showNoteForm, setShowNoteForm] = React.useState(false);
  const [noteText, setNoteText] = React.useState('');
  const [expandedSections, setExpandedSections] = React.useState({
    objectives: false,
    assets: false,
    participants: false
  });

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

  const { users: allUsers, userById } = useUserDirectory();
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

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="h-full flex flex-col overflow-hidden px-3 py-2 lg:px-4 lg:py-3 max-w-full">
        
          {/* Ultra-Compact Header */}
          <div className="shrink-0 mb-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button 
                  onClick={() => window.location.href = createPageUrl('Events')}
                  className="text-[9px] text-zinc-500 hover:text-[#ea580c] transition-colors shrink-0"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>
                
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge variant="outline" className={cn(getSeverityBadge(event.event_type === 'focused' ? 'critical' : 'nominal'), "text-[8px] h-4")} size="sm">
                    {event.event_type.toUpperCase()}
                  </Badge>
                  {event.priority && (
                    <Badge variant="outline" className={cn(getSeverityBadge(getPrioritySeverity(event.priority)), "text-[8px] h-4")} size="sm">
                      {event.priority}
                    </Badge>
                  )}
                  <h1 className="text-sm font-bold text-white truncate">
                    {event.title}
                  </h1>
                  <span className="text-[8px] text-zinc-500 font-mono shrink-0">
                    {event.id.slice(0, 8)}
                  </span>
                </div>
              </div>

              <EventActionBar
                event={event}
                currentUser={currentUser}
                onModify={() => setIsEditOpen(true)}
                onDelete={() => setIsDeleteOpen(true)}
                className="inline-flex gap-1 shrink-0"
              />
            </div>
            <EventForm 
              event={event} 
              open={isEditOpen} 
              onOpenChange={setIsEditOpen} 
            />
            <EventDeleteDialog
              event={event}
              open={isDeleteOpen}
              onOpenChange={setIsDeleteOpen}
              onSuccess={() => window.location.href = createPageUrl('Events')}
            />
          </div>

          {/* Ultra-Compact Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="h-7 gap-0.5 shrink-0 mb-2">
              {[
                { id: 'briefing', label: 'Briefing' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'aar', label: 'AAR' },
                { id: 'map', label: 'Tactical' }
              ].map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-[9px] h-6 px-2">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Briefing Tab - Grid layout, no scroll */}
            <TabsContent value="briefing" className="flex-1 min-h-0 flex flex-col gap-2 mt-0">
              {/* Summary Bar - Single line */}
              <div className="shrink-0 border border-zinc-800 bg-zinc-950/50 p-2">
                <div className="flex items-center justify-between gap-3 text-[9px]">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-zinc-500 shrink-0">START:</span>
                    <span className="text-zinc-200">{new Date(event.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="text-zinc-700">•</span>
                    <span className="text-zinc-500 shrink-0">LOC:</span>
                    <span className="text-zinc-200 truncate">{event.location || "TBD"}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-zinc-500">CO:</span>
                    <span className="text-zinc-200">{creator?.callsign || "Unknown"}</span>
                  </div>
                </div>
              </div>

              {/* Main Grid - 2 columns */}
              <div className="flex-1 min-h-0 grid grid-cols-3 gap-2 overflow-hidden">

                {/* Column 1: Control & Status */}
                <div className="space-y-2 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <EventPhaseGates event={event} canEdit={canEditEvent(currentUser, event)} />
                    <EventReadinessChecklist event={event} canEdit={canEditEvent(currentUser, event)} />
                  </div>
                  <EventCommandStaff event={event} canEdit={canEditEvent(currentUser, event)} />
                  <EventObjectives 
                    event={event} 
                    users={allUsers} 
                    assets={allAssets} 
                    canEdit={canEditEvent(currentUser, event)} 
                  />
                </div>

                {/* Column 2: Personnel & Comms */}
                <div className="space-y-2 overflow-y-auto">
                  <EventRoleManager eventId={event.id} canEdit={canEditEvent(currentUser, event)} />
                  <EventParticipants eventId={event.id} />
                  <SquadManager eventId={event.id} />
                  <CommsPanel eventId={event.id} />
                  <PlayerStatusSection eventId={event.id} />
                </div>

                {/* Column 3: AI & Analysis */}
                <div className="space-y-2 overflow-y-auto">
                  <EventReportExporter eventId={event.id} />
                  <AITacticalAdvisor eventId={event.id} />
                  <AIInsightsPanel eventId={event.id} />
                  <EventEconomy eventId={event.id} />
                  {canEditEvent(currentUser, event) && (
                    <CommsConfig eventId={event.id} />
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="flex-1 min-h-0 flex flex-col mt-0">
              <div className="flex-1 min-h-0 overflow-y-auto p-2 border border-zinc-800 bg-zinc-950/50">
                <EventTimeline 
                  eventId={event.id}
                  onAddNote={() => setShowNoteForm(!showNoteForm)}
                />
              </div>
              {showNoteForm && (
                <div className="shrink-0 mt-2 p-2 border border-zinc-800 bg-zinc-900/50 space-y-2">
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
            </TabsContent>

            {/* AAR Tab */}
            <TabsContent value="aar" className="flex-1 min-h-0 overflow-y-auto mt-0 p-2 border border-zinc-800 bg-zinc-950/50">
              <EventAAR eventId={event.id} eventTitle={event.title} event={event} />
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value="map" className="flex-1 min-h-0 mt-0">
              <OpsMap eventId={event.id} readOnly={false} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardData, setWizardData] = useState(null);
  const [showCommsSetup, setShowCommsSetup] = useState(false);
  const [newEventId, setNewEventId] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'

  // Check for Detail View
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Only fetch events if user can view them (permission check)
  const { data: events, isLoading } = useQuery({
    queryKey: ['events-list'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.list();
      // Filter out archived/deleted events
      return allEvents.filter(e => e.phase !== 'ARCHIVED');
    },
    initialData: [],
    enabled: !!currentUser
  });

  const { users: allUsers, userById } = useUserDirectory();

  // Render Detail View if ID is present
  if (id) {
    return <EventDetail id={id} />;
  }

  // Render List View - Compact layout for 1440p
  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden pt-14">
      {/* Header */}
      <div className="shrink-0 border-b border-zinc-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h2 className={cn(TYPOGRAPHY.H2, "text-white text-xl")}>OPERATIONS BOARD</h2>
             <p className={cn(TYPOGRAPHY.LABEL_SM, "text-zinc-500")}>Upcoming missions and deployments</p>
          </div>
          <div className="flex gap-2">
            <div className="flex border border-zinc-800 h-7">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "px-3 text-[9px] font-mono uppercase tracking-wider transition-colors",
                  viewMode === 'list' ? "bg-[#ea580c] text-white" : "text-zinc-400 hover:text-zinc-300"
                )}
              >
                LIST
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "px-3 text-[9px] font-mono uppercase tracking-wider transition-colors",
                  viewMode === 'calendar' ? "bg-[#ea580c] text-white" : "text-zinc-400 hover:text-zinc-300"
                )}
              >
                CALENDAR
              </button>
            </div>
            {canCreateEvent(currentUser) && (
              <Button 
                onClick={() => setShowWizard(true)} 
                className="bg-red-900 hover:bg-red-800 text-white text-xs h-7 px-3"
              >
                INITIALIZE OPERATION
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content - No scroll at 1440p */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 py-2">
          {isLoading ? (
            <LoadingState message="RETRIEVING OPERATIONS..." />
          ) : events.length === 0 ? (
            <EmptyState
               title="No Scheduled Operations"
               description="Initialize a new operation to begin planning."
               action={canCreateEvent(currentUser) && (
                 <Button 
                   onClick={() => setShowWizard(true)} 
                   className="bg-red-900 hover:bg-red-800 text-white text-xs"
                 >
                   INITIALIZE OPERATION
                 </Button>
               )}
             />
          ) : viewMode === 'calendar' ? (
            <EventCalendarView />
          ) : (
            <div className="grid gap-2">
               {events.map((event) => {
                 const creator = userById[event.created_by];
                 return (
                   <Link 
                     key={event.id}
                     to={createPageUrl(`OperationControl?id=${event.id}`)}
                     className="hover:opacity-80 transition-opacity"
                   >
                     <EventCard
                       event={event}
                       creator={creator}
                       onActionClick={() => {}}
                     />
                   </Link>
                 );
               })}
             </div>
          )}
        </div>
      </div>

      {/* Step 1: Planning Wizard */}
      <EventPlanningWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        currentUser={currentUser}
        onComplete={(data) => {
          setWizardData(data);
          setShowWizard(false);
          setShowCommsSetup(true);
        }}
      />

      {/* Step 2: Squad & Comms Setup (creates squads + nets after event created) */}
      <SquadCommsSetup
        open={showCommsSetup && !!wizardData}
        onOpenChange={setShowCommsSetup}
        eventData={wizardData}
        eventId={wizardData?.eventId}
        onSuccess={() => {
          // After comms setup, redirect to event detail
          if (wizardData?.eventId) {
            window.location.href = createPageUrl(`Events?id=${wizardData.eventId}`);
          }
        }}
      />
    </div>
  );
}