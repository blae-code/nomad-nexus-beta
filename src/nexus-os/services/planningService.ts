/**
 * Planning Service (MVP in-memory adapter)
 *
 * Collaborative artifact workspace for PLAN phase with decision logging hooks.
 */

import type {
  Assumption,
  Decision,
  Objective,
  Phase,
  Task,
  ArtifactRef,
  ArtifactStatus,
} from '../schemas/opSchemas';
import { clampConfidence } from '../schemas/coreSchemas';
import { getOpCommentById } from './opThreadService';

export interface ObjectiveCreateInput extends Omit<Objective, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export interface PhaseCreateInput extends Omit<Phase, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export interface TaskCreateInput extends Omit<Task, 'id' | 'createdAt' | 'updatedAt'> {
  id?: string;
}

export interface AssumptionCreateInput extends Omit<Assumption, 'id' | 'createdAt' | 'updatedAt' | 'challengedBy'> {
  id?: string;
}

type PlanningListener = (state: {
  objectives: Objective[];
  phases: Phase[];
  tasks: Task[];
  assumptions: Assumption[];
  decisions: Decision[];
}) => void;

let objectivesStore: Objective[] = [];
let phasesStore: Phase[] = [];
let tasksStore: Task[] = [];
let assumptionsStore: Assumption[] = [];
let decisionsStore: Decision[] = [];
const listeners = new Set<PlanningListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function notifyListeners() {
  for (const listener of listeners) {
    listener({
      objectives: [...objectivesStore],
      phases: [...phasesStore],
      tasks: [...tasksStore],
      assumptions: [...assumptionsStore],
      decisions: [...decisionsStore],
    });
  }
}

