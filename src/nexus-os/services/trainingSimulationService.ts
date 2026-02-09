/**
 * Training Simulation Service (MVP in-memory engine)
 *
 * Features:
 * - Scenario CRUD
 * - Session start/pause/resume/stop
 * - Timeline trigger scheduling
 * - Manual event injection
 * - Objective completion tracking
 * - Deterministic debrief + result artifacts
 *
 * Guardrails:
 * - Every emitted event is marked `isSimulation`.
 * - Simulation output is isolated from live-op queries via operationService helpers.
 * - Rescue-weighted scoring favors casualty stabilization/extraction outcomes.
 */

import type {
  SimulationSession,
  SimulationTimelineEvent,
  SimulationTrigger,
  TrainingObjective,
  TrainingResult,
  TrainingScenario,
} from '../schemas/trainingSchemas';
import { appendOperationEvent } from './operationService';

export interface TrainingScenarioCreateInput {
  title: string;
  description: string;
  narrativeContext?: string;
  difficulty?: TrainingScenario['difficulty'];
  tags?: string[];
  prerequisites?: string[];
  testedSopIds?: string[];
  objectives?: TrainingObjective[];
  triggers?: SimulationTrigger[];
  createdBy: string;
}

export interface SimulationStartInput {
  scenarioId: string;
  opId?: string;
  startedBy: string;
}

export interface MarkObjectiveInput {
  sessionId: string;
  objectiveId: string;
  completed: boolean;
  note?: string;
}

type SimulationListener = (state: {
  scenarios: TrainingScenario[];
  sessions: SimulationSession[];
  timelineEvents: SimulationTimelineEvent[];
  results: TrainingResult[];
}) => void;

interface SessionRuntime {
  sessionId: string;
  startedAtMs: number;
  elapsedBeforePauseMs: number;
  pausedAtMs?: number;
  timers: Map<string, ReturnType<typeof setTimeout>>;
  emittedTriggerIds: Set<string>;
}

let scenariosStore: TrainingScenario[] = [];
let sessionsStore: SimulationSession[] = [];
let timelineEventsStore: SimulationTimelineEvent[] = [];
let resultsStore: TrainingResult[] = [];
const listeners = new Set<SimulationListener>();
const runtimeBySessionId = new Map<string, SessionRuntime>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortByUpdated<T extends { id: string; updatedAt?: string; createdAt?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    if (aTime !== bTime) return bTime - aTime;
    return a.id.localeCompare(b.id);
  });
}

