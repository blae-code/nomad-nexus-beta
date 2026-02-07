import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Clock, Users, MapPin, Power, UserPlus, Target, CheckCircle, Circle, FileText, BarChart3, Edit, Trash2 } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/common/UIStates';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { createPageUrl } from '@/utils';
import EventCalendarView from '@/components/events/EventCalendarView';
import EventTemplateManager from '@/components/events/EventTemplateManager';
import EventRecurrenceManager from '@/components/events/EventRecurrenceManager';
import EventNotificationManager from '@/components/events/EventNotificationManager';
import MissionBlueprints from '@/components/missions/MissionBlueprints';
import SmartScheduling from '@/components/missions/SmartScheduling';
import ThreatDatabase from '@/components/missions/ThreatDatabase';
import OperationPlanner from '@/components/missions/OperationPlanner';
import EventRiskAssessment from '@/components/events/EventRiskAssessment';
import ResourceManagement from '@/components/events/ResourceManagement';
import PostEventAnalysis from '@/components/events/PostEventAnalysis';
import MissionControlAdvancedPanel from '@/components/missions/MissionControlAdvancedPanel';

export default function MissionControl() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [operationModeFilter, setOperationModeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateObjective, setShowCreateObjective] = useState(false);
  const [showAARCreator, setShowAARCreator] = useState(false);
  
  // Event form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    start_time: '',
    location: '',
    event_type: 'casual',
    priority: 'STANDARD',
    recurrence: null,
    notifications: [],
    training_prerequisites: '',
  });

  const [showRecurrence, setShowRecurrence] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPlanningTools, setShowPlanningTools] = useState(null);

  // Objective form
  const [objectiveForm, setObjectiveForm] = useState({
    text: '',
  });

  // AAR form
  const [aarForm, setAARForm] = useState({
    summary: '',
    successes: '',
    challenges: '',
    lessons_learned: '',
    feedback: '',
    tags: '',
    key_moments: [],
  });
  const [keyMomentInput, setKeyMomentInput] = useState('');

  const activeOp = useActiveOp();
  const { user } = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    const eventsList = await base44.entities.Event.list('-start_time', 50);
    setEvents(eventsList);
    if (eventsList.length > 0 && !selectedEvent) {
      setSelectedEvent(eventsList[0]);
      loadEventDetails(eventsList[0].id);
    }
    setLoading(false);
  };

  const loadEventDetails = async (eventId) => {
    const event = await base44.entities.Event.filter({ id: eventId });
    if (event.length > 0) {
      setSelectedEvent(event[0]);
    }
  };

  const createEvent = async () => {
    if (!eventForm.title || !eventForm.start_time) return;
    await base44.entities.Event.create({
      ...eventForm,
      status: 'scheduled',
      phase: 'PLANNING',
      host_id: user.id,
    });
    setEventForm({
      title: '',
      description: '',
      start_time: '',
      location: '',
      event_type: 'casual',
      priority: 'STANDARD',
      recurrence: null,
      notifications: [],
      training_prerequisites: '',
    });
    setShowRecurrence(false);
    setShowNotifications(false);
    setShowCreateEvent(false);
    loadEvents();
  };

  const handleTemplateSelect = (templateData) => {
    setEventForm((prev) => ({
      ...prev,
      ...templateData,
      start_time: prev.start_time || '',
    }));
    setShowTemplates(false);
  };

  const handleBlueprintSelect = (blueprintTemplate) => {
    setEventForm((prev) => ({
      ...prev,
      ...blueprintTemplate,
      start_time: prev.start_time || '',
    }));
    setShowPlanningTools(null);
  };

  const handleScheduleSelected = (scheduleData) => {
    setEventForm((prev) => ({
      ...prev,
      start_time: scheduleData.start_time,
    }));
    setShowPlanningTools(null);
  };

  const addObjective = async () => {
    if (!objectiveForm.text.trim() || !selectedEvent) return;
    const objectives = selectedEvent.objectives || [];
    const newObjective = {
      id: `obj_${Date.now()}`,
      text: objectiveForm.text.trim(),
      is_completed: false,
      assignments: [],
      sub_tasks: [],
    };
    
    await base44.entities.Event.update(selectedEvent.id, {
      objectives: [...objectives, newObjective],
    });

    setObjectiveForm({ text: '' });
    setShowCreateObjective(false);
    loadEventDetails(selectedEvent.id);
  };

  const toggleObjective = async (objectiveId) => {
    if (!selectedEvent) return;
    const objectives = selectedEvent.objectives.map(obj =>
      obj.id === objectiveId ? { ...obj, is_completed: !obj.is_completed } : obj
    );
    await base44.entities.Event.update(selectedEvent.id, { objectives });
    loadEventDetails(selectedEvent.id);
  };

  const deleteObjective = async (objectiveId) => {
    if (!selectedEvent) return;
    const objectives = selectedEvent.objectives.filter(obj => obj.id !== objectiveId);
    await base44.entities.Event.update(selectedEvent.id, { objectives });
    loadEventDetails(selectedEvent.id);
  };

  const updateRSVP = async (status) => {
    if (!selectedEvent || !user?.id) return;
    const going = new Set(selectedEvent.rsvp_going_ids || []);
    const maybe = new Set(selectedEvent.rsvp_maybe_ids || []);
    const declined = new Set(selectedEvent.rsvp_declined_ids || []);

    going.delete(user.id);
    maybe.delete(user.id);
    declined.delete(user.id);

    if (status === 'going') going.add(user.id);
    if (status === 'maybe') maybe.add(user.id);
    if (status === 'declined') declined.add(user.id);

    await base44.entities.Event.update(selectedEvent.id, {
      rsvp_going_ids: Array.from(going),
      rsvp_maybe_ids: Array.from(maybe),
      rsvp_declined_ids: Array.from(declined),
    });
    loadEventDetails(selectedEvent.id);
  };

  const createAAR = async () => {
    if (!aarForm.summary.trim() || !selectedEvent) return;
    await base44.entities.EventReport.create({
      event_id: selectedEvent.id,
      report_type: 'AAR_ENTRY',
      summary: aarForm.summary,
      successes: aarForm.successes,
      challenges: aarForm.challenges,
      lessons_learned: aarForm.lessons_learned,
      feedback: aarForm.feedback,
      tags: aarForm.tags ? aarForm.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      key_moments: aarForm.key_moments,
      created_by: user.id,
    });

    setAARForm({
      summary: '',
      successes: '',
      challenges: '',
      lessons_learned: '',
      feedback: '',
      tags: '',
      key_moments: [],
    });
    setKeyMomentInput('');
    setShowAARCreator(false);
    setActiveTab('reports');
  };

  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (selectedEvent) {
      loadReports(selectedEvent.id);
    }
  }, [selectedEvent]);

  const loadReports = async (eventId) => {
    const reportsList = await base44.entities.EventReport.filter({ event_id: eventId }, '-created_date');
    setReports(reportsList);
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'text-blue-400 border-blue-500/50 bg-blue-500/10',
      active: 'text-green-400 border-green-500/50 bg-green-500/10',
      completed: 'text-zinc-500 border-zinc-600 bg-zinc-500/10',
      cancelled: 'text-red-400 border-red-500/50 bg-red-500/10',
    };
    return colors[status] || 'text-zinc-400 border-zinc-600 bg-zinc-400/10';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      CRITICAL: 'text-red-400',
      HIGH: 'text-orange-400',
      STANDARD: 'text-yellow-400',
      LOW: 'text-green-400',
    };
    return colors[priority] || 'text-zinc-400';
  };

  const linkedMissions = Array.isArray(selectedEvent?.linked_missions)
    ? selectedEvent.linked_missions
    : Array.isArray(selectedEvent?.mission_catalog_entries)
    ? selectedEvent.mission_catalog_entries
    : [];

  const filteredEvents = events.filter((event) => {
    if (operationModeFilter === 'all') return true;
    return String(event?.event_type || '').toLowerCase() === operationModeFilter;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <LoadingState label="Loading Operations Control" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Operations Control</h1>
          <p className="text-zinc-400 text-sm">Plan and run player-led operations in Casual or Focused mode</p>
        </div>
        <div className="flex gap-2">
           <a
             href={createPageUrl('CommsConsole')}
             className="inline-flex items-center rounded border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-orange-500/50 hover:text-white transition"
           >
             🎙 Open Comms
           </a>
           <Button onClick={() => setShowTemplates(true)} variant="outline">
             📋 Templates
           </Button>
           <Button onClick={() => setShowPlanningTools('blueprints')} variant="outline">
             ⚙️ AI Planning
           </Button>
           <Button onClick={() => setShowCreateEvent(true)}>
             <Plus className="w-4 h-4 mr-2" />
             New Operation
           </Button>
         </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Domain Model</div>
          <div className="text-xs text-zinc-300 mt-1">Operations are player-led events. Missions are in-game activities.</div>
        </div>
        <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Operation Voice</div>
          <div className="text-xs text-orange-300 mt-1">Real-time voice comms required for all active operations.</div>
        </div>
        <div className="p-3 border border-zinc-800 rounded bg-zinc-900/40">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Contract Work</div>
          <div className="text-xs text-zinc-300 mt-1">Use Contract Exchange for async player jobs and commerce.</div>
        </div>
      </div>

      {/* Calendar View */}
      <div className="mb-6">
        <EventCalendarView events={filteredEvents} onEventClick={(event) => {
          setSelectedEvent(event);
          loadEventDetails(event.id);
        }} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Events List */}
        <div className="col-span-1 space-y-2">
          <h2 className="text-sm font-bold text-zinc-400 uppercase mb-2">Operations</h2>
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={operationModeFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setOperationModeFilter('all')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={operationModeFilter === 'casual' ? 'default' : 'outline'}
              onClick={() => setOperationModeFilter('casual')}
            >
              Casual
            </Button>
            <Button
              size="sm"
              variant={operationModeFilter === 'focused' ? 'default' : 'outline'}
              onClick={() => setOperationModeFilter('focused')}
            >
              Focused
            </Button>
          </div>
          {filteredEvents.length === 0 ? (
            <EmptyState 
              icon={Calendar}
              title="No operations"
              message="Create an operation or switch mode filter"
            />
          ) : (
            filteredEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  loadEventDetails(event.id);
                }}
                className={`w-full text-left p-4 border transition-all ${
                  selectedEvent?.id === event.id
                    ? 'bg-orange-500/20 border-orange-500'
                    : 'bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white text-sm uppercase">{event.title}</h3>
                  <span className={`text-[10px] font-bold uppercase ${getPriorityColor(event.priority)}`}>
                    {event.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {new Date(event.start_time).toLocaleDateString()}
                </div>
                <div className={`mt-2 px-2 py-1 text-[10px] font-bold uppercase border inline-block ${getStatusColor(event.status)}`}>
                  {event.status}
                </div>
                <div className="mt-2 text-[10px] uppercase text-zinc-500">
                  Mode: <span className="text-zinc-300">{event.event_type || 'casual'}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Event Details */}
        <div className="col-span-2">
          {!selectedEvent ? (
            <EmptyState 
              icon={Target}
              title="Select an operation"
              message="Choose an operation to view details"
            />
          ) : (
            <div className="bg-zinc-900/50 border-2 border-zinc-800 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-white uppercase mb-2">{selectedEvent.title}</h2>
                  <p className="text-zinc-400 text-sm mb-4">{selectedEvent.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedEvent.start_time).toLocaleString()}
                    </div>
                    {selectedEvent.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {selectedEvent.location}
                      </div>
                    )}
                    {selectedEvent.assigned_user_ids?.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {selectedEvent.assigned_user_ids.length} assigned
                      </div>
                    )}
                  </div>
                  {selectedEvent.training_prerequisites && (
                    <div className="mt-3 text-xs text-orange-300">
                      Training prerequisites: {selectedEvent.training_prerequisites}
                    </div>
                  )}
                  <div className="mt-3">
                    <div className="text-[10px] uppercase text-zinc-500 tracking-widest">Linked Game Missions</div>
                    {linkedMissions.length === 0 ? (
                      <div className="text-xs text-zinc-500 mt-1">
                        No missions linked yet.
                        <a href={createPageUrl('MissionCatalog')} className="ml-1 text-orange-300 hover:text-orange-200 underline">
                          Open Mission Catalog
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {linkedMissions.slice(0, 5).map((mission) => (
                          <span
                            key={mission.id || mission.title}
                            className="text-[10px] text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded uppercase"
                          >
                            {mission.title || mission.id}
                          </span>
                        ))}
                        {linkedMissions.length > 5 && (
                          <span className="text-[10px] text-zinc-500">+{linkedMissions.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={activeOp.activeEventId === selectedEvent.id ? 'default' : 'outline'}
                    onClick={() => {
                      if (activeOp.activeEventId === selectedEvent.id) {
                        activeOp.clearActiveEvent();
                      } else {
                        activeOp.setActiveEvent(selectedEvent.id);
                      }
                    }}
                  >
                    <Power className="w-3 h-3 mr-1" />
                    {activeOp.activeEventId === selectedEvent.id ? 'Active' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab('reports')}>
                    View Reports
                  </Button>
                </div>
              </div>

              <div className="mb-6 grid grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
                  <div className="text-[10px] uppercase text-zinc-500">Going</div>
                  <div className="text-lg font-bold text-green-400">{(selectedEvent.rsvp_going_ids || []).length}</div>
                  <Button size="sm" variant="outline" onClick={() => updateRSVP('going')} className="mt-2 w-full">RSVP Going</Button>
                </div>
                <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
                  <div className="text-[10px] uppercase text-zinc-500">Maybe</div>
                  <div className="text-lg font-bold text-yellow-400">{(selectedEvent.rsvp_maybe_ids || []).length}</div>
                  <Button size="sm" variant="outline" onClick={() => updateRSVP('maybe')} className="mt-2 w-full">RSVP Maybe</Button>
                </div>
                <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded">
                  <div className="text-[10px] uppercase text-zinc-500">Declined</div>
                  <div className="text-lg font-bold text-red-400">{(selectedEvent.rsvp_declined_ids || []).length}</div>
                  <Button size="sm" variant="outline" onClick={() => updateRSVP('declined')} className="mt-2 w-full">RSVP Decline</Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">
                    <Calendar className="w-4 h-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="objectives">
                    <Target className="w-4 h-4 mr-2" />
                    Objectives
                  </TabsTrigger>
                  <TabsTrigger value="risk">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Risk Analysis
                  </TabsTrigger>
                  <TabsTrigger value="resources">
                    <Users className="w-4 h-4 mr-2" />
                    Resources
                  </TabsTrigger>
                  <TabsTrigger value="reports">
                    <FileText className="w-4 h-4 mr-2" />
                    Reports
                  </TabsTrigger>
                  <TabsTrigger value="advanced">
                    <Target className="w-4 h-4 mr-2" />
                    Advanced Ops
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
                      <div className="text-xs text-zinc-400 mb-1">Mode</div>
                      <div className="text-sm font-bold text-white uppercase">{selectedEvent.event_type}</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
                      <div className="text-xs text-zinc-400 mb-1">Phase</div>
                      <div className="text-sm font-bold text-white uppercase">{selectedEvent.phase}</div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
                      <div className="text-xs text-zinc-400 mb-1">Priority</div>
                      <div className={`text-sm font-bold uppercase ${getPriorityColor(selectedEvent.priority)}`}>
                        {selectedEvent.priority}
                      </div>
                    </div>
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
                      <div className="text-xs text-zinc-400 mb-1">Status</div>
                      <div className="text-sm font-bold text-white uppercase">{selectedEvent.status}</div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="objectives" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase">Operation Objectives</h3>
                    <Button size="sm" onClick={() => setShowCreateObjective(true)}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Objective
                    </Button>
                  </div>

                  {showCreateObjective && (
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
                      <Input
                        value={objectiveForm.text}
                        onChange={(e) => setObjectiveForm({ text: e.target.value })}
                        placeholder="Objective description..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addObjective}>Create</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowCreateObjective(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {(!selectedEvent.objectives || selectedEvent.objectives.length === 0) ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No objectives set for this operation
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvent.objectives.map((objective) => (
                        <div
                          key={objective.id}
                          className={`p-4 border rounded flex items-start justify-between ${
                            objective.is_completed
                              ? 'bg-green-500/10 border-green-500/30'
                              : 'bg-zinc-800/50 border-zinc-700'
                          }`}
                        >
                          <button
                            onClick={() => toggleObjective(objective.id)}
                            className="flex items-start gap-3 flex-1 text-left"
                          >
                            {objective.is_completed ? (
                              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm ${objective.is_completed ? 'text-green-300 line-through' : 'text-white'}`}>
                              {objective.text}
                            </span>
                          </button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteObjective(objective.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="risk" className="space-y-4 mt-4">
                  <EventRiskAssessment event={selectedEvent} />
                </TabsContent>

                <TabsContent value="resources" className="space-y-4 mt-4">
                  <ResourceManagement event={selectedEvent} onUpdate={() => loadEventDetails(selectedEvent.id)} />
                </TabsContent>

                <TabsContent value="reports" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase">After Action Reports</h3>
                    <Button size="sm" onClick={() => setShowAARCreator(true)}>
                      <Plus className="w-3 h-3 mr-1" />
                      Create AAR
                    </Button>
                  </div>

                  {showAARCreator && (
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
                      <Textarea
                        value={aarForm.summary}
                        onChange={(e) => setAARForm({ ...aarForm, summary: e.target.value })}
                        placeholder="Operation summary..."
                        className="min-h-[80px]"
                      />
                      <Textarea
                        value={aarForm.successes}
                        onChange={(e) => setAARForm({ ...aarForm, successes: e.target.value })}
                        placeholder="What went well..."
                        className="min-h-[60px]"
                      />
                      <Textarea
                        value={aarForm.challenges}
                        onChange={(e) => setAARForm({ ...aarForm, challenges: e.target.value })}
                        placeholder="Challenges faced..."
                        className="min-h-[60px]"
                      />
                      <Textarea
                        value={aarForm.lessons_learned}
                        onChange={(e) => setAARForm({ ...aarForm, lessons_learned: e.target.value })}
                        placeholder="Lessons learned..."
                        className="min-h-[60px]"
                      />
                      <Textarea
                        value={aarForm.feedback}
                        onChange={(e) => setAARForm({ ...aarForm, feedback: e.target.value })}
                        placeholder="Feedback for leadership or logistics..."
                        className="min-h-[60px]"
                      />
                      <Input
                        value={aarForm.tags}
                        onChange={(e) => setAARForm({ ...aarForm, tags: e.target.value })}
                        placeholder="Tags (comma-separated)"
                      />
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={keyMomentInput}
                            onChange={(e) => setKeyMomentInput(e.target.value)}
                            placeholder="Add key moment (e.g., 'Bravo wing secured LZ')"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!keyMomentInput.trim()) return;
                              setAARForm((prev) => ({
                                ...prev,
                                key_moments: [...prev.key_moments, keyMomentInput.trim()],
                              }));
                              setKeyMomentInput('');
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {aarForm.key_moments.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {aarForm.key_moments.map((moment, idx) => (
                              <span key={`${moment}-${idx}`} className="text-[10px] text-zinc-300 border border-zinc-600 px-2 py-1 rounded">
                                {moment}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={createAAR}>Submit Report</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAARCreator(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {reports.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      No reports filed for this operation
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Post-Event Analysis */}
                      {selectedEvent.status === 'completed' && (
                        <div className="border-b border-zinc-700 pb-6">
                          <h4 className="text-sm font-bold text-zinc-400 uppercase mb-4">Automated Analysis</h4>
                          <PostEventAnalysis event={selectedEvent} />
                        </div>
                      )}

                      {reports.map((report) => (
                        <div key={report.id} className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-orange-400" />
                              <span className="text-xs font-bold text-zinc-400 uppercase">{report.report_type}</span>
                            </div>
                            <span className="text-xs text-zinc-500">
                              {new Date(report.created_date).toLocaleDateString()}
                            </span>
                          </div>
                          
                          <div>
                            <div className="text-xs text-zinc-400 mb-1">Summary</div>
                            <div className="text-sm text-white">{report.summary}</div>
                          </div>

                          {report.successes && (
                            <div>
                              <div className="text-xs text-green-400 mb-1">Successes</div>
                              <div className="text-sm text-zinc-300">{report.successes}</div>
                            </div>
                          )}

                          {report.challenges && (
                            <div>
                              <div className="text-xs text-yellow-400 mb-1">Challenges</div>
                              <div className="text-sm text-zinc-300">{report.challenges}</div>
                            </div>
                          )}

                          {report.lessons_learned && (
                            <div>
                              <div className="text-xs text-blue-400 mb-1">Lessons Learned</div>
                              <div className="text-sm text-zinc-300">{report.lessons_learned}</div>
                            </div>
                          )}

                          {report.feedback && (
                            <div>
                              <div className="text-xs text-purple-400 mb-1">Feedback</div>
                              <div className="text-sm text-zinc-300">{report.feedback}</div>
                            </div>
                          )}

                          {Array.isArray(report.key_moments) && report.key_moments.length > 0 && (
                            <div>
                              <div className="text-xs text-orange-400 mb-1">Key Moments</div>
                              <div className="flex flex-wrap gap-2">
                                {report.key_moments.map((moment, idx) => (
                                  <span key={`${moment}-${idx}`} className="text-[10px] text-zinc-300 border border-zinc-700 px-2 py-1 rounded">
                                    {moment}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {Array.isArray(report.tags) && report.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {report.tags.map((tag, idx) => (
                                <span key={`${tag}-${idx}`} className="text-[10px] text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded uppercase">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="advanced" className="space-y-4 mt-4">
                  <MissionControlAdvancedPanel
                    event={selectedEvent}
                    allEvents={events}
                    onRefresh={() => {
                      loadEventDetails(selectedEvent.id);
                      loadReports(selectedEvent.id);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]">
          <div className="bg-zinc-900 border-2 border-orange-500/50 p-6 max-w-2xl w-full mx-4 rounded-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-black text-white uppercase mb-6">Event Templates</h2>
            <EventTemplateManager onTemplateSelect={handleTemplateSelect} />
            <div className="mt-6">
              <Button onClick={() => setShowTemplates(false)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* AI Planning Tools Modal */}
      {showPlanningTools && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]">
          <div className="bg-zinc-900 border-2 border-purple-500/50 p-6 max-w-3xl w-full mx-4 rounded-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white uppercase">AI Operations Planning</h2>
              <button
                onClick={() => setShowPlanningTools(null)}
                className="text-zinc-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Tabs Navigation */}
              <div className="flex gap-2 border-b border-zinc-700">
                {['blueprints', 'planner', 'scheduling', 'threats'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setShowPlanningTools(tab)}
                    className={`px-4 py-2 text-sm font-bold uppercase transition ${
                      showPlanningTools === tab
                        ? 'text-orange-400 border-b-2 border-orange-500'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {tab === 'blueprints' && '⚙️ Blueprints'}
                    {tab === 'planner' && '🧠 Planner'}
                    {tab === 'scheduling' && '📅 Smart Schedule'}
                    {tab === 'threats' && '⚠️ Threats'}
                  </button>
                ))}
              </div>

              {/* Content */}
              {showPlanningTools === 'blueprints' && (
                <MissionBlueprints onSelectBlueprint={handleBlueprintSelect} />
              )}
              {showPlanningTools === 'planner' && (
                <OperationPlanner eventId={selectedEvent?.id} />
              )}
              {showPlanningTools === 'scheduling' && (
                <SmartScheduling onScheduleSelected={handleScheduleSelected} />
              )}
              {showPlanningTools === 'threats' && (
                <ThreatDatabase />
              )}
            </div>

            <div className="mt-6">
              <Button onClick={() => setShowPlanningTools(null)} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Event Creation Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[1000]">
          <div className="bg-zinc-900 border-2 border-orange-500/50 p-6 max-w-2xl w-full mx-4 rounded-lg space-y-4">
            <h2 className="text-xl font-black text-white uppercase">Create New Operation</h2>
            
            <Input
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              placeholder="Operation title..."
            />

            <Textarea
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              placeholder="Operation briefing..."
              className="min-h-[100px]"
            />

            <Input
              type="datetime-local"
              value={eventForm.start_time}
              onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
            />

            <Input
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
              placeholder="Location..."
            />

            <Input
              value={eventForm.training_prerequisites}
              onChange={(e) => setEventForm({ ...eventForm, training_prerequisites: e.target.value })}
              placeholder="Training prerequisites (comma-separated)..."
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Operation Mode</label>
                <select
                  value={eventForm.event_type}
                  onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded"
                >
                  <option value="casual">Casual</option>
                  <option value="focused">Focused</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-2 block">Priority</label>
                <select
                  value={eventForm.priority}
                  onChange={(e) => setEventForm({ ...eventForm, priority: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white p-2 rounded"
                >
                  <option value="LOW">Low</option>
                  <option value="STANDARD">Standard</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 border-t border-zinc-700 pt-4">
              <button
                onClick={() => setShowRecurrence(!showRecurrence)}
                className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded text-sm font-semibold text-orange-400 transition"
              >
                {showRecurrence ? '✕ Hide Recurrence' : '+ Add Recurrence'}
              </button>
              
              {showRecurrence && (
                <EventRecurrenceManager
                  onSave={(recurrence) => {
                    setEventForm({ ...eventForm, recurrence });
                    setShowRecurrence(false);
                  }}
                  onCancel={() => setShowRecurrence(false)}
                  defaultValue={eventForm.recurrence}
                />
              )}

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded text-sm font-semibold text-orange-400 transition"
              >
                {showNotifications ? '✕ Hide Notifications' : '+ Add Notifications'}
              </button>

              {showNotifications && (
                <EventNotificationManager
                  onSave={(notifData) => {
                    setEventForm({ ...eventForm, notifications: notifData.notifications });
                    setShowNotifications(false);
                  }}
                  eventId={selectedEvent?.id}
                />
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setShowCreateEvent(false)}>Cancel</Button>
              <Button onClick={createEvent}>Create Operation</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
