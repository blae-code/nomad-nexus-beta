/**
 * Intent Draft Service (MVP in-memory adapter)
 *
 * Drafts are map-issued candidate actions. Confirmation commits them as:
 * - Intel objects (PIN/MARKER/NOTE) where applicable
 * - Event stubs for later Package 3 routing into command/ops timelines
 */

import {
  challengeIntelObject,
  endorseIntelObject,
  linkIntelToOps,
  promoteIntelObject,
  retireIntelObject,
  createIntelObject,
} from './intelService';
import { appendOperationEvent } from './operationService';
import type {
  IntelConfidenceBand,
  IntelObject,
  IntentDraft,
  IntentDraftKind,
  IntentDraftStatus,
  IntentDraftTarget,
  IntelType,
} from '../schemas/intelSchemas';

export interface IntentDraftCreateInput {
  kind: IntentDraftKind;
  target: IntentDraftTarget;
  payload?: Record<string, unknown>;
  createdBy: string;
}

export interface ConfirmedDraftEventStub {
  id: string;
  draftId: string;
  opId?: string;
  scopeKind?: 'OP' | 'ORG' | 'PERSONAL';
  kind: IntentDraftKind;
  target: IntentDraftTarget;
  payload: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export interface ConfirmDraftResult {
  draft: IntentDraft;
  createdIntelObject?: IntelObject;
  createdEventStub?: ConfirmedDraftEventStub;
}

export interface IntentDraftFilters {
  createdBy?: string;
  status?: IntentDraftStatus;
}

type DraftListener = (state: { drafts: IntentDraft[]; confirmedEventStubs: ConfirmedDraftEventStub[] }) => void;

let draftStore: IntentDraft[] = [];
let confirmedEventStubs: ConfirmedDraftEventStub[] = [];
const listeners = new Set<DraftListener>();

function createDraftId(nowMs = Date.now()): string {
  return `intent_draft_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEventStubId(nowMs = Date.now()): string {
  return `intent_evt_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortDrafts(records: IntentDraft[]): IntentDraft[] {
  return [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function notifyListeners() {
  const snapshot = {
    drafts: sortDrafts(draftStore),
    confirmedEventStubs: [...confirmedEventStubs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  };
  for (const listener of listeners) listener(snapshot);
}

export function createDraft(input: IntentDraftCreateInput, nowMs = Date.now()): IntentDraft {
  const draft: IntentDraft = {
    id: createDraftId(nowMs),
    kind: input.kind,
    target: { ...input.target },
    payload: { ...(input.payload || {}) },
    createdBy: input.createdBy,
    createdAt: new Date(nowMs).toISOString(),
    status: 'DRAFT',
  };
  draftStore = sortDrafts([draft, ...draftStore]);
  notifyListeners();
  return draft;
}

export function updateDraft(
  id: string,
  patch: Partial<Pick<IntentDraft, 'payload' | 'target' | 'status'>>
): IntentDraft {
  const existing = draftStore.find((entry) => entry.id === id);
  if (!existing) throw new Error(`Draft ${id} not found`);
  if (existing.status !== 'DRAFT') throw new Error(`Draft ${id} is not editable`);

  const next: IntentDraft = {
    ...existing,
    payload: patch.payload ? { ...existing.payload, ...patch.payload } : existing.payload,
    target: patch.target ? { ...existing.target, ...patch.target } : existing.target,
    status: patch.status || existing.status,
  };
  draftStore = sortDrafts(draftStore.map((entry) => (entry.id === id ? next : entry)));
  notifyListeners();
  return next;
}

function confirmAsIntel(draft: IntentDraft, nowMs: number): IntelObject | undefined {
  const confidence = (String(draft.payload?.confidence || 'MED').toUpperCase() as IntelConfidenceBand);
  const confidenceBand: IntelConfidenceBand =
    confidence === 'HIGH' || confidence === 'LOW' ? confidence : 'MED';
  const opId = String(draft.payload?.opId || '').trim();
  const linkedOpIds = Array.isArray(draft.payload?.opIds)
    ? (draft.payload?.opIds as string[])
    : String(draft.payload?.opIds || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
  const mergedOpIds = [...new Set([opId, ...linkedOpIds].filter(Boolean))];

  if (draft.kind === 'DROP_INTEL' || draft.kind === 'PLACE_MARKER' || draft.kind === 'ATTACH_INTEL') {
    const typeFromPayload = String(draft.payload?.intelType || '').toUpperCase() as IntelType;
    const intelType: IntelType =
      draft.kind === 'PLACE_MARKER'
        ? 'MARKER'
        : draft.kind === 'ATTACH_INTEL'
        ? 'NOTE'
        : typeFromPayload === 'NOTE' || typeFromPayload === 'MARKER'
        ? typeFromPayload
        : 'PIN';

    return createIntelObject(
      {
        type: intelType,
        stratum: 'PERSONAL',
        scope: mergedOpIds.length > 0 ? { kind: 'OP', opIds: mergedOpIds } : { kind: 'PERSONAL' },
        anchor: {
          nodeId: draft.target.nodeId || 'system-stanton',
          dx: Number(draft.payload?.dx || 0),
          dy: Number(draft.payload?.dy || 0),
        },
        title: String(draft.payload?.title || draft.kind.replaceAll('_', ' ')),
        body: String(draft.payload?.body || draft.payload?.notes || 'Map-issued intel draft confirmation.'),
        tags: Array.isArray(draft.payload?.tags) ? (draft.payload?.tags as string[]) : [],
        confidence: confidenceBand,
        createdBy: draft.createdBy,
      },
      nowMs
    );
  }

  if (draft.kind === 'ENDORSE_INTEL' && draft.target.intelId) {
    return endorseIntelObject(
      draft.target.intelId,
      draft.createdBy,
      String(draft.payload?.note || draft.payload?.notes || '').trim() || undefined,
      nowMs
    );
  }

  if (draft.kind === 'CHALLENGE_INTEL' && draft.target.intelId) {
    return challengeIntelObject(
      draft.target.intelId,
      {
        by: draft.createdBy,
        at: new Date(nowMs).toISOString(),
        note: String(draft.payload?.note || draft.payload?.notes || 'Challenge raised from map draft.'),
      },
      nowMs
    );
  }

  if (draft.kind === 'PROMOTE_INTEL' && draft.target.intelId) {
    const to = String(draft.payload?.toStratum || 'SHARED_COMMONS') as IntelObject['stratum'];
    const reason = String(draft.payload?.reason || draft.payload?.notes || '').trim();
    if (!reason) {
      throw new Error('Promotion reason is required');
    }
    return promoteIntelObject(draft.target.intelId, to, draft.createdBy, reason, nowMs);
  }

  if (draft.kind === 'LINK_INTEL_TO_OP' && draft.target.intelId) {
    const opIds = String(draft.payload?.opIds || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return linkIntelToOps(draft.target.intelId, opIds, nowMs);
  }

  if (draft.kind === 'RETIRE_INTEL' && draft.target.intelId) {
    const reason = String(draft.payload?.reason || draft.payload?.notes || 'Retired from map draft');
    return retireIntelObject(draft.target.intelId, draft.createdBy, reason, nowMs);
  }

  return undefined;
}

function confirmAsEventStub(draft: IntentDraft, nowMs: number): ConfirmedDraftEventStub {
  const explicitOpId = String(draft.payload?.opId || '').trim();
  const fromOpIds = String(draft.payload?.opIds || '')
    .split(',')
    .map((entry) => entry.trim())
    .find(Boolean);
  const opId = explicitOpId || fromOpIds || undefined;
  const payloadScope = String(draft.payload?.scopeKind || '').toUpperCase();
  const scopeKind: ConfirmedDraftEventStub['scopeKind'] =
    opId ? 'OP' : payloadScope === 'ORG' ? 'ORG' : 'PERSONAL';
  return {
    id: createEventStubId(nowMs),
    draftId: draft.id,
    opId,
    scopeKind,
    kind: draft.kind,
    target: { ...draft.target },
    payload: { ...draft.payload },
    createdBy: draft.createdBy,
    createdAt: new Date(nowMs).toISOString(),
  };
}

export function confirmDraft(id: string, nowMs = Date.now()): ConfirmDraftResult {
  const existing = draftStore.find((entry) => entry.id === id);
  if (!existing) throw new Error(`Draft ${id} not found`);
  if (existing.status !== 'DRAFT') throw new Error(`Draft ${id} cannot be confirmed`);

  const createdIntelObject = confirmAsIntel(existing, nowMs);
  const shouldCreateEventStub = !createdIntelObject || [
    'DECLARE_DEPARTURE',
    'DECLARE_ARRIVAL',
    'DECLARE_HOLD',
    'REPORT_CONTACT',
    'REQUEST_SITREP',
    'REQUEST_PATROL',
    'MARK_AVOID',
  ].includes(existing.kind);
  const createdEventStub = shouldCreateEventStub ? confirmAsEventStub(existing, nowMs) : undefined;

  if (createdEventStub) {
    confirmedEventStubs = [createdEventStub, ...confirmedEventStubs];
    appendOperationEvent(
      {
        opId: createdEventStub.opId,
        scopeKind: createdEventStub.scopeKind,
        kind: createdEventStub.kind,
        sourceDraftId: createdEventStub.draftId,
        nodeId: createdEventStub.target.nodeId,
        intelId: createdEventStub.target.intelId,
        zoneId: createdEventStub.target.zoneId,
        payload: createdEventStub.payload,
        createdBy: createdEventStub.createdBy,
        createdAt: createdEventStub.createdAt,
      },
      nowMs
    );
  }

  const confirmedDraft = { ...existing, status: 'CONFIRMED' as const };
  draftStore = sortDrafts(draftStore.map((entry) => (entry.id === id ? confirmedDraft : entry)));
  notifyListeners();
  return {
    draft: confirmedDraft,
    createdIntelObject,
    createdEventStub,
  };
}

export function cancelDraft(id: string): IntentDraft {
  const existing = draftStore.find((entry) => entry.id === id);
  if (!existing) throw new Error(`Draft ${id} not found`);
  const cancelled = { ...existing, status: 'CANCELLED' as const };
  draftStore = sortDrafts(draftStore.map((entry) => (entry.id === id ? cancelled : entry)));
  notifyListeners();
  return cancelled;
}

export function listDrafts(filters: IntentDraftFilters = {}): IntentDraft[] {
  return sortDrafts(draftStore).filter((entry) => {
    if (filters.createdBy && entry.createdBy !== filters.createdBy) return false;
    if (filters.status && entry.status !== filters.status) return false;
    return true;
  });
}

export function listConfirmedDraftEventStubs(): ConfirmedDraftEventStub[] {
  return [...confirmedEventStubs];
}

export function subscribeIntentDrafts(listener: DraftListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetIntentDraftServiceState() {
  draftStore = [];
  confirmedEventStubs = [];
  notifyListeners();
}
