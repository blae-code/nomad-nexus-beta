import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  getTrainingScenarioById,
  getLatestTrainingResultForSession,
  getSimulationSession,
  listSimulationSessions,
  injectSimulationEvent,
  listSimulationTimelineEvents,
  listTrainingScenarios,
  markSimulationObjective,
  pauseSimulationSession,
  resumeSimulationSession,
  startSimulationSession,
  stopSimulationSession,
  subscribeTrainingSimulation,
  upsertTrainingScenario,
} from '@/components/nexus-os';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpenCheck, GraduationCap, Medal, MonitorPlay, UserCog, Wrench } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

const MODULE_CATALOG = [
  { id: 'flight-basics', name: 'Flight Basics', focus: 'Navigation, comms checks, and fuel discipline' },
  { id: 'medical-extract', name: 'Medical Extraction', focus: 'Casualty stabilization and rapid evac' },
  { id: 'boarding-recovery', name: 'Boarding Recovery', focus: 'Close-quarters breach and asset retrieval' },
  { id: 'convoy-security', name: 'Convoy Security', focus: 'Escort doctrine and route hazard mitigation' },
];

const DEFAULT_SCENARIO_FORM = {
  name: '',
  description: '',
  difficulty: 'standard',
  event_type: 'focused',
  priority: 'HIGH',
  tags: '',
  prerequisites: '',
  narrativeContext: '',
  testedSopIds: '',
};

const DEFAULT_CERT_FORM = {
  name: '',
  level: 'STANDARD',
};

const DEFAULT_SIM_FORM = {
  title: '',
  description: '',
  start_time: '',
  linked_operation_id: '',
};

const DEFAULT_OBJECTIVE_FORM = {
  title: '',
  description: '',
  required: true,
  rescueWeighted: false,
  targetSeconds: '',
};

const DEFAULT_TRIGGER_FORM = {
  timeOffsetSeconds: '60',
  eventType: 'SIM_EVENT',
  title: '',
  message: '',
  severity: 'MEDIUM',
  objectiveId: '',
  requiresResponse: false,
};

const DEFAULT_INJECT_FORM = {
  title: '',
  message: '',
  eventType: 'SIM_EVENT',
  severity: 'MEDIUM',
};

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseScenarioData(template) {
  const data = template?.training_scenario_data && typeof template.training_scenario_data === 'object'
    ? template.training_scenario_data
    : {};
  const objectives = Array.isArray(data.objectives) ? data.objectives : [];
  const triggers = Array.isArray(data.triggers) ? data.triggers : [];
  return {
    narrativeContext: String(data.narrative_context || ''),
    testedSopIds: Array.isArray(data.tested_sop_ids) ? data.tested_sop_ids : [],
    objectives,
    triggers,
    scriptVersion: String(data.script_version || '1.0.0'),
  };
}

function toRuntimeDifficulty(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'BASIC') return 'BASIC';
  if (normalized === 'ADVANCED') return 'ADVANCED';
  if (normalized === 'ELITE') return 'ELITE';
  return 'STANDARD';
}

function normalizeScenarioObjective(objective, index) {
  return {
    id: String(objective?.id || `obj_${index + 1}`).trim(),
    title: String(objective?.title || `Objective ${index + 1}`).trim(),
    description: String(objective?.description || '').trim(),
    required: objective?.required !== false,
    rescueWeighted: Boolean(objective?.rescueWeighted),
    targetSeconds: objective?.targetSeconds ? Number(objective.targetSeconds) : undefined,
  };
}

function normalizeScenarioTrigger(trigger, index) {
  return {
    id: String(trigger?.id || `trg_${index + 1}`).trim(),
    timeOffsetSeconds: Math.max(0, Number(trigger?.timeOffsetSeconds || 0)),
    eventType: String(trigger?.eventType || 'SIM_EVENT').trim().toUpperCase(),
    title: String(trigger?.title || `Trigger ${index + 1}`).trim(),
    message: String(trigger?.message || 'Simulation event').trim(),
    severity: String(trigger?.severity || 'MEDIUM').trim().toUpperCase(),
    objectiveId: trigger?.objectiveId ? String(trigger.objectiveId).trim() : '',
    requiresResponse: Boolean(trigger?.requiresResponse),
  };
}

function asMilestones(profile) {
  if (Array.isArray(profile?.training_milestones)) return profile.training_milestones;
  if (Array.isArray(profile?.onboarding_training_milestones)) return profile.onboarding_training_milestones;
  return [];
}

function asCertifications(profile) {
  if (Array.isArray(profile?.certifications)) return profile.certifications;
  if (Array.isArray(profile?.certification_list)) return profile.certification_list;
  return [];
}

