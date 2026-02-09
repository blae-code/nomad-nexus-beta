/**
 * Intel Service (MVP in-memory adapter)
 *
 * Guardrails:
 * - No fabricated telemetry. Intel objects represent hypotheses and observations.
 * - Contradictions are preserved via parallel endorsements/challenges.
 * - Promotion path is auditable and permission-gated via stub hooks.
 */

import { getDefaultIntelTTLProfileIdForStratum, getDefaultIntelTTLSeconds } from '../registries/ttlProfileRegistry';
import type {
  IntelChallenge,
  IntelComment,
  IntelConfidenceBand,
  IntelObject,
  IntelPromotionHistoryEntry,
  IntelScope,
  IntelScopeKind,
  IntelStratum,
  IntelType,
} from '../schemas/intelSchemas';
import { isStaleAt } from '../schemas/coreSchemas';

export interface IntelObjectCreateInput {
  type: IntelType;
  stratum?: IntelStratum;
  scope?: IntelScope;
  anchor: IntelObject['anchor'];
  title: string;
  body: string;
  tags?: string[];
  confidence?: IntelConfidenceBand;
  ttlProfileId?: string;
  createdBy: string;
}

export interface IntelViewContext {
  viewerId?: string;
  includeScopes?: IntelScopeKind[];
  activeOpId?: string;
  includeRetired?: boolean;
  includeStale?: boolean;
}

export interface IntelListFilters {
  nodeId?: string;
  type?: IntelType;
  stratum?: IntelStratum;
  tag?: string;
}

export interface IntelTTLState {
  ttlSeconds: number;
  remainingSeconds: number;
  decayRatio: number;
  stale: boolean;
}

export interface IntelRenderable extends IntelObject {
  ttl: IntelTTLState;
}

export interface IntelPermissionResult {
  allowed: boolean;
  reason: string;
}

type IntelListener = (state: { intelObjects: IntelObject[]; comments: IntelComment[] }) => void;

let intelStore: IntelObject[] = [];
let intelComments: IntelComment[] = [];
const listeners = new Set<IntelListener>();

