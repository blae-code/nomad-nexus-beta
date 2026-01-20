import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from "@/components/ui/OpsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight, Users, Clock, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { canCreateEvent, canEditEvent } from "@/components/permissions";
import { getEventSeverity, getSeverityBadge, getPrioritySeverity } from "@/components/utils/severitySystem";
import { typographyClasses } from "@/components/utils/typography";
import { cn } from "@/lib/utils";
import PageShell from "@/components/layout/PageShell";
import ActionBar from "@/components/layout/ActionBar";
import EventForm from "@/components/events/EventForm";
       import EventCommunicationLogs from "@/components/events/EventCommunicationLogs";
       import EventPostAnalysis from "@/components/events/EventPostAnalysis";

       // Imports specific to Detail View
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
             import NetDisciplineSystem from "@/components/comms/NetDisciplineSystem";
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

  const { data: creator } = useQuery({
    queryKey: ['event-creator', event?.created_by],
    queryFn: () => base44.entities.User.get(event.created_by),
    enabled: !!event?.created_by
  });

  const { data: allUsers } = useQuery({ queryKey: ['event-users-detail'], queryFn: () => base44.entities.User.list(), initialData: [] });
  const { data: allAssets } = useQuery({ queryKey: ['event-assets-detail'], queryFn: () => base44.entities.FleetAsset.list(), initialData: [] });

  if (isLoading) {
    return <div className="h-full flex items-center justify-center bg-zinc-950 text-zinc-500">RETRIEVING DATA...</div>;
  }

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950 text-center">
        <div>
          <h1 className="text-xl text-zinc-300 mb-4">OPERATION NOT FOUND</h1>
           <a href={createPageUrl('Events')}>
              <Badge variant="outline" className="hover:bg-zinc-800 cursor-pointer">RETURN TO BOARD</Badge>
           </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-full px-3 py-3 lg:px-4 lg:py-4">
        
        {/* Header / Nav */}
        <div className="mb-4">
          <a href={createPageUrl('Events')} className={cn("inline-flex items-center mb-4 transition-colors hover:text-red-500", typographyClasses.labelSecondary)}>
            <ArrowLeft className="w-3 h-3 mr-1" /> Back to Operations
          </a>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className={getSeverityBadge(
                      event.event_type === 'focused' ? 'critical' : 'nominal'
                  )}>
                    {event.event_type.toUpperCase()}
                  </Badge>
                  {event.priority && (
                     <Badge variant="outline" className={getSeverityBadge(
                        getPrioritySeverity(event.priority)
                     )}>
                        {event.priority}
                     </Badge>
                  )}
                  <span className={cn(typographyClasses.timestamp, "text-zinc-400")}>OP-ID: {event.id.slice(0,8)}</span>
                </div>
                <h1 className={cn(typographyClasses.commandTitle, "text-4xl")}>
                  {event.title}
                </h1>
             </div>
             
             {creator && (
               <div className="text-right">
                 <div className={typographyClasses.commandLabel}>Commanding Officer</div>
                 <div className={typographyClasses.callsign}>{creator.callsign || creator.rsi_handle || creator.email}</div>
               </div>
             )}
          </div>
          
          {canEditEvent(currentUser, event) && (
            <div className="mb-4 flex justify-end">
               <Button 
                 onClick={() => setIsEditOpen(true)}
                 variant="outline" 
                 size="sm"
                 className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
               >
                 MODIFY
               </Button>
               <EventForm 
                 event={event} 
                 open={isEditOpen} 
                 onOpenChange={setIsEditOpen} 
               />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-zinc-800 overflow-x-auto">
          {['briefing', 'timeline', 'aar', 'map'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn("px-4 py-2 transition-colors", typographyClasses.commandLabel, {
                'text-[#ea580c] border-b-2 border-[#ea580c]': activeTab === tab,
                'text-zinc-500 hover:text-zinc-300': activeTab !== tab
              })}
            >
              {tab === 'briefing' ? 'Mission Briefing' : tab === 'timeline' ? 'Timeline' : tab === 'aar' ? 'After Action Report' : 'Tactical Map'}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">

          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-3">

            {/* Mission Details */}
            {activeTab === 'briefing' && (
              <>
                <OpsPanel>
                  <OpsPanelHeader>
                    <OpsPanelTitle>Mission Briefing</OpsPanelTitle>
                  </OpsPanelHeader>
                  <OpsPanelContent className="text-zinc-400 space-y-6">
                    <p className="leading-relaxed">{event.description}</p>

                    {/* Objectives */}
                    <EventObjectives 
                       event={event} 
                       users={allUsers} 
                       assets={allAssets} 
                       canEdit={true} 
                    />

                    {/* Assigned Assets */}
                    {event.assigned_asset_ids && event.assigned_asset_ids.length > 0 && (
                       <div className="pt-4 border-t border-zinc-800/50">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 flex items-center gap-2">
                             <Rocket className="w-3 h-3" /> Deployed Assets
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                             {allAssets.filter(a => event.assigned_asset_ids.includes(a.id)).map(asset => (
                                <div key={asset.id} className="flex items-center gap-3 p-2 bg-zinc-950/50 border border-zinc-800/50">
                                   <div className="w-8 h-8 bg-blue-900/10 flex items-center justify-center text-blue-500 border border-blue-900/20">
                                      <Rocket className="w-4 h-4" />
                                   </div>
                                   <div>
                                      <div className="text-xs font-bold text-zinc-200">{asset.name}</div>
                                      <div className="text-[10px] text-zinc-500 uppercase">{asset.model}</div>
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-red-500" />
                        <div>
                          <div className={typographyClasses.commandLabel}>Date</div>
                          <div className={cn(typographyClasses.timestamp, "text-sm text-zinc-200")}>
                            {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-red-500" />
                        <div>
                          <div className={typographyClasses.commandLabel}>Start Time</div>
                          <div className={cn(typographyClasses.timestamp, "text-sm text-zinc-200")}>
                            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                        </div>
                      </div>
                      {event.end_time && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <div>
                            <div className={typographyClasses.commandLabel}>End Time</div>
                            <div className={cn(typographyClasses.timestamp, "text-sm text-zinc-200")}>
                              {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 col-span-full">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <div>
                          <div className={typographyClasses.commandLabel}>Location</div>
                          <div className={cn(typographyClasses.bodyLarge)}>{event.location || "Classified"}</div>
                        </div>
                      </div>
                    </div>
                  </OpsPanelContent>
                  </OpsPanel>

                  {/* Participants & Roles */}
                  <EventParticipants eventId={event.id} />

                  {/* Phase Gates & Readiness */}
                        <div className="grid grid-cols-2 gap-3">
                          <EventPhaseGates event={event} canEdit={canEditEvent(currentUser, event)} />
                          <EventReadinessChecklist event={event} canEdit={canEditEvent(currentUser, event)} />
                        </div>

                        {/* Command Staff & Squads */}
                        <div className="grid grid-cols-2 gap-3">
                          <EventCommandStaff event={event} canEdit={canEditEvent(currentUser, event)} />
                          <SquadManager eventId={event.id} />
                        </div>

                        {/* Communication Logs */}
                        <EventCommunicationLogs eventId={event.id} />

                        {/* Post-Event Analysis */}
                        <EventPostAnalysis event={event} canEdit={canEditEvent(currentUser, event)} />
                  </>
                  )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <OpsPanel>
                <OpsPanelHeader>
                  <OpsPanelTitle>Operational Timeline</OpsPanelTitle>
                </OpsPanelHeader>
                <OpsPanelContent>
                  <EventTimeline 
                    eventId={event.id}
                    onAddNote={() => setShowNoteForm(!showNoteForm)}
                  />
                  {showNoteForm && (
                    <div className="mt-4 pt-4 border-t border-zinc-700">
                      <div className="space-y-2">
                        <textarea
                           value={noteText}
                           onChange={(e) => setNoteText(e.target.value)}
                           placeholder="RECORD ENTRY..."
                          className="w-full bg-zinc-950 border border-zinc-700 text-white p-2 text-sm font-mono rounded"
                          rows="3"
                        />
                        <div className="flex gap-2">
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
                            className="bg-[#ea580c] hover:bg-[#c2410c] text-white text-[10px] h-7"
                          >
                            RECORD
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNoteForm(false)}
                            className="text-[10px] h-7"
                          >
                            DISMISS
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  </OpsPanelContent>
                  </OpsPanel>
                  )}

                  {/* AAR Tab */}
                  {activeTab === 'aar' && (
                    <div className="space-y-3">
                      <OpsPanel>
                        <OpsPanelHeader>
                          <OpsPanelTitle>After Action Report</OpsPanelTitle>
                        </OpsPanelHeader>
                        <OpsPanelContent>
                          <EventAAR eventId={event.id} eventTitle={event.title} />
                        </OpsPanelContent>
                      </OpsPanel>
                      <AIAfterActionReportGenerator eventId={event.id} eventTitle={event.title} />
                    </div>
                  )}

                {/* Map Tab */}
                {activeTab === 'map' && (
                <div style={{ height: '600px' }}>
                <OpsMap eventId={event.id} readOnly={false} />
                </div>
                )}

                </div>

          {/* Sidebar / Comms & AI Column */}
          <div className="space-y-3">

            {/* AI Tactical Advisor */}
            <AITacticalAdvisor eventId={event.id} />

            {/* AI Intelligence Layer */}
            <AIInsightsPanel eventId={event.id} />

            {/* Comms Configuration (Leaders Only) */}
            {canEditEvent(currentUser, event) && (
              <CommsConfig eventId={event.id} />
            )}

            {/* Player Status */}
            <PlayerStatusSection eventId={event.id} />

            {/* Economy Section */}
            <EventEconomy eventId={event.id} />

            {/* Comms Panel */}
            <div className="opacity-75 hover:opacity-100 transition-opacity">
               <CommsPanel eventId={event.id} />
            </div>

          </div>

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
    queryFn: () => base44.entities.Event.list({ sort: { start_time: -1 } }),
    initialData: []
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users-for-events'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

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
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-full px-3 py-3 lg:px-4 lg:py-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white">Operations Board</h1>
            <p className="text-zinc-500 mt-1">Upcoming missions and deployments.</p>
          </div>
          {canCreateEvent(currentUser) && (
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
        </div>

        {isLoading ? (
           <div className="text-center py-10 text-zinc-500">RETRIEVING OPERATIONS...</div>
         ) : (
          <div className="grid gap-4">
            {events.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <p className="text-zinc-500">NO SCHEDULED OPERATIONS</p>
              </div>
            ) : (
              events.map((event) => {
                const creator = allUsers.find(u => u.id === event.created_by);
                const eventTime = formatEventTime(event.start_time);
                const status = getEventStatus(event);
                
                return (
                  <OpsPanel key={event.id} className="hover:border-zinc-700 transition-colors group">
                    <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className={getSeverityBadge(
                            event.event_type === 'focused' ? 'critical' : 'nominal'
                          )}>
                            {event.event_type.toUpperCase()}
                          </Badge>
                          <span className="text-zinc-600 text-xs font-mono">
                            {eventTime.date} • {eventTime.time}
                          </span>
                        </div>
                        <h3 className={cn("text-xl mb-2 group-hover:text-red-500 transition-colors", typographyClasses.commandSubtitle)}>
                          {event.title}
                        </h3>
                        <p className={cn(typographyClasses.bodySmall, "line-clamp-2 max-w-2xl")}>
                          {event.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4 md:w-auto w-full justify-between md:justify-end">
                        <div className="text-right hidden md:block">
                          <div className={cn(typographyClasses.labelSecondary, "flex items-center justify-end gap-2 mb-1")}>
                            <MapPin className="w-3 h-3" />
                            {event.location || "TBD"}
                          </div>
                          <div className={cn(typographyClasses.labelSecondary, "flex items-center justify-end gap-2")}>
                               <Users className="w-3 h-3" />
                               {creator ? (creator.callsign || creator.rsi_handle || creator.email) : "Command"}
                          </div>
                        </div>
                        
                        <a href={createPageUrl(`Events?id=${event.id}`)}>
                           <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 hover:text-white">
                             ACCESS <ArrowRight className="w-4 h-4 ml-2" />
                           </Button>
                           </a>
                          </div>
                          </div>
                          </OpsPanel>
                );
              })
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}