function isInstructor(profile) {
  const rank = String(profile?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(profile?.roles) ? profile.roles.map((role) => String(role || '').toLowerCase()) : [];
  return roles.includes('training') || roles.includes('instructor') || roles.includes('mentor') || roles.includes('admin');
}

function formatWhen(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function WarAcademy() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [tab, setTab] = useState('scenarios');
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [scenarioForm, setScenarioForm] = useState(DEFAULT_SCENARIO_FORM);
  const [scenarioObjectives, setScenarioObjectives] = useState([]);
  const [scenarioTriggers, setScenarioTriggers] = useState([]);
  const [objectiveForm, setObjectiveForm] = useState(DEFAULT_OBJECTIVE_FORM);
  const [triggerForm, setTriggerForm] = useState(DEFAULT_TRIGGER_FORM);
  const [certForm, setCertForm] = useState(DEFAULT_CERT_FORM);
  const [simForm, setSimForm] = useState(DEFAULT_SIM_FORM);
  const [injectForm, setInjectForm] = useState(DEFAULT_INJECT_FORM);
  const [selectedScenarioTemplateId, setSelectedScenarioTemplateId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [simVersion, setSimVersion] = useState(0);
  const [runtimeScenarioIdByTemplateId, setRuntimeScenarioIdByTemplateId] = useState({});
  const [noteDraft, setNoteDraft] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const instructorMode = useMemo(() => isInstructor(member), [member]);

  const selectedMember = useMemo(
    () => members.find((profile) => profile.id === selectedMemberId) || members[0] || null,
    [members, selectedMemberId]
  );

  const scenarioLibrary = useMemo(() => {
    return (templates || [])
      .filter((template) => {
        const tags = Array.isArray(template?.tags) ? template.tags.map((tag) => String(tag).toLowerCase()) : [];
        return tags.includes('war-academy') || tags.includes('scenario');
      })
      .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [templates]);

  const trainingEvents = useMemo(() => {
    return (events || [])
      .filter((event) => {
        const tags = Array.isArray(event?.tags) ? event.tags.map((tag) => String(tag).toLowerCase()) : [];
        return tags.includes('training') || tags.includes('simulation') || tags.includes('war-academy');
      })
      .sort((a, b) => new Date(a?.start_time || 0).getTime() - new Date(b?.start_time || 0).getTime());
  }, [events]);

  const selectedScenarioTemplate = useMemo(() => {
    if (selectedScenarioTemplateId === '__new__') return null;
    return scenarioLibrary.find((scenario) => scenario.id === selectedScenarioTemplateId) || scenarioLibrary[0] || null;
  }, [scenarioLibrary, selectedScenarioTemplateId]);

  const runtimeScenarios = useMemo(() => listTrainingScenarios(), [simVersion]);

  const selectedRuntimeScenario = useMemo(() => {
    if (!selectedScenarioTemplate?.id) return null;
    const runtimeId = runtimeScenarioIdByTemplateId[selectedScenarioTemplate.id];
    if (runtimeId) return getTrainingScenarioById(runtimeId);
    return null;
  }, [selectedScenarioTemplate, runtimeScenarioIdByTemplateId, simVersion]);

  const activeSession = useMemo(
    () => (activeSessionId ? getSimulationSession(activeSessionId) : null),
    [activeSessionId, simVersion]
  );

  const activeRuntimeScenario = useMemo(
    () => (activeSession?.scenarioId ? getTrainingScenarioById(activeSession.scenarioId) : null),
    [activeSession, simVersion]
  );

  const scenarioSessions = useMemo(() => {
    if (!selectedRuntimeScenario?.id) return listSimulationSessions();
    return listSimulationSessions({ scenarioId: selectedRuntimeScenario.id });
  }, [selectedRuntimeScenario, simVersion]);

  const activeTimeline = useMemo(
    () => (activeSessionId ? listSimulationTimelineEvents(activeSessionId) : []),
    [activeSessionId, simVersion]
  );

  const latestResult = useMemo(
    () => (activeSessionId ? getLatestTrainingResultForSession(activeSessionId) : null),
    [activeSessionId, simVersion]
  );

  const memberMilestones = useMemo(() => asMilestones(selectedMember), [selectedMember]);
  const memberCertifications = useMemo(() => asCertifications(selectedMember), [selectedMember]);

  const progressionSummary = useMemo(() => {
    const completed = memberMilestones.filter((milestone) => String(milestone?.status || '').toLowerCase() === 'complete').length;
    const score = memberMilestones.length > 0
      ? Math.round(memberMilestones.reduce((sum, milestone) => sum + Number(milestone?.score || 0), 0) / memberMilestones.length)
      : 0;
    return {
      completed,
      total: memberMilestones.length,
      score,
      certifications: memberCertifications.length,
    };
  }, [memberMilestones, memberCertifications]);

  const loadAcademy = async () => {
    setLoading(true);
    try {
      const [memberList, templateList, eventList] = await Promise.all([
        base44.entities.MemberProfile.list('-created_date', 300).catch(() => []),
        base44.entities.EventTemplate.list('-created_date', 250).catch(() => []),
        base44.entities.Event.list('-start_time', 200).catch(() => []),
      ]);
      setMembers(memberList || []);
      setTemplates(templateList || []);
      setEvents(eventList || []);
      if (!selectedMemberId && memberList?.[0]?.id) {
        setSelectedMemberId(memberList[0].id);
      }
    } catch (error) {
      console.error('WarAcademy load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load War Academy data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademy();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeTrainingSimulation(() => {
      setSimVersion((prev) => prev + 1);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!selectedScenarioTemplateId && scenarioLibrary[0]?.id) {
      setSelectedScenarioTemplateId(scenarioLibrary[0].id);
    }
  }, [scenarioLibrary, selectedScenarioTemplateId]);

  const runAction = async (payload, successMessage) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateWarAcademyProgress', payload);
      const result = response?.data || response;
      if (!result?.success) {
        setBanner({ type: 'error', message: result?.error || 'War Academy update failed.' });
      } else {
        setBanner({ type: 'success', message: successMessage || 'War Academy updated.' });
      }
      await loadAcademy();
      return result;
    } catch (error) {
      console.error('WarAcademy action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'War Academy update failed.' });
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const loadScenarioIntoEditor = (scenario) => {
    if (!scenario) return;
    const parsed = parseScenarioData(scenario);
    setScenarioForm({
      name: String(scenario.name || ''),
      description: String(scenario.description || ''),
      difficulty: String(scenario.difficulty || 'standard').toLowerCase(),
      event_type: String(scenario.event_type || 'focused'),
      priority: String(scenario.priority || 'HIGH').toUpperCase(),
      tags: Array.isArray(scenario.tags) ? scenario.tags.join(', ') : '',
      prerequisites: String(scenario.training_prerequisites || ''),
      narrativeContext: parsed.narrativeContext,
      testedSopIds: parsed.testedSopIds.join(', '),
    });
    setScenarioObjectives(parsed.objectives.map(normalizeScenarioObjective));
    setScenarioTriggers(parsed.triggers.map(normalizeScenarioTrigger));
  };

  const ensureRuntimeScenarioFromTemplate = (scenario) => {
    if (!scenario) return null;
    const parsed = parseScenarioData(scenario);
    const runtimeScenario = upsertTrainingScenario(
      runtimeScenarioIdByTemplateId[scenario.id],
      {
        title: String(scenario.name || 'Untitled Scenario'),
        description: String(scenario.description || 'Training scenario'),
        narrativeContext: parsed.narrativeContext,
        difficulty: toRuntimeDifficulty(scenario.difficulty || 'standard'),
        tags: Array.isArray(scenario.tags) ? scenario.tags : ['war-academy', 'scenario'],
        prerequisites: parseTags(scenario.training_prerequisites),
        testedSopIds: parsed.testedSopIds,
        objectives: parsed.objectives.map(normalizeScenarioObjective),
        triggers: parsed.triggers.map(normalizeScenarioTrigger),
        createdBy: member?.id || 'system',
      }
    );
    setRuntimeScenarioIdByTemplateId((prev) => ({ ...prev, [scenario.id]: runtimeScenario.id }));
    return runtimeScenario;
  };

  useEffect(() => {
    if (!selectedScenarioTemplate) return;
    loadScenarioIntoEditor(selectedScenarioTemplate);
    ensureRuntimeScenarioFromTemplate(selectedScenarioTemplate);
  }, [selectedScenarioTemplate?.id]);

  const saveScenario = async () => {
    if (!scenarioForm.name.trim()) return;
    const normalizedObjectives = scenarioObjectives.map(normalizeScenarioObjective);
    const normalizedTriggers = scenarioTriggers.map(normalizeScenarioTrigger);
    const result = await runAction(
      {
        action: 'upsert_scenario',
        scenario: {
          id: selectedScenarioTemplate?.id,
          name: scenarioForm.name.trim(),
          description: scenarioForm.description.trim(),
          difficulty: scenarioForm.difficulty,
          event_type: scenarioForm.event_type,
          priority: scenarioForm.priority,
          tags: parseTags(scenarioForm.tags),
          prerequisites: scenarioForm.prerequisites.trim(),
          narrative_context: scenarioForm.narrativeContext.trim(),
          tested_sop_ids: parseTags(scenarioForm.testedSopIds),
          objectives: normalizedObjectives,
          triggers: normalizedTriggers,
        },
      },
      'Scenario saved to library.'
    );
    if (result?.success) {
      const persisted = result.scenario || null;
      if (persisted?.id) {
        setSelectedScenarioTemplateId(persisted.id);
        const runtimeScenario = upsertTrainingScenario(
          runtimeScenarioIdByTemplateId[persisted.id],
          {
            title: scenarioForm.name.trim(),
            description: scenarioForm.description.trim() || 'Training scenario',
            narrativeContext: scenarioForm.narrativeContext.trim(),
            difficulty: toRuntimeDifficulty(scenarioForm.difficulty),
            tags: parseTags(scenarioForm.tags),
            prerequisites: parseTags(scenarioForm.prerequisites),
            testedSopIds: parseTags(scenarioForm.testedSopIds),
            objectives: normalizedObjectives,
            triggers: normalizedTriggers,
            createdBy: member?.id || 'system',
          }
        );
        setRuntimeScenarioIdByTemplateId((prev) => ({ ...prev, [persisted.id]: runtimeScenario.id }));
      }
    }
  };

  const addScenarioObjective = () => {
    const title = objectiveForm.title.trim();
    if (!title) return;
    setScenarioObjectives((prev) => [
      ...prev,
      {
        id: `obj_${Date.now()}`,
        title,
        description: objectiveForm.description.trim(),
        required: objectiveForm.required,
        rescueWeighted: objectiveForm.rescueWeighted,
        targetSeconds: objectiveForm.targetSeconds ? Number(objectiveForm.targetSeconds) : undefined,
      },
    ]);
    setObjectiveForm(DEFAULT_OBJECTIVE_FORM);
  };

  const removeScenarioObjective = (objectiveId) => {
    setScenarioObjectives((prev) => prev.filter((objective) => objective.id !== objectiveId));
    setScenarioTriggers((prev) => prev.filter((trigger) => trigger.objectiveId !== objectiveId));
  };

  const addScenarioTrigger = () => {
    const title = triggerForm.title.trim();
    const message = triggerForm.message.trim();
    if (!title || !message) return;
    setScenarioTriggers((prev) => [
      ...prev,
      {
        id: `trg_${Date.now()}`,
        timeOffsetSeconds: Math.max(0, Number(triggerForm.timeOffsetSeconds || 0)),
        eventType: String(triggerForm.eventType || 'SIM_EVENT').trim().toUpperCase(),
        title,
        message,
        severity: String(triggerForm.severity || 'MEDIUM').trim().toUpperCase(),
        objectiveId: triggerForm.objectiveId || '',
        requiresResponse: triggerForm.requiresResponse,
      },
    ]);
    setTriggerForm(DEFAULT_TRIGGER_FORM);
  };

  const removeScenarioTrigger = (triggerId) => {
    setScenarioTriggers((prev) => prev.filter((trigger) => trigger.id !== triggerId));
  };

  const completeScenario = async (scenario) => {
    if (!selectedMember?.id || !scenario?.id) return;
    await runAction(
      {
        action: 'complete_scenario',
        targetMemberProfileId: selectedMember.id,
        scenarioId: scenario.id,
        scenarioTitle: scenario.name || scenario.title || 'Scenario',
        score: 85,
      },
      'Scenario completion recorded.'
    );
  };

  const issueCertification = async () => {
    if (!selectedMember?.id || !certForm.name.trim()) return;
    const result = await runAction(
      {
        action: 'issue_certification',
        targetMemberProfileId: selectedMember.id,
        certificationName: certForm.name.trim(),
        certificationLevel: certForm.level,
      },
      'Certification issued.'
    );
    if (result?.success) setCertForm(DEFAULT_CERT_FORM);
  };

  const createSimulation = async () => {
    if (!simForm.title.trim()) return;
    const result = await runAction(
      {
        action: 'create_simulation',
        title: simForm.title.trim(),
        description: simForm.description.trim(),
        start_time: simForm.start_time || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        scenario_id: selectedScenarioTemplate?.id,
        simulation_script_version: parseScenarioData(selectedScenarioTemplate).scriptVersion,
      },
      'Simulation scheduled.'
    );
    if (result?.success) setSimForm(DEFAULT_SIM_FORM);
  };

  const startRuntimeSession = () => {
    if (!selectedScenarioTemplate) {
      setBanner({ type: 'error', message: 'Select a scenario before starting a simulation session.' });
      return;
    }
    const runtimeScenario = ensureRuntimeScenarioFromTemplate(selectedScenarioTemplate);
    if (!runtimeScenario) {
      setBanner({ type: 'error', message: 'Unable to initialize runtime scenario.' });
      return;
    }
    const started = startSimulationSession({
      scenarioId: runtimeScenario.id,
      opId: simForm.linked_operation_id.trim() || undefined,
      startedBy: member?.id || selectedMember?.id || 'instructor',
    });
    setActiveSessionId(started.id);
    setBanner({ type: 'success', message: 'Simulation session started (SIMULATION MODE).' });
  };

  const togglePauseResumeSession = () => {
    if (!activeSessionId) return;
    if (activeSession?.status === 'RUNNING') {
      pauseSimulationSession(activeSessionId);
      setBanner({ type: 'success', message: 'Simulation paused.' });
      return;
    }
    if (activeSession?.status === 'PAUSED') {
      resumeSimulationSession(activeSessionId);
      setBanner({ type: 'success', message: 'Simulation resumed.' });
    }
  };

  const stopRuntimeSession = async () => {
    if (!activeSessionId) return;
    const stopped = stopSimulationSession(activeSessionId, { asCompleted: true });
    const { result } = stopped;
    await runAction(
      {
        action: 'record_training_result',
        targetMemberProfileId: selectedMember?.id || member?.id,
        scenarioId: result.scenarioId,
        scenarioTitle: activeRuntimeScenario?.title || selectedScenarioTemplate?.name || 'Simulation Run',
        score: result.score,
        rescueScore: result.rescueScore,
        outcome: result.outcome,
        objectiveSummary: result.objectiveSummary,
        recommendations: result.recommendations,
        notes: result.debriefNarrative,
      },
      `Simulation stopped. Result recorded (${result.outcome}).`
    );
  };

  const toggleObjectiveComplete = (objectiveId) => {
    if (!activeSessionId || !objectiveId) return;
    const current = Boolean(activeSession?.objectiveState?.[objectiveId]?.completed);
    markSimulationObjective({
      sessionId: activeSessionId,
      objectiveId,
      completed: !current,
      note: !current ? 'Marked during live simulation run.' : '',
    });
  };

  const injectRuntimeEvent = () => {
    if (!activeSessionId) return;
    if (!injectForm.title.trim() || !injectForm.message.trim()) return;
    injectSimulationEvent(activeSessionId, {
      eventType: injectForm.eventType.trim().toUpperCase(),
      title: injectForm.title.trim(),
      message: injectForm.message.trim(),
      severity: injectForm.severity,
      payload: { injectedBy: member?.id || selectedMember?.id || 'instructor' },
    });
    setInjectForm(DEFAULT_INJECT_FORM);
    setBanner({ type: 'success', message: 'Manual simulation event injected.' });
  };

  const submitInstructorNote = async () => {
    if (!selectedMember?.id || !noteDraft.trim()) return;
    const result = await runAction(
      {
        action: 'instructor_note',
        targetMemberProfileId: selectedMember.id,
        note: noteDraft.trim(),
      },
      'Instructor note saved.'
    );
    if (result?.success) setNoteDraft('');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading War Academy...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">War Academy</h1>
          <p className="text-zinc-400 text-sm">Scenario library, progression tracking, certification workflows, simulation engine, and instructor tools</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('MissionControl')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Operations</a>
          <a href={createPageUrl('CommsConsole')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Comms</a>
        </div>
      </div>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`inline-flex rounded border px-3 py-1 text-xs ${
            banner.type === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-green-500/40 text-green-300 bg-green-500/10'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Scenarios</div>
          <div className="text-lg font-bold text-cyan-300">{scenarioLibrary.length}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Milestones</div>
          <div className="text-lg font-bold text-orange-300">{progressionSummary.completed}/{progressionSummary.total}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Certifications</div>
          <div className="text-lg font-bold text-yellow-300">{progressionSummary.certifications}</div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500">Avg Training Score</div>
          <div className="text-lg font-bold text-green-300">{progressionSummary.score}</div>
        </div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 flex items-center gap-3">
        <label htmlFor="war-academy-member" className="text-xs uppercase tracking-widest text-zinc-500">Trainee</label>
        <select
          id="war-academy-member"
          value={selectedMember?.id || ''}
          onChange={(event) => setSelectedMemberId(event.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded min-w-[300px]"
        >
          {members.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_callsign || profile.callsign || profile.full_name || profile.id}
            </option>
          ))}
        </select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scenarios">Scenario Library</TabsTrigger>
          <TabsTrigger value="progression">Skill Progression</TabsTrigger>
          <TabsTrigger value="certifications">Certification System</TabsTrigger>
          <TabsTrigger value="simulations">Simulation Engine</TabsTrigger>
          <TabsTrigger value="instructor">Instructor Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <BookOpenCheck className="w-3 h-3" />
                Training Modules UI
              </div>
              {MODULE_CATALOG.map((module) => (
                <div key={module.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="text-sm text-white font-semibold">{module.name}</div>
                  <div className="text-xs text-zinc-400">{module.focus}</div>
                </div>
              ))}
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Training Scenario Library</div>
              {scenarioLibrary.length === 0 ? (
                <div className="text-xs text-zinc-500">No scenarios saved yet.</div>
              ) : (
                scenarioLibrary.map((scenario) => (
                  <div key={scenario.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-semibold">{scenario.name}</div>
                        <div className="text-[10px] text-zinc-500 uppercase">{scenario.event_type || 'focused'} · {scenario.priority || 'STANDARD'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedScenarioTemplateId(scenario.id);
                            loadScenarioIntoEditor(scenario);
                          }}
                        >
                          Load
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => completeScenario(scenario)} disabled={actionBusy || !selectedMember}>
                          Mark Complete
                        </Button>
                      </div>
                    </div>
                    {scenario.description && <div className="text-xs text-zinc-300 mt-1">{scenario.description}</div>}
                    <div className="mt-2 text-[10px] text-zinc-500 uppercase">
                      Objectives {parseScenarioData(scenario).objectives.length} · Triggers {parseScenarioData(scenario).triggers.length}
                    </div>
                  </div>
                ))
              )}

              <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Author Scenario</div>
                <select
                  value={selectedScenarioTemplateId || ''}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedScenarioTemplateId(nextId);
                    if (nextId === '__new__') {
                      setScenarioForm(DEFAULT_SCENARIO_FORM);
                      setScenarioObjectives([]);
                      setScenarioTriggers([]);
                    }
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                >
                  <option value="__new__">New Scenario Draft</option>
                  {scenarioLibrary.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
                <Input value={scenarioForm.name} onChange={(event) => setScenarioForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Scenario name" />
                <Textarea value={scenarioForm.description} onChange={(event) => setScenarioForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[70px]" placeholder="Scenario description" />
                <Textarea value={scenarioForm.narrativeContext} onChange={(event) => setScenarioForm((prev) => ({ ...prev, narrativeContext: event.target.value }))} className="min-h-[55px]" placeholder="Narrative context (mission framing)" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={scenarioForm.difficulty} onChange={(event) => setScenarioForm((prev) => ({ ...prev, difficulty: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="advanced">Advanced</option>
                    <option value="elite">Elite</option>
                  </select>
                  <select value={scenarioForm.priority} onChange={(event) => setScenarioForm((prev) => ({ ...prev, priority: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                    <option value="LOW">Low</option>
                    <option value="STANDARD">Standard</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
                <Input value={scenarioForm.tags} onChange={(event) => setScenarioForm((prev) => ({ ...prev, tags: event.target.value }))} placeholder="Tags (comma-separated)" />
                <Input value={scenarioForm.prerequisites} onChange={(event) => setScenarioForm((prev) => ({ ...prev, prerequisites: event.target.value }))} placeholder="Prerequisites" />
                <Input value={scenarioForm.testedSopIds} onChange={(event) => setScenarioForm((prev) => ({ ...prev, testedSopIds: event.target.value }))} placeholder="Tested SOP IDs (comma-separated)" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="border border-zinc-700/70 rounded p-2 bg-zinc-900/60 space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Objectives</div>
                    {scenarioObjectives.length === 0 ? (
                      <div className="text-[10px] text-zinc-500">No objectives configured.</div>
                    ) : (
                      scenarioObjectives.map((objective) => (
                        <div key={objective.id} className="border border-zinc-700 rounded p-2 bg-zinc-950/60">
                          <div className="text-xs text-white">{objective.title}</div>
                          <div className="text-[10px] text-zinc-500 uppercase">
                            {objective.required ? 'Required' : 'Optional'} · {objective.rescueWeighted ? 'Rescue-weighted' : 'Standard'}
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 px-2 mt-1" onClick={() => removeScenarioObjective(objective.id)}>
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                    <Input
                      value={objectiveForm.title}
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Objective title"
                    />
                    <Input
                      value={objectiveForm.description}
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Objective description"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={objectiveForm.targetSeconds}
                      onChange={(event) => setObjectiveForm((prev) => ({ ...prev, targetSeconds: event.target.value }))}
                      placeholder="Target seconds (optional)"
                    />
                    <label className="flex items-center gap-2 text-[10px] text-zinc-300">
                      <input
                        type="checkbox"
                        checked={objectiveForm.required}
                        onChange={(event) => setObjectiveForm((prev) => ({ ...prev, required: event.target.checked }))}
                      />
                      Required objective
                    </label>
                    <label className="flex items-center gap-2 text-[10px] text-zinc-300">
                      <input
                        type="checkbox"
                        checked={objectiveForm.rescueWeighted}
                        onChange={(event) => setObjectiveForm((prev) => ({ ...prev, rescueWeighted: event.target.checked }))}
                      />
                      Rescue weighted
                    </label>
                    <Button size="sm" variant="outline" onClick={addScenarioObjective} disabled={!objectiveForm.title.trim()}>
                      Add Objective
                    </Button>
                  </div>
                  <div className="border border-zinc-700/70 rounded p-2 bg-zinc-900/60 space-y-2">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Timeline Triggers</div>
                    {scenarioTriggers.length === 0 ? (
                      <div className="text-[10px] text-zinc-500">No triggers configured.</div>
                    ) : (
                      scenarioTriggers.map((trigger) => (
                        <div key={trigger.id} className="border border-zinc-700 rounded p-2 bg-zinc-950/60">
                          <div className="text-xs text-white">{trigger.title}</div>
                          <div className="text-[10px] text-zinc-500 uppercase">
                            T+{trigger.timeOffsetSeconds}s · {trigger.eventType} · {trigger.severity}
                          </div>
                          <div className="text-[10px] text-zinc-400">{trigger.message}</div>
                          <Button size="sm" variant="ghost" className="h-6 px-2 mt-1" onClick={() => removeScenarioTrigger(trigger.id)}>
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                    <Input
                      type="number"
                      min="0"
                      value={triggerForm.timeOffsetSeconds}
                      onChange={(event) => setTriggerForm((prev) => ({ ...prev, timeOffsetSeconds: event.target.value }))}
                      placeholder="Time offset seconds"
                    />
                    <Input
                      value={triggerForm.eventType}
                      onChange={(event) => setTriggerForm((prev) => ({ ...prev, eventType: event.target.value }))}
                      placeholder="Event type"
                    />
                    <Input
                      value={triggerForm.title}
                      onChange={(event) => setTriggerForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Trigger title"
                    />
                    <Textarea
                      value={triggerForm.message}
                      onChange={(event) => setTriggerForm((prev) => ({ ...prev, message: event.target.value }))}
                      className="min-h-[50px]"
                      placeholder="Trigger message"
                    />
                    <select
                      value={triggerForm.severity}
                      onChange={(event) => setTriggerForm((prev) => ({ ...prev, severity: event.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                    <select
                      value={triggerForm.objectiveId}
                      onChange={(event) => setTriggerForm((prev) => ({ ...prev, objectiveId: event.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                    >
                      <option value="">Link objective (optional)</option>
                      {scenarioObjectives.map((objective) => (
                        <option key={objective.id} value={objective.id}>
                          {objective.title}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-[10px] text-zinc-300">
                      <input
                        type="checkbox"
                        checked={triggerForm.requiresResponse}
                        onChange={(event) => setTriggerForm((prev) => ({ ...prev, requiresResponse: event.target.checked }))}
                      />
                      Requires trainee response
                    </label>
                    <Button size="sm" variant="outline" onClick={addScenarioTrigger} disabled={!triggerForm.title.trim() || !triggerForm.message.trim()}>
                      Add Trigger
                    </Button>
                  </div>
                </div>
                <Button onClick={saveScenario} disabled={actionBusy || !instructorMode || !scenarioForm.name.trim()}>
                  Save Scenario
                </Button>
                {!instructorMode && <div className="text-[10px] text-zinc-500">Instructor privileges are required to author scenarios.</div>}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progression" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <GraduationCap className="w-3 h-3" />
              Skill Progression
            </div>
            {memberMilestones.length === 0 ? (
              <div className="text-xs text-zinc-500">No completed scenarios recorded for this trainee.</div>
            ) : (
              memberMilestones.map((milestone) => (
                <div key={milestone.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white">{milestone.title || milestone.id}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{milestone.status || 'pending'} · score {milestone.score ?? 'n/a'}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500">{formatWhen(milestone.completed_at)}</div>
                  </div>
                  {milestone.notes && <div className="text-xs text-zinc-300 mt-1">{milestone.notes}</div>}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Medal className="w-3 h-3" />
                Certification System
              </div>
              <Input value={certForm.name} onChange={(event) => setCertForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Certification name" />
              <select value={certForm.level} onChange={(event) => setCertForm((prev) => ({ ...prev, level: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="STANDARD">Standard</option>
                <option value="ADVANCED">Advanced</option>
                <option value="ELITE">Elite</option>
              </select>
              <Button onClick={issueCertification} disabled={actionBusy || !instructorMode || !selectedMember || !certForm.name.trim()}>
                Issue Certification
              </Button>
              {!instructorMode && <div className="text-[10px] text-zinc-500">Instructor privileges are required to issue certifications.</div>}
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-zinc-500">Current Certifications</div>
              {memberCertifications.length === 0 ? (
                <div className="text-xs text-zinc-500">No certifications recorded.</div>
              ) : (
                memberCertifications.map((cert) => (
                  <div key={cert.id || `${cert.name}-${cert.issued_at}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                    <div className="text-sm text-white">{cert.name || 'Certification'}</div>
                    <div className="text-[10px] text-zinc-500 uppercase">{cert.level || 'STANDARD'} · {formatWhen(cert.issued_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="simulations" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <MonitorPlay className="w-3 h-3" />
                Simulation Scheduler
              </div>
              <Input value={simForm.title} onChange={(event) => setSimForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Simulation title" />
              <Textarea value={simForm.description} onChange={(event) => setSimForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[80px]" placeholder="Simulation objective" />
              <Input type="datetime-local" value={simForm.start_time} onChange={(event) => setSimForm((prev) => ({ ...prev, start_time: event.target.value }))} />
              <Input
                value={simForm.linked_operation_id}
                onChange={(event) => setSimForm((prev) => ({ ...prev, linked_operation_id: event.target.value }))}
                placeholder="Optional linked operation ID"
              />
              <Button onClick={createSimulation} disabled={actionBusy || !instructorMode || !simForm.title.trim()}>
                Schedule Simulation
              </Button>
              <div className="text-[10px] text-zinc-500">
                SIMULATION mode is isolated from live operation telemetry and marked as training-only data.
              </div>
            </div>

            <div className="col-span-2 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-widest text-zinc-500">Runtime Simulation Session (SIMULATION)</div>
                <div className="text-[10px] text-zinc-500 uppercase">Scenarios in runtime: {runtimeScenarios.length}</div>
              </div>

              <select
                value={selectedScenarioTemplate?.id || ''}
                onChange={(event) => setSelectedScenarioTemplateId(event.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
              >
                {scenarioLibrary.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={startRuntimeSession} disabled={!selectedScenarioTemplate}>
                  Start Session
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={togglePauseResumeSession}
                  disabled={!activeSessionId || (activeSession?.status !== 'RUNNING' && activeSession?.status !== 'PAUSED')}
                >
                  {activeSession?.status === 'PAUSED' ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopRuntimeSession}
                  disabled={!activeSessionId || (activeSession?.status !== 'RUNNING' && activeSession?.status !== 'PAUSED')}
                >
                  Stop + Debrief
                </Button>
              </div>

              <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-2">
                <div className="text-[10px] text-zinc-500 uppercase">
                  Active Session: {activeSession?.id || 'none'} · {activeSession?.status || 'IDLE'} · elapsed {activeSession?.elapsedSeconds ?? 0}s
                </div>
                {activeRuntimeScenario?.narrativeContext && (
                  <div className="text-xs text-zinc-300">{activeRuntimeScenario.narrativeContext}</div>
                )}
                {activeRuntimeScenario?.objectives?.length ? (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Objective Tracker</div>
                    {activeRuntimeScenario.objectives.map((objective) => {
                      const completed = Boolean(activeSession?.objectiveState?.[objective.id]?.completed);
                      return (
                        <label key={objective.id} className="flex items-center justify-between gap-2 text-xs text-zinc-200 border border-zinc-700 rounded px-2 py-1">
                          <span>
                            {objective.title}
                            <span className="text-[10px] text-zinc-500 ml-1 uppercase">
                              {objective.required ? 'Required' : 'Optional'}
                              {objective.rescueWeighted ? ' · Rescue' : ''}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={completed}
                            disabled={!activeSessionId}
                            onChange={() => toggleObjectiveComplete(objective.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500">No objectives loaded in runtime scenario.</div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                <Input
                  value={injectForm.title}
                  onChange={(event) => setInjectForm((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Inject title"
                />
                <Input
                  value={injectForm.eventType}
                  onChange={(event) => setInjectForm((prev) => ({ ...prev, eventType: event.target.value }))}
                  placeholder="Inject event type"
                />
                <Textarea
                  value={injectForm.message}
                  onChange={(event) => setInjectForm((prev) => ({ ...prev, message: event.target.value }))}
                  className="col-span-2 min-h-[58px]"
                  placeholder="Inject message"
                />
                <select
                  value={injectForm.severity}
                  onChange={(event) => setInjectForm((prev) => ({ ...prev, severity: event.target.value }))}
                  className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
                <Button size="sm" variant="outline" onClick={injectRuntimeEvent} disabled={!activeSessionId || !injectForm.title.trim() || !injectForm.message.trim()}>
                  Inject Event
                </Button>
              </div>

              <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 max-h-56 overflow-y-auto space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Timeline</div>
                {activeTimeline.length === 0 ? (
                  <div className="text-xs text-zinc-500">No events emitted yet.</div>
                ) : (
                  activeTimeline.map((event) => (
                    <div key={event.id} className="text-xs text-zinc-200 border border-zinc-700 rounded px-2 py-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">{event.title}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">{event.severity} · T+{event.timeOffsetSeconds}s</span>
                      </div>
                      <div className="text-[11px] text-zinc-300">{event.message}</div>
                    </div>
                  ))
                )}
              </div>

              {latestResult && (
                <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500">Debrief</div>
                  <div className="text-xs text-zinc-200 uppercase">Outcome: {latestResult.outcome} · Score {latestResult.score} · Rescue {latestResult.rescueScore}</div>
                  <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap">{latestResult.debriefNarrative}</pre>
                  {latestResult.recommendations.length > 0 && (
                    <div className="text-[11px] text-zinc-400">
                      {latestResult.recommendations.map((entry) => `- ${entry}`).join('\n')}
                    </div>
                  )}
                </div>
              )}

              <div className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50 max-h-40 overflow-y-auto space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">Session History</div>
                {scenarioSessions.length === 0 ? (
                  <div className="text-xs text-zinc-500">No sessions for this scenario yet.</div>
                ) : (
                  scenarioSessions.slice(0, 12).map((session) => (
                    <button
                      type="button"
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`w-full text-left border rounded px-2 py-1 text-xs ${
                        session.id === activeSessionId ? 'border-orange-500/60 bg-orange-500/10 text-orange-200' : 'border-zinc-700 text-zinc-200'
                      }`}
                    >
                      {session.id} · {session.status} · {formatWhen(session.startedAt)}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Scheduled Training Simulations</div>
            {trainingEvents.length === 0 ? (
              <div className="text-xs text-zinc-500">No simulations scheduled.</div>
            ) : (
              trainingEvents.slice(0, 20).map((event) => (
                <div key={event.id} className="border border-zinc-700/70 rounded p-3 bg-zinc-950/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-semibold">{event.title}</div>
                      <div className="text-[10px] text-zinc-500 uppercase">{event.event_type || 'focused'} · {event.priority || 'HIGH'} · {event.status || 'scheduled'}</div>
                    </div>
                    <div className="text-[10px] text-zinc-500">{formatWhen(event.start_time)}</div>
                  </div>
                  {event.description && <div className="text-xs text-zinc-300 mt-1">{event.description}</div>}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="instructor" className="mt-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <UserCog className="w-3 h-3" />
              Instructor Tools
            </div>
            <Textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} className="min-h-[90px]" placeholder="Instructor feedback note" />
            <Button onClick={submitInstructorNote} disabled={actionBusy || !instructorMode || !selectedMember || !noteDraft.trim()}>
              Save Instructor Note
            </Button>
            <div className="text-xs text-zinc-500 flex items-start gap-2">
              <Wrench className="w-3 h-3 mt-0.5" />
              Instructor notes are stored with trainee progression and can be used during promotion reviews.
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
