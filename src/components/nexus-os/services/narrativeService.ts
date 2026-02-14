/**
 * Narrative Service (MVP in-memory adapter)
 *
 * This service provides:
 * - Character personas for immersive roleplay context.
 * - Scoped narrative logs for operations and campaign continuity.
 * - Report-to-narrative bridges for OP_BRIEF/AAR publication.
 *
 * Guardrails:
 * - No global unscoped chat surface.
 * - Official narrative tracks preserve source/refs and AI transparency.
 * - Rescue-first framing is explicit in official generated entries.
 */

import type {
  CharacterProfile,
  NarrativeEvent,
  NarrativeEventType,
  NarrativeRef,
  NarrativeTone,
  NarrativeVisibility,
  StoryArc,
} from '../schemas/narrativeSchemas';
import type { ReportArtifact } from '../schemas/reportSchemas';
import { getOperationById, listOperationEvents } from './operationService';
import { listObjectives, listPhases, listTasks } from './planningService';
import { listComments } from './opThreadService';

export interface CharacterProfileUpsertInput {
  memberProfileId: string;
  characterName: string;
  biography?: string;
  affiliation?: string;
  specialties?: string[];
  inCharacterByDefault?: boolean;
}

export interface NarrativeEventCreateInput {
  opId?: string;
  campaignId?: string;
  authorId: string;
  authorLabel?: string;
  type: NarrativeEventType;
  tone?: NarrativeTone;
  title: string;
  body: string;
  tags?: string[];
  inCharacter?: boolean;
  rescueFirst?: boolean;
  visibility?: NarrativeVisibility;
  sourceKind?: NarrativeEvent['sourceKind'];
  sourceRefs?: NarrativeRef[];
  generatedByAi?: boolean;
  aiModelHint?: string;
}

export interface NarrativeEventFilters {
  opId?: string;
  campaignId?: string;
  byAuthorId?: string;
  visibilityEnvelope?: NarrativeVisibility[];
  inCharacter?: boolean;
  types?: NarrativeEventType[];
}

export interface StoryArcCreateInput {
  name: string;
  description?: string;
  operationIds?: string[];
  createdBy: string;
}

type NarrativeListener = (state: {
  characterProfiles: CharacterProfile[];
  narrativeEvents: NarrativeEvent[];
  storyArcs: StoryArc[];
}) => void;