export function createObjective(input: ObjectiveCreateInput, nowMs = Date.now()): Objective {
  const record: Objective = {
    id: input.id || createId('obj', nowMs),
    opId: input.opId,
    title: input.title.trim() || 'Untitled objective',
    body: input.body,
    priority: input.priority || 'MED',
    status: input.status || 'OPEN',
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  objectivesStore = [record, ...objectivesStore];
  notifyListeners();
  return record;
}

export function listObjectives(opId: string): Objective[] {
  return objectivesStore.filter((entry) => entry.opId === opId);
}

export function updateObjectiveStatus(objectiveId: string, status: ArtifactStatus, nowMs = Date.now()): Objective {
  const current = objectivesStore.find((entry) => entry.id === objectiveId);
  if (!current) throw new Error(`Objective ${objectiveId} not found`);
  const next = { ...current, status, updatedAt: nowIso(nowMs) };
  objectivesStore = objectivesStore.map((entry) => (entry.id === objectiveId ? next : entry));
  notifyListeners();
  return next;
}

export function createPhase(input: PhaseCreateInput, nowMs = Date.now()): Phase {
  const record: Phase = {
    id: input.id || createId('phase', nowMs),
    opId: input.opId,
    title: input.title.trim() || 'Untitled phase',
    orderIndex: Number.isFinite(input.orderIndex) ? input.orderIndex : 0,
    timeHint: input.timeHint,
    status: input.status || 'OPEN',
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  phasesStore = [...phasesStore, record].sort((a, b) => a.orderIndex - b.orderIndex);
  notifyListeners();
  return record;
}

export function listPhases(opId: string): Phase[] {
  return phasesStore.filter((entry) => entry.opId === opId).sort((a, b) => a.orderIndex - b.orderIndex);
}

export function updatePhaseStatus(phaseId: string, status: ArtifactStatus, nowMs = Date.now()): Phase {
  const current = phasesStore.find((entry) => entry.id === phaseId);
  if (!current) throw new Error(`Phase ${phaseId} not found`);
  const next = { ...current, status, updatedAt: nowIso(nowMs) };
  phasesStore = phasesStore.map((entry) => (entry.id === phaseId ? next : entry));
  notifyListeners();
  return next;
}

export function createTask(input: TaskCreateInput, nowMs = Date.now()): Task {
  const record: Task = {
    id: input.id || createId('task', nowMs),
    opId: input.opId,
    domain: input.domain || 'OTHER',
    title: input.title.trim() || 'Untitled task',
    body: input.body,
    ownerElement: input.ownerElement,
    prerequisites: [...new Set(input.prerequisites || [])],
    successCriteria: input.successCriteria,
    abortCriteria: input.abortCriteria,
    status: input.status || 'OPEN',
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  tasksStore = [record, ...tasksStore];
  notifyListeners();
  return record;
}

export function listTasks(opId: string): Task[] {
  return tasksStore.filter((entry) => entry.opId === opId);
}

export function updateTaskStatus(taskId: string, status: ArtifactStatus, nowMs = Date.now()): Task {
  const current = tasksStore.find((entry) => entry.id === taskId);
  if (!current) throw new Error(`Task ${taskId} not found`);
  const next = { ...current, status, updatedAt: nowIso(nowMs) };
  tasksStore = tasksStore.map((entry) => (entry.id === taskId ? next : entry));
  notifyListeners();
  return next;
}

export function createAssumption(input: AssumptionCreateInput, nowMs = Date.now()): Assumption {
  const record: Assumption = {
    id: input.id || createId('assume', nowMs),
    opId: input.opId,
    statement: input.statement.trim(),
    confidence: clampConfidence(input.confidence),
    ttlProfileId: input.ttlProfileId,
    createdBy: input.createdBy,
    status: input.status || 'ACTIVE',
    challengedBy: [],
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  assumptionsStore = [record, ...assumptionsStore];
  notifyListeners();
  return record;
}

export function listAssumptions(opId: string): Assumption[] {
  return assumptionsStore.filter((entry) => entry.opId === opId);
}

export function challengeAssumption(assumptionId: string, challengerId: string, nowMs = Date.now()): Assumption {
  const assumption = assumptionsStore.find((entry) => entry.id === assumptionId);
  if (!assumption) throw new Error(`Assumption ${assumptionId} not found`);
  const next: Assumption = {
    ...assumption,
    status: 'CHALLENGED',
    challengedBy: [...new Set([...(assumption.challengedBy || []), challengerId])],
    updatedAt: nowIso(nowMs),
  };
  assumptionsStore = assumptionsStore.map((entry) => (entry.id === assumptionId ? next : entry));
  notifyListeners();
  return next;
}

export function createDecision(
  input: Omit<Decision, 'id' | 'createdAt'> & { id?: string },
  nowMs = Date.now()
): Decision {
  const record: Decision = {
    id: input.id || createId('decision', nowMs),
    opId: input.opId,
    sourceCommentId: input.sourceCommentId,
    title: input.title.trim() || 'Decision',
    body: input.body.trim() || 'No details provided.',
    linkedArtifactRefs: input.linkedArtifactRefs || [],
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
  };
  decisionsStore = [record, ...decisionsStore];
  notifyListeners();
  return record;
}

export function listDecisions(opId: string): Decision[] {
  return decisionsStore
    .filter((entry) => entry.opId === opId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function promoteCommentToDecision(
  input: {
    opId: string;
    sourceCommentId: string;
    title: string;
    body?: string;
    linkedArtifactRefs?: ArtifactRef[];
    createdBy: string;
  },
  nowMs = Date.now()
): Decision {
  const sourceComment = getOpCommentById(input.sourceCommentId);
  if (!sourceComment) throw new Error(`Comment ${input.sourceCommentId} not found`);
  if (sourceComment.opId !== input.opId) {
    throw new Error('Comment does not belong to target operation');
  }
  return createDecision(
    {
      opId: input.opId,
      sourceCommentId: sourceComment.id,
      title: input.title,
      body: input.body || sourceComment.body,
      linkedArtifactRefs: input.linkedArtifactRefs || sourceComment.linkedArtifactRefs,
      createdBy: input.createdBy,
    },
    nowMs
  );
}

export function subscribePlanning(listener: PlanningListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetPlanningServiceState() {
  objectivesStore = [];
  phasesStore = [];
  tasksStore = [];
  assumptionsStore = [];
  decisionsStore = [];
  notifyListeners();
}
