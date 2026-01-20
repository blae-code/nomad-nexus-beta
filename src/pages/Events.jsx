import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, ArrowRight, Users, Clock, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { canCreateEvent, canEditEvent } from "@/components/permissions";
import { getEventSeverity, getPrioritySeverity, getSeverityBadge } from "@/components/utils/severitySystem";
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
    return <div className="h-full flex items-center justify-center bg-zinc-950 text-zinc-500">Loading Intelligence...</div>;
  }

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center bg-zinc-950 text-center">
        <div>
          <h1 className="text-xl text-zinc-300 mb-4">Operation Not Found</h1>
          <a href={createPageUrl('Events')}>
             <Badge variant="outline" className="hover:bg-zinc-800 cursor-pointer">Return to Operations Board</Badge>
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
          <a href={createPageUrl('Events')} className="inline-flex items-center text-xs text-zinc-500 hover:text-red-500 mb-4 transition-colors">
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
                     <Badge variant="outline" className={getSeverityBadge(getPrioritySeverity(event.priority))}>
                        {event.priority}
                     </Badge>
                  )}
                  <span className="text-zinc-500 text-xs font-mono tracking-widest">OP-ID: {event.id.slice(0,8)}</span>
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight text-white">
                  {event.title}
                </h1>
             </div>
             
             {creator && (
               <div className="text-right">
                 <div className="text-xs text-zinc-500 uppercase tracking-wider">Commanding Officer</div>
                 <div className="text-sm font-bold text-zinc-300">{creator.callsign || creator.rsi_handle || creator.email}</div>
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
                 Edit Mission
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
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                activeTab === tab
                  ? 'text-[#ea580c] border-b-2 border-[#ea580c]'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
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
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide">Mission Briefing</CardTitle>
                  </CardHeader>
                  <CardContent className="text-zinc-400 space-y-6">
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
                          <div className="text-[10px] text-zinc-500 uppercase">Date</div>
                          <div className="text-sm text-zinc-200">
                            {new Date(event.start_time).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase">Start Time</div>
                          <div className="text-sm text-zinc-200">
                            {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </div>
                        </div>
                      </div>
                      {event.end_time && (
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <div>
                            <div className="text-[10px] text-zinc-500 uppercase">End Time</div>
                            <div className="text-sm text-zinc-200">
                              {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3 col-span-full">
                        <MapPin className="w-4 h-4 text-red-500" />
                        <div>
                          <div className="text-[10px] text-zinc-500 uppercase">Location</div>
                          <div className="text-sm text-zinc-200">{event.location || "Classified"}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Participants & Roles */}
                <EventParticipants eventId={event.id} />

                {/* Squads / Assignments Manager */}
                <SquadManager eventId={event.id} />

                {/* Communication Logs */}
                <EventCommunicationLogs eventId={event.id} />

                {/* Post-Event Analysis */}
                <EventPostAnalysis event={event} canEdit={canEditEvent(currentUser, event)} />
              </>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide">Operational Timeline</CardTitle>
                </CardHeader>
                <CardContent>
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
                          placeholder="Add operational note..."
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
                            POST NOTE
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNoteForm(false)}
                            className="text-[10px] h-7"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AAR Tab */}
            {activeTab === 'aar' && (
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide">After Action Report</CardTitle>
                </CardHeader>
                <CardContent>
                  <EventAAR eventId={event.id} eventTitle={event.title} />
                </CardContent>
              </Card>
            )}

            {/* Map Tab */}
            {activeTab === 'map' && (
              <div style={{ height: '600px' }}>
                <OpsMap eventId={event.id} readOnly={false} />
              </div>
            )}

            </div>

          {/* Sidebar / Comms Column */}
          <div className="space-y-3">
            
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

            {/* Comms Panel Placeholder */}
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
    
    let statusLabel, severity;
    
    if (event.status === 'cancelled' || event.status === 'failed' || event.status === 'aborted') {
      statusLabel = event.status.toUpperCase();
      severity = getEventSeverity(event.status);
    } else if (event.status === 'completed') {
      statusLabel = 'COMPLETED';
      severity = getEventSeverity(event.status);
    } else if (event.status === 'active' || (now >= start && (!end || now <= end))) {
      statusLabel = 'ACTIVE';
      severity = getEventSeverity('active');
    } else if (now < start) {
      statusLabel = 'UPCOMING';
      severity = getEventSeverity('scheduled');
    } else {
      statusLabel = 'SCHEDULED';
      severity = getEventSeverity('scheduled');
    }
    
    return { label: statusLabel, badge: getSeverityBadge(severity) };
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
                Create Operation
              </Button>
              <EventForm open={isCreateOpen} onOpenChange={setIsCreateOpen} />
            </>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-zinc-500">Loading operations...</div>
        ) : (
          <div className="grid gap-4">
            {events.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                <p className="text-zinc-500">No active operations found.</p>
              </div>
            ) : (
              events.map((event) => {
                const creator = allUsers.find(u => u.id === event.created_by);
                const eventTime = formatEventTime(event.start_time);
                const status = getEventStatus(event);
                
                return (
                  <Card key={event.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors group">
                    <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <Badge variant="outline" className={status.badge}>
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
                        <h3 className="text-xl font-bold text-zinc-100 mb-2 group-hover:text-red-500 transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl">
                          {event.description}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4 md:w-auto w-full justify-between md:justify-end">
                        <div className="text-right hidden md:block">
                          <div className="flex items-center justify-end gap-2 text-zinc-500 text-xs mb-1">
                            <MapPin className="w-3 h-3" />
                            {event.location || "TBD"}
                          </div>
                          <div className="flex items-center justify-end gap-2 text-zinc-500 text-xs">
                             <Users className="w-3 h-3" />
                             {creator ? (creator.callsign || creator.rsi_handle || creator.email) : "Command"}
                          </div>
                        </div>
                        
                        <a href={createPageUrl(`Events?id=${event.id}`)}>
                          <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800 hover:text-white">
                            View Intel <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
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