let characterProfilesStore: CharacterProfile[] = [];
let narrativeEventsStore: NarrativeEvent[] = [];
let storyArcStore: StoryArc[] = [];
const listeners = new Set<NarrativeListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortByUpdatedDesc<T extends { updatedAt: string; id: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const byTime = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function sortEvents(records: NarrativeEvent[]): NarrativeEvent[] {
  return [...records].sort((a, b) => {
    const byTime = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function notifyListeners() {
  const snapshot = {
    characterProfiles: sortByUpdatedDesc(characterProfilesStore),
    narrativeEvents: sortEvents(narrativeEventsStore),
    storyArcs: sortByUpdatedDesc(storyArcStore),
  };
  for (const listener of listeners) listener(snapshot);
}

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set((tags || []).map((tag) => String(tag || '').trim()).filter(Boolean))];
}

function resolveDefaultVisibility(type: NarrativeEventType, opId?: string): NarrativeVisibility {
  if (type === 'PERSONAL_LOG') return 'PRIVATE';
  if (opId) return 'OP';
  return 'ORG';
}

function validateScopedNarrative(input: NarrativeEventCreateInput): void {
  const visibility = input.visibility || resolveDefaultVisibility(input.type, input.opId);
  // Guardrail: OP-scoped narrative must always bind to an opId.
  if (visibility === 'OP' && !input.opId) {
    throw new Error('OP-scoped narrative requires opId.');
  }
}

export function upsertCharacterProfile(
  input: CharacterProfileUpsertInput,
  nowMs = Date.now()
): CharacterProfile {
  const memberProfileId = String(input.memberProfileId || '').trim();
  const characterName = String(input.characterName || '').trim();
  if (!memberProfileId) throw new Error('memberProfileId is required');
  if (!characterName) throw new Error('characterName is required');

  const existing = characterProfilesStore.find((profile) => profile.memberProfileId === memberProfileId);
  if (existing) {
    const updated: CharacterProfile = {
      ...existing,
      characterName,
      biography: input.biography?.trim() || '',
      affiliation: input.affiliation?.trim() || '',
      specialties: normalizeTags(input.specialties),
      inCharacterByDefault:
        typeof input.inCharacterByDefault === 'boolean'
          ? input.inCharacterByDefault
          : existing.inCharacterByDefault,
      updatedAt: nowIso(nowMs),
    };
    characterProfilesStore = sortByUpdatedDesc(
      characterProfilesStore.map((profile) => (profile.id === existing.id ? updated : profile))
    );
    notifyListeners();
    return updated;
  }

  const created: CharacterProfile = {
    id: createId('character_profile', nowMs),
    memberProfileId,
    characterName,
    biography: input.biography?.trim() || '',
    affiliation: input.affiliation?.trim() || '',
    specialties: normalizeTags(input.specialties),
    inCharacterByDefault: Boolean(input.inCharacterByDefault),
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  characterProfilesStore = sortByUpdatedDesc([created, ...characterProfilesStore]);
  notifyListeners();
  return created;
}

export function getCharacterProfileByMember(memberProfileId: string): CharacterProfile | null {
  return characterProfilesStore.find((profile) => profile.memberProfileId === memberProfileId) || null;
}

export function listCharacterProfiles(): CharacterProfile[] {
  return sortByUpdatedDesc(characterProfilesStore);
}

export function createNarrativeEvent(
  input: NarrativeEventCreateInput,
  nowMs = Date.now()
): NarrativeEvent {
  validateScopedNarrative(input);

  const title = String(input.title || '').trim();
  const body = String(input.body || '').trim();
  if (!title) throw new Error('Narrative title is required');
  if (!body) throw new Error('Narrative body is required');

  const visibility = input.visibility || resolveDefaultVisibility(input.type, input.opId);
  const created: NarrativeEvent = {
    id: createId('narrative_evt', nowMs),
    opId: input.opId,
    campaignId: input.campaignId,
    authorId: String(input.authorId || '').trim() || 'unknown',
    authorLabel: String(input.authorLabel || '').trim() || undefined,
    type: input.type,
    tone: input.tone || (input.inCharacter ? 'IC_COMMS' : 'MISSION_CONTROL'),
    title,
    body,
    tags: normalizeTags(input.tags),
    inCharacter: Boolean(input.inCharacter),
    rescueFirst: input.rescueFirst !== false,
    visibility,
    sourceKind: input.sourceKind || 'USER',
    sourceRefs: [...(input.sourceRefs || [])],
    generatedByAi: Boolean(input.generatedByAi),
    aiModelHint: input.aiModelHint?.trim() || undefined,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  narrativeEventsStore = sortEvents([created, ...narrativeEventsStore]);
  notifyListeners();
  return created;
}

export function listNarrativeEvents(filters: NarrativeEventFilters = {}): NarrativeEvent[] {
  const envelope = filters.visibilityEnvelope || ['PRIVATE', 'SQUAD', 'OP', 'ORG', 'PUBLIC'];
  return sortEvents(narrativeEventsStore).filter((event) => {
    if (filters.opId && event.opId !== filters.opId) return false;
    if (filters.campaignId && event.campaignId !== filters.campaignId) return false;
    if (filters.byAuthorId && event.authorId !== filters.byAuthorId) return false;
    if (typeof filters.inCharacter === 'boolean' && event.inCharacter !== filters.inCharacter) return false;
    if (filters.types && filters.types.length > 0 && !filters.types.includes(event.type)) return false;
    if (!envelope.includes(event.visibility)) return false;
    return true;
  });
}

export function createStoryArc(input: StoryArcCreateInput, nowMs = Date.now()): StoryArc {
  const name = String(input.name || '').trim();
  if (!name) throw new Error('Story arc name is required');
  const created: StoryArc = {
    id: createId('story_arc', nowMs),
    name,
    description: input.description?.trim(),
    operationIds: [...new Set((input.operationIds || []).filter(Boolean))],
    createdBy: input.createdBy,
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };
  storyArcStore = sortByUpdatedDesc([created, ...storyArcStore]);
  notifyListeners();
  return created;
}

export function linkOperationToStoryArc(storyArcId: string, opId: string, nowMs = Date.now()): StoryArc {
  const arc = storyArcStore.find((entry) => entry.id === storyArcId);
  if (!arc) throw new Error(`Story arc ${storyArcId} not found`);
  const updated: StoryArc = {
    ...arc,
    operationIds: [...new Set([...(arc.operationIds || []), opId])],
    updatedAt: nowIso(nowMs),
  };
  storyArcStore = sortByUpdatedDesc(storyArcStore.map((entry) => (entry.id === storyArcId ? updated : entry)));
  notifyListeners();
  return updated;
}

export function listStoryArcs(): StoryArc[] {
  return sortByUpdatedDesc(storyArcStore);
}

export function createMissionBriefNarrative(
  opId: string,
  actorId: string,
  options: { title?: string; additionalContext?: string; sourceRefs?: NarrativeRef[] } = {},
  nowMs = Date.now()
): NarrativeEvent {
  const operation = getOperationById(opId);
  if (!operation) throw new Error(`Operation ${opId} not found`);
  const objectives = listObjectives(opId);
  const phases = listPhases(opId);
  const tasks = listTasks(opId);
  const bodyLines = [
    `KISS: prioritize rescue continuity and clear comms discipline.`,
    `AO anchor: ${operation.ao.nodeId}. Posture: ${operation.posture}. Status: ${operation.status}.`,
    `Objectives: ${objectives.length}. Phases: ${phases.length}. Tasks: ${tasks.length}.`,
    objectives[0] ? `Primary objective: ${objectives[0].title}.` : `Primary objective: unknown (not recorded).`,
  ];
  if (options.additionalContext?.trim()) {
    bodyLines.push(`Commander note: ${options.additionalContext.trim()}`);
  }

  return createNarrativeEvent(
    {
      opId,
      authorId: actorId,
      type: 'MISSION_BRIEF',
      tone: 'MISSION_CONTROL',
      title: options.title?.trim() || `Mission Brief - ${operation.name}`,
      body: bodyLines.join('\n'),
      tags: ['brief', 'rescue-first'],
      inCharacter: false,
      rescueFirst: true,
      visibility: 'OP',
      sourceKind: 'SYSTEM',
      sourceRefs: options.sourceRefs || [{ kind: 'operation', id: opId }],
      generatedByAi: false,
    },
    nowMs
  );
}

export function createStorySoFarSummary(
  opId: string,
  actorId: string,
  nowMs = Date.now()
): NarrativeEvent {
  const operation = getOperationById(opId);
  if (!operation) throw new Error(`Operation ${opId} not found`);
  const events = listOperationEvents(opId).slice(0, 8);
  const thread = listComments(opId).slice(0, 6);

  const eventLines = events.length
    ? events.map((entry, index) => `${index + 1}. ${entry.kind} by ${entry.createdBy}`)
    : ['1. Event stream sparse: no op events recorded yet.'];
  const threadLines = thread.length
    ? thread.map((entry) => `- ${entry.by}: ${entry.body}`)
    : ['- No scoped op thread entries yet.'];

  return createNarrativeEvent(
    {
      opId,
      authorId: actorId,
      type: 'SYSTEM_SUMMARY',
      tone: 'MISSION_CONTROL',
      title: `Story So Far - ${operation.name}`,
      body: [
        'KISS: concise operational narrative snapshot.',
        'Mission beats:',
        ...eventLines,
        'Thread highlights:',
        ...threadLines,
        'Rescue-first check: unknown unless explicitly logged in events/comments.',
      ].join('\n'),
      tags: ['story-so-far', 'ops-summary'],
      inCharacter: false,
      rescueFirst: true,
      visibility: 'OP',
      sourceKind: 'SYSTEM',
      sourceRefs: [{ kind: 'operation', id: opId }],
      generatedByAi: false,
    },
    nowMs
  );
}

export function appendNarrativeFromReport(report: ReportArtifact, nowMs = Date.now()): NarrativeEvent | null {
  if (!(report.kind === 'OP_BRIEF' || report.kind === 'AAR')) return null;
  const opId = report.scope.opId;
  if (!opId) return null;
  const narrativeText = report.narrative
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((section) => `## ${section.heading}\n${section.body}`)
    .join('\n\n');

  return createNarrativeEvent(
    {
      opId,
      authorId: report.generatedBy || 'system',
      authorLabel: report.generatedBy || 'system',
      type: report.kind === 'OP_BRIEF' ? 'MISSION_BRIEF' : 'AAR_BEAT',
      tone: 'MISSION_CONTROL',
      title: report.title,
      body: narrativeText || 'Narrative unavailable for this report.',
      tags: ['report-bridge', report.kind.toLowerCase()],
      inCharacter: false,
      rescueFirst: true,
      visibility: 'OP',
      sourceKind: 'AI',
      sourceRefs: [...(report.inputs?.snapshotRefs || report.inputs?.refs || [])],
      generatedByAi: true,
      aiModelHint: 'report-generator',
    },
    nowMs
  );
}

export function subscribeNarrative(listener: NarrativeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetNarrativeServiceState() {
  characterProfilesStore = [];
  narrativeEventsStore = [];
  storyArcStore = [];
  notifyListeners();
}