function createIntelId(nowMs = Date.now()): string {
  return `intel_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createCommentId(nowMs = Date.now()): string {
  return `intel_comment_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortIntel(records: IntelObject[]): IntelObject[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function notifyListeners() {
  const snapshot = {
    intelObjects: sortIntel(intelStore),
    comments: [...intelComments].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
  };
  for (const listener of listeners) listener(snapshot);
}

function roleFromActor(actorId: string): 'COMMAND' | 'LEAD' | 'MEMBER' {
  const normalized = String(actorId || '').toLowerCase();
  if (normalized.startsWith('ce-') || normalized.includes('command')) return 'COMMAND';
  if (normalized.includes('lead')) return 'LEAD';
  return 'MEMBER';
}

export function canPromoteIntel(
  actorId: string,
  from: IntelStratum,
  to: IntelStratum
): IntelPermissionResult {
  const role = roleFromActor(actorId);
  if (from === to) return { allowed: true, reason: 'No stratum change requested.' };
  if (to === 'COMMAND_ASSESSED' && role !== 'COMMAND') {
    return {
      allowed: false,
      reason: 'COMMAND role required for COMMAND_ASSESSED promotions.',
    };
  }
  if (to === 'OPERATIONAL' && role === 'MEMBER') {
    return {
      allowed: false,
      reason: 'LEAD or COMMAND role required for OPERATIONAL promotions.',
    };
  }
  return { allowed: true, reason: 'Promotion allowed by stub policy.' };
}

function normalizeScope(scope: IntelScope | undefined): IntelScope {
  if (!scope) return { kind: 'PERSONAL', opIds: [] };
  if (scope.kind === 'PERSONAL') {
    // Personal scope remains attributable to creator; op links may still exist later.
    return { kind: 'PERSONAL', opIds: [] };
  }
  if (scope.kind === 'OP') {
    return { kind: 'OP', opIds: [...new Set(scope.opIds || [])] };
  }
  return { kind: 'ORG', opIds: [] };
}

export function getIntelObjectTTLState(intel: IntelObject, nowMs = Date.now()): IntelTTLState {
  const ttlSeconds = getDefaultIntelTTLSeconds(intel.ttlProfileId, intel.type, 1200);
  const stale = isStaleAt(intel.updatedAt, ttlSeconds, nowMs) || Boolean(intel.retiredAt);
  const updatedAtMs = new Date(intel.updatedAt).getTime();
  const remainingSeconds = Math.max(0, Math.ceil((updatedAtMs + ttlSeconds * 1000 - nowMs) / 1000));
  const decayRatio = stale || !Number.isFinite(updatedAtMs)
    ? 0
    : Math.max(0, Math.min(1, remainingSeconds / ttlSeconds));
  return {
    ttlSeconds,
    remainingSeconds,
    decayRatio,
    stale,
  };
}

export function createIntelObject(input: IntelObjectCreateInput, nowMs = Date.now()): IntelObject {
  const now = new Date(nowMs).toISOString();
  const stratum: IntelStratum = input.stratum || 'PERSONAL';
  const ttlProfileId = input.ttlProfileId || getDefaultIntelTTLProfileIdForStratum(stratum);

  const record: IntelObject = {
    id: createIntelId(nowMs),
    type: input.type,
    stratum,
    scope: normalizeScope(input.scope),
    anchor: {
      nodeId: input.anchor.nodeId,
      dx: input.anchor.dx || 0,
      dy: input.anchor.dy || 0,
    },
    title: input.title.trim() || 'Untitled Intel',
    body: input.body.trim() || 'No context provided.',
    tags: [...new Set((input.tags || []).filter(Boolean))],
    confidence: input.confidence || 'MED',
    ttlProfileId,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    promotionHistory: [],
    endorsements: [],
    challenges: [],
  };

  intelStore = sortIntel([record, ...intelStore]);
  notifyListeners();
  return record;
}

function includeByScope(record: IntelObject, viewContext: IntelViewContext): boolean {
  const allowedScopes = viewContext.includeScopes || ['PERSONAL', 'ORG', 'OP'];
  if (!allowedScopes.includes(record.scope.kind)) return false;
  if (record.scope.kind === 'PERSONAL') {
    if (!viewContext.viewerId) return false;
    return record.createdBy === viewContext.viewerId;
  }
  if (record.scope.kind === 'OP' && viewContext.activeOpId) {
    return (record.scope.opIds || []).includes(viewContext.activeOpId);
  }
  return true;
}

export function listIntelObjects(
  viewContext: IntelViewContext = {},
  nowMs = Date.now(),
  filters: IntelListFilters = {}
): IntelRenderable[] {
  const includeRetired = Boolean(viewContext.includeRetired);
  const includeStale = viewContext.includeStale !== false;

  return sortIntel(intelStore)
    .filter((record) => includeByScope(record, viewContext))
    .filter((record) => (includeRetired ? true : !record.retiredAt))
    .filter((record) => (filters.nodeId ? record.anchor.nodeId === filters.nodeId : true))
    .filter((record) => (filters.type ? record.type === filters.type : true))
    .filter((record) => (filters.stratum ? record.stratum === filters.stratum : true))
    .filter((record) => (filters.tag ? (record.tags || []).includes(filters.tag) : true))
    .map((record) => ({ ...record, ttl: getIntelObjectTTLState(record, nowMs) }))
    .filter((record) => (includeStale ? true : !record.ttl.stale));
}

export async function addComment(
  intelId: string,
  comment: { by: string; body: string },
  nowMs = Date.now()
): Promise<IntelComment> {
  const intel = intelStore.find((entry) => entry.id === intelId);
  if (!intel) throw new Error(`Intel object ${intelId} not found`);
  const body = String(comment.body || '').trim();
  if (!body) throw new Error('Comment body is required');

  const record: IntelComment = {
    id: createCommentId(nowMs),
    intelId,
    by: comment.by,
    at: new Date(nowMs).toISOString(),
    body,
  };
  intelComments = [...intelComments, record];
  notifyListeners();
  return new Promise((resolve) => setTimeout(() => resolve(record), 90));
}

export function listIntelComments(intelId: string): IntelComment[] {
  return intelComments
    .filter((entry) => entry.intelId === intelId)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function patchIntel(intelId: string, mutate: (current: IntelObject) => IntelObject): IntelObject {
  const existing = intelStore.find((entry) => entry.id === intelId);
  if (!existing) throw new Error(`Intel object ${intelId} not found`);
  const next = mutate(existing);
  intelStore = sortIntel(intelStore.map((entry) => (entry.id === intelId ? next : entry)));
  notifyListeners();
  return next;
}

export function endorseIntelObject(intelId: string, by: string, note?: string, nowMs = Date.now()): IntelObject {
  return patchIntel(intelId, (intel) => {
    const nextEntry = { by, at: new Date(nowMs).toISOString(), note } as IntelObject['endorsements'][number];
    return {
      ...intel,
      endorsements: [...intel.endorsements, nextEntry],
      updatedAt: new Date(nowMs).toISOString(),
    };
  });
}

export function challengeIntelObject(intelId: string, challenge: IntelChallenge, nowMs = Date.now()): IntelObject {
  return patchIntel(intelId, (intel) => ({
    ...intel,
    challenges: [...intel.challenges, { ...challenge, at: challenge.at || new Date(nowMs).toISOString() }],
    updatedAt: new Date(nowMs).toISOString(),
  }));
}

function promotionEntry(
  from: IntelStratum,
  to: IntelStratum,
  by: string,
  nowMs: number,
  reason?: string
): IntelPromotionHistoryEntry {
  return {
    from,
    to,
    by,
    at: new Date(nowMs).toISOString(),
    reason,
  };
}

export function promoteIntelObject(
  intelId: string,
  to: IntelStratum,
  by: string,
  reason: string,
  nowMs = Date.now()
): IntelObject {
  return patchIntel(intelId, (intel) => {
    const permission = canPromoteIntel(by, intel.stratum, to);
    const deniedReason = permission.allowed ? undefined : `DENIED: ${permission.reason}`;
    const historyReason = deniedReason || reason || 'Promotion action';
    const history = [...intel.promotionHistory, promotionEntry(intel.stratum, to, by, nowMs, historyReason)];

    if (!permission.allowed) {
      return {
        ...intel,
        promotionHistory: history,
        updatedAt: new Date(nowMs).toISOString(),
      };
    }

    return {
      ...intel,
      stratum: to,
      ttlProfileId: getDefaultIntelTTLProfileIdForStratum(to),
      promotionHistory: history,
      updatedAt: new Date(nowMs).toISOString(),
    };
  });
}

export function demoteIntelObject(
  intelId: string,
  to: IntelStratum,
  by: string,
  reason: string,
  nowMs = Date.now()
): IntelObject {
  return patchIntel(intelId, (intel) => ({
    ...intel,
    stratum: to,
    ttlProfileId: getDefaultIntelTTLProfileIdForStratum(to),
    promotionHistory: [...intel.promotionHistory, promotionEntry(intel.stratum, to, by, nowMs, reason || 'Demotion action')],
    updatedAt: new Date(nowMs).toISOString(),
  }));
}

export function retireIntelObject(intelId: string, by: string, reason?: string, nowMs = Date.now()): IntelObject {
  return patchIntel(intelId, (intel) => ({
    ...intel,
    retiredAt: new Date(nowMs).toISOString(),
    promotionHistory: [...intel.promotionHistory, promotionEntry(intel.stratum, intel.stratum, by, nowMs, reason || 'Retired')],
    updatedAt: new Date(nowMs).toISOString(),
  }));
}

export function linkIntelToOps(intelId: string, opIds: string[], nowMs = Date.now()): IntelObject {
  return patchIntel(intelId, (intel) => ({
    ...intel,
    scope: {
      kind: 'OP',
      opIds: [...new Set([...(intel.scope.opIds || []), ...opIds.filter(Boolean)])],
    },
    updatedAt: new Date(nowMs).toISOString(),
  }));
}

export function subscribeIntelObjects(listener: IntelListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listAllIntelObjectsForDev(): IntelObject[] {
  return sortIntel(intelStore);
}

export function resetIntelServiceState() {
  intelStore = [];
  intelComments = [];
  notifyListeners();
}