function sortTimeline(rows: SimulationTimelineEvent[]): SimulationTimelineEvent[] {
  return [...rows].sort((a, b) => {
    const byTime = new Date(a.emittedAt).getTime() - new Date(b.emittedAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function notifyListeners() {
  const snapshot = {
    scenarios: sortByUpdated(scenariosStore),
    sessions: sortByUpdated(sessionsStore),
    timelineEvents: sortTimeline(timelineEventsStore),
    results: sortByUpdated(resultsStore),
  };
  for (const listener of listeners) listener(snapshot);
}

function normalizeScenarioObjectives(objectives: TrainingObjective[] | undefined): TrainingObjective[] {
  return (objectives || []).map((objective, index) => ({
    id: objective.id || `obj_${index + 1}`,
    title: objective.title || `Objective ${index + 1}`,
    description: objective.description,
    required: objective.required !== false,
    rescueWeighted: Boolean(objective.rescueWeighted),
    targetSeconds: Number.isFinite(objective.targetSeconds) ? Number(objective.targetSeconds) : undefined,
  }));
}

function normalizeScenarioTriggers(triggers: SimulationTrigger[] | undefined): SimulationTrigger[] {
  return (triggers || [])
    .map((trigger, index) => ({
      id: trigger.id || `trg_${index + 1}`,
      timeOffsetSeconds: Math.max(0, Number(trigger.timeOffsetSeconds || 0)),
      eventType: String(trigger.eventType || 'SIM_EVENT').trim().toUpperCase(),
      title: String(trigger.title || `Trigger ${index + 1}`).trim(),
      message: String(trigger.message || 'Simulation event').trim(),
      severity: (String(trigger.severity || 'MEDIUM').toUpperCase() as SimulationTrigger['severity']) || 'MEDIUM',
      payload: trigger.payload || {},
      objectiveId: trigger.objectiveId,
      requiresResponse: Boolean(trigger.requiresResponse),
    }))
    .sort((a, b) => a.timeOffsetSeconds - b.timeOffsetSeconds);
}

function getScenarioById(scenarioId: string): TrainingScenario {
  const scenario = scenariosStore.find((entry) => entry.id === scenarioId);
  if (!scenario) throw new Error(`Training scenario ${scenarioId} not found`);
  return scenario;
}

function getSessionById(sessionId: string): SimulationSession {
  const session = sessionsStore.find((entry) => entry.id === sessionId);
  if (!session) throw new Error(`Simulation session ${sessionId} not found`);
  return session;
}

function upsertSession(next: SimulationSession) {
  sessionsStore = sortByUpdated(sessionsStore.map((entry) => (entry.id === next.id ? next : entry)).concat(
    sessionsStore.some((entry) => entry.id === next.id) ? [] : [next]
  ));
}

function runtimeElapsedMs(runtime: SessionRuntime, nowMs = Date.now()): number {
  if (runtime.pausedAtMs) return runtime.elapsedBeforePauseMs;
  return runtime.elapsedBeforePauseMs + Math.max(0, nowMs - runtime.startedAtMs);
}

function buildObjectiveStateMap(objectives: TrainingObjective[]): SimulationSession['objectiveState'] {
  return objectives.reduce<SimulationSession['objectiveState']>((acc, objective) => {
    acc[objective.id] = { completed: false };
    return acc;
  }, {});
}

function clearRuntimeTimers(runtime: SessionRuntime) {
  for (const timer of runtime.timers.values()) clearTimeout(timer);
  runtime.timers.clear();
}

function emitSimulationTrigger(session: SimulationSession, trigger: SimulationTrigger, nowMs = Date.now()) {
  const event: SimulationTimelineEvent = {
    id: createId('sim_evt', nowMs),
    sessionId: session.id,
    scenarioId: session.scenarioId,
    opId: session.opId,
    eventType: trigger.eventType,
    title: trigger.title,
    message: trigger.message,
    emittedAt: nowIso(nowMs),
    timeOffsetSeconds: trigger.timeOffsetSeconds,
    severity: trigger.severity,
    isSimulation: true,
    payload: trigger.payload || {},
  };
  timelineEventsStore = sortTimeline([...timelineEventsStore, event]);

  if (session.opId) {
    appendOperationEvent(
      {
        opId: session.opId,
        scopeKind: 'OP',
        kind: trigger.eventType,
        createdBy: session.startedBy,
        isSimulation: true,
        simulationSessionId: session.id,
        simulationScenarioId: session.scenarioId,
        payload: {
          ...(trigger.payload || {}),
          simulation: {
            sessionId: session.id,
            scenarioId: session.scenarioId,
            triggerId: trigger.id,
            title: trigger.title,
            severity: trigger.severity,
            isSimulation: true,
          },
          narrative: trigger.message,
        },
      },
      nowMs
    );
  }
}

function maybeAutoCompleteSession(sessionId: string, nowMs = Date.now()) {
  const session = getSessionById(sessionId);
  const runtime = runtimeBySessionId.get(sessionId);
  if (!runtime) return;
  const scenario = getScenarioById(session.scenarioId);
  const allTriggersEmitted = runtime.emittedTriggerIds.size >= scenario.triggers.length;
  if (!allTriggersEmitted) return;
  stopSimulationSession(sessionId, { asCompleted: true }, nowMs);
}

function scheduleSessionTimers(sessionId: string, nowMs = Date.now()) {
  const session = getSessionById(sessionId);
  const runtime = runtimeBySessionId.get(sessionId);
  if (!runtime) return;
  const scenario = getScenarioById(session.scenarioId);
  clearRuntimeTimers(runtime);
  runtime.startedAtMs = nowMs;
  runtime.pausedAtMs = undefined;

  for (const trigger of scenario.triggers) {
    if (runtime.emittedTriggerIds.has(trigger.id)) continue;
    const remainingMs = Math.max(0, trigger.timeOffsetSeconds * 1000 - runtime.elapsedBeforePauseMs);
    const timer = setTimeout(() => {
      const currentSession = getSessionById(sessionId);
      const currentRuntime = runtimeBySessionId.get(sessionId);
      if (!currentRuntime || currentSession.status !== 'RUNNING') return;
      currentRuntime.emittedTriggerIds.add(trigger.id);
      emitSimulationTrigger(currentSession, trigger, Date.now());
      const elapsedSeconds = Math.floor(runtimeElapsedMs(currentRuntime, Date.now()) / 1000);
      upsertSession({
        ...currentSession,
        elapsedSeconds,
        emittedEventIds: [...currentRuntime.emittedTriggerIds],
      });
      notifyListeners();
      maybeAutoCompleteSession(sessionId, Date.now());
    }, remainingMs);
    runtime.timers.set(trigger.id, timer);
  }
}

function toScoreBand(score: number): TrainingResult['outcome'] {
  if (score >= 80) return 'PASS';
  if (score >= 55) return 'PARTIAL';
  return 'FAIL';
}

function generateDebriefNarrative(scenario: TrainingScenario, result: TrainingResult): string {
  const rescuedLine =
    result.rescueScore >= 70
      ? 'Rescue-first execution remained strong under timeline pressure.'
      : 'Rescue outcomes need tighter prioritization in the next iteration.';
  return [
    `KISS: ${scenario.title} completed with ${result.score}% overall score.`,
    rescuedLine,
    `Required objectives completed: ${result.objectiveSummary.filter((entry) => entry.required && entry.completed).length}/${result.objectiveSummary.filter((entry) => entry.required).length}.`,
    `Outcome: ${result.outcome}.`,
  ].join('\n');
}

function buildRecommendations(result: TrainingResult): string[] {
  const recs: string[] = [];
  const missedRequired = result.objectiveSummary.filter((entry) => entry.required && !entry.completed).length;
  if (missedRequired > 0) recs.push(`Close ${missedRequired} required objective gaps before certification attempts.`);
  if (result.rescueScore < 70) recs.push('Increase casualty stabilization and extraction priority in early phase.');
  if (result.timelineSummary.filter((entry) => entry.severity === 'CRITICAL').length > 0) {
    recs.push('Practice critical-event comms brevity and escalation discipline.');
  }
  if (recs.length === 0) recs.push('Maintain current SOP adherence and repeat scenario at higher difficulty.');
  return recs;
}

function createTrainingResultForSession(session: SimulationSession, nowMs = Date.now()): TrainingResult {
  const scenario = getScenarioById(session.scenarioId);
  const objectiveSummary = scenario.objectives.map((objective) => ({
    objectiveId: objective.id,
    completed: Boolean(session.objectiveState[objective.id]?.completed),
    required: objective.required !== false,
    rescueWeighted: Boolean(objective.rescueWeighted),
    completedAt: session.objectiveState[objective.id]?.completedAt,
  }));
  const completedRequired = objectiveSummary.filter((entry) => entry.required && entry.completed).length;
  const totalRequired = Math.max(1, objectiveSummary.filter((entry) => entry.required).length);
  const baseScore = Math.round((completedRequired / totalRequired) * 70);

  const rescueObjectives = objectiveSummary.filter((entry) => entry.rescueWeighted);
  const completedRescue = rescueObjectives.filter((entry) => entry.completed).length;
  const rescueScore =
    rescueObjectives.length > 0 ? Math.round((completedRescue / rescueObjectives.length) * 100) : baseScore;
  const score = Math.round(baseScore * 0.7 + rescueScore * 0.3);

  const timelineSummary = sortTimeline(
    timelineEventsStore.filter((event) => event.sessionId === session.id)
  ).map((event) => ({
    eventType: event.eventType,
    emittedAt: event.emittedAt,
    severity: event.severity,
    title: event.title,
  }));

  const result: TrainingResult = {
    id: createId('training_result', nowMs),
    sessionId: session.id,
    scenarioId: session.scenarioId,
    opId: session.opId,
    participants: [session.startedBy],
    generatedAt: nowIso(nowMs),
    outcome: toScoreBand(score),
    score,
    rescueScore,
    objectiveSummary,
    timelineSummary,
    recommendations: [],
    debriefNarrative: '',
    source: 'SIM_ENGINE_V1',
  };
  result.recommendations = buildRecommendations(result);
  result.debriefNarrative = generateDebriefNarrative(scenario, result);
  return result;
}

export function createTrainingScenario(input: TrainingScenarioCreateInput, nowMs = Date.now()): TrainingScenario {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  if (!title) throw new Error('Scenario title is required');
  if (!description) throw new Error('Scenario description is required');
  const created: TrainingScenario = {
    id: createId('training_scenario', nowMs),
    title,
    description,
    narrativeContext: input.narrativeContext?.trim(),
    difficulty: input.difficulty || 'STANDARD',
    tags: [...new Set((input.tags || []).map((tag) => String(tag || '').trim()).filter(Boolean))],
    prerequisites: [...new Set((input.prerequisites || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
    testedSopIds: [...new Set((input.testedSopIds || []).map((entry) => String(entry || '').trim()).filter(Boolean))],
    objectives: normalizeScenarioObjectives(input.objectives),
    triggers: normalizeScenarioTriggers(input.triggers),
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  scenariosStore = sortByUpdated([created, ...scenariosStore]);
  notifyListeners();
  return created;
}

export function upsertTrainingScenario(
  scenarioId: string | undefined,
  input: TrainingScenarioCreateInput,
  nowMs = Date.now()
): TrainingScenario {
  if (!scenarioId) return createTrainingScenario(input, nowMs);
  const existing = scenariosStore.find((entry) => entry.id === scenarioId);
  if (!existing) return createTrainingScenario(input, nowMs);
  const updated: TrainingScenario = {
    ...existing,
    title: String(input.title || '').trim() || existing.title,
    description: String(input.description || '').trim() || existing.description,
    narrativeContext: input.narrativeContext?.trim() || existing.narrativeContext,
    difficulty: input.difficulty || existing.difficulty,
    tags: [...new Set([...(existing.tags || []), ...((input.tags || []).map((tag) => String(tag).trim()).filter(Boolean))])],
    prerequisites: [...new Set(input.prerequisites || existing.prerequisites || [])],
    testedSopIds: [...new Set(input.testedSopIds || existing.testedSopIds || [])],
    objectives: normalizeScenarioObjectives(input.objectives || existing.objectives),
    triggers: normalizeScenarioTriggers(input.triggers || existing.triggers),
    updatedAt: nowIso(nowMs),
  };
  scenariosStore = sortByUpdated(scenariosStore.map((entry) => (entry.id === scenarioId ? updated : entry)));
  notifyListeners();
  return updated;
}

export function listTrainingScenarios(): TrainingScenario[] {
  return sortByUpdated(scenariosStore);
}

export function getTrainingScenarioById(scenarioId: string): TrainingScenario | null {
  return scenariosStore.find((entry) => entry.id === scenarioId) || null;
}

export function startSimulationSession(input: SimulationStartInput, nowMs = Date.now()): SimulationSession {
  const scenario = getScenarioById(input.scenarioId);
  const session: SimulationSession = {
    id: createId('sim_session', nowMs),
    scenarioId: scenario.id,
    opId: input.opId,
    startedBy: input.startedBy,
    startedAt: nowIso(nowMs),
    status: 'RUNNING',
    elapsedSeconds: 0,
    objectiveState: buildObjectiveStateMap(scenario.objectives),
    emittedEventIds: [],
  };
  upsertSession(session);
  runtimeBySessionId.set(session.id, {
    sessionId: session.id,
    startedAtMs: nowMs,
    elapsedBeforePauseMs: 0,
    timers: new Map(),
    emittedTriggerIds: new Set(),
  });
  scheduleSessionTimers(session.id, nowMs);
  notifyListeners();
  return session;
}

export function pauseSimulationSession(sessionId: string, nowMs = Date.now()): SimulationSession {
  const session = getSessionById(sessionId);
  if (session.status !== 'RUNNING') return session;
  const runtime = runtimeBySessionId.get(sessionId);
  if (!runtime) throw new Error('Session runtime not found');
  runtime.elapsedBeforePauseMs = runtimeElapsedMs(runtime, nowMs);
  runtime.pausedAtMs = nowMs;
  clearRuntimeTimers(runtime);
  const next: SimulationSession = {
    ...session,
    status: 'PAUSED',
    pausedAt: nowIso(nowMs),
    elapsedSeconds: Math.floor(runtime.elapsedBeforePauseMs / 1000),
    emittedEventIds: [...runtime.emittedTriggerIds],
  };
  upsertSession(next);
  notifyListeners();
  return next;
}

export function resumeSimulationSession(sessionId: string, nowMs = Date.now()): SimulationSession {
  const session = getSessionById(sessionId);
  if (session.status !== 'PAUSED') return session;
  const runtime = runtimeBySessionId.get(sessionId);
  if (!runtime) throw new Error('Session runtime not found');
  runtime.startedAtMs = nowMs;
  runtime.pausedAtMs = undefined;
  const next: SimulationSession = {
    ...session,
    status: 'RUNNING',
    resumedAt: nowIso(nowMs),
  };
  upsertSession(next);
  scheduleSessionTimers(sessionId, nowMs);
  notifyListeners();
  return next;
}

export function injectSimulationEvent(
  sessionId: string,
  input: Omit<SimulationTrigger, 'id' | 'timeOffsetSeconds'> & { payload?: Record<string, unknown> },
  nowMs = Date.now()
): SimulationTimelineEvent {
  const session = getSessionById(sessionId);
  if (!['RUNNING', 'PAUSED'].includes(session.status)) {
    throw new Error('Session must be running or paused to inject events');
  }
  const runtime = runtimeBySessionId.get(sessionId);
  const elapsedSeconds = runtime ? Math.floor(runtimeElapsedMs(runtime, nowMs) / 1000) : session.elapsedSeconds;
  const trigger: SimulationTrigger = {
    id: createId('manual_trigger', nowMs),
    timeOffsetSeconds: elapsedSeconds,
    eventType: String(input.eventType || 'MANUAL_INJECT').toUpperCase(),
    title: input.title || 'Manual Injected Event',
    message: input.message || 'Instructor injected event.',
    severity: input.severity || 'MEDIUM',
    payload: input.payload || {},
    objectiveId: input.objectiveId,
    requiresResponse: input.requiresResponse,
  };
  emitSimulationTrigger(session, trigger, nowMs);
  const next: SimulationSession = {
    ...session,
    emittedEventIds: [...(session.emittedEventIds || []), trigger.id],
    elapsedSeconds,
  };
  upsertSession(next);
  notifyListeners();
  return timelineEventsStore[timelineEventsStore.length - 1];
}

export function markSimulationObjective(input: MarkObjectiveInput, nowMs = Date.now()): SimulationSession {
  const session = getSessionById(input.sessionId);
  const state = session.objectiveState[input.objectiveId];
  if (!state) throw new Error(`Objective ${input.objectiveId} not found in session`);
  const next: SimulationSession = {
    ...session,
    objectiveState: {
      ...session.objectiveState,
      [input.objectiveId]: {
        completed: input.completed,
        completedAt: input.completed ? nowIso(nowMs) : undefined,
        note: input.note,
      },
    },
  };
  upsertSession(next);
  notifyListeners();
  return next;
}

export function stopSimulationSession(
  sessionId: string,
  options: { asCompleted?: boolean } = {},
  nowMs = Date.now()
): { session: SimulationSession; result: TrainingResult } {
  const session = getSessionById(sessionId);
  const runtime = runtimeBySessionId.get(sessionId);
  if (runtime) {
    runtime.elapsedBeforePauseMs = runtimeElapsedMs(runtime, nowMs);
    clearRuntimeTimers(runtime);
  }
  const next: SimulationSession = {
    ...session,
    status: options.asCompleted ? 'COMPLETED' : 'STOPPED',
    stoppedAt: nowIso(nowMs),
    elapsedSeconds: runtime ? Math.floor(runtime.elapsedBeforePauseMs / 1000) : session.elapsedSeconds,
  };
  upsertSession(next);
  runtimeBySessionId.delete(sessionId);

  const result = createTrainingResultForSession(next, nowMs);
  resultsStore = sortByUpdated([result, ...resultsStore]);
  notifyListeners();
  return { session: next, result };
}

export function listSimulationSessions(filters: { scenarioId?: string; status?: SimulationSession['status'] } = {}): SimulationSession[] {
  return sortByUpdated(sessionsStore).filter((session) => {
    if (filters.scenarioId && session.scenarioId !== filters.scenarioId) return false;
    if (filters.status && session.status !== filters.status) return false;
    return true;
  });
}

export function getSimulationSession(sessionId: string): SimulationSession | null {
  return sessionsStore.find((entry) => entry.id === sessionId) || null;
}

export function listSimulationTimelineEvents(sessionId?: string): SimulationTimelineEvent[] {
  const rows = sortTimeline(timelineEventsStore);
  if (!sessionId) return rows;
  return rows.filter((event) => event.sessionId === sessionId);
}

export function listTrainingResults(filters: { scenarioId?: string; sessionId?: string } = {}): TrainingResult[] {
  return sortByUpdated(resultsStore).filter((result) => {
    if (filters.scenarioId && result.scenarioId !== filters.scenarioId) return false;
    if (filters.sessionId && result.sessionId !== filters.sessionId) return false;
    return true;
  });
}

export function getLatestTrainingResultForSession(sessionId: string): TrainingResult | null {
  return sortByUpdated(resultsStore).find((result) => result.sessionId === sessionId) || null;
}

export function subscribeTrainingSimulation(listener: SimulationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetTrainingSimulationState() {
  for (const runtime of runtimeBySessionId.values()) clearRuntimeTimers(runtime);
  runtimeBySessionId.clear();
  scenariosStore = [];
  sessionsStore = [];
  timelineEventsStore = [];
  resultsStore = [];
  notifyListeners();
}

