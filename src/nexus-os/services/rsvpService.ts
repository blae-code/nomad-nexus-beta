/**
 * RSVP Service (MVP in-memory adapter)
 *
 * Supports individual and asset RSVP entries with nested crew seat requests.
 */

import type {
  AssetSlot,
  CrewSeatAssignment,
  CrewSeatRequest,
  OperationPosture,
  RequirementRule,
  RSVPCompliance,
  RSVPEntry,
  RSVPPolicy,
  RSVPMode,
  RuleEnforcement,
} from '../schemas/opSchemas';

export interface RSVPEntryInput {
  opId: string;
  userId: string;
  mode: RSVPMode;
  rolePrimary: string;
  roleSecondary?: string[];
  notes?: string;
  status?: RSVPEntry['status'];
  exceptionReason?: string;
}

export interface AssetSlotInput {
  opId: string;
  rsvpEntryId: string;
  assetId: string;
  assetName: string;
  fitProfileId?: string;
  capabilitySnapshot: AssetSlot['capabilitySnapshot'];
  crewProvided: number;
}

export interface RosterSummary {
  opId: string;
  submittedCount: number;
  assetEntryCount: number;
  crewAssignmentsCount: number;
  openSeats: Array<{ assetSlotId: string; roleNeeded: string; openQty: number }>;
  hardViolations: number;
  softFlags: number;
  advisoryFlags: number;
}

type RsvpListener = (state: {
  policies: RSVPPolicy[];
  entries: RSVPEntry[];
  assetSlots: AssetSlot[];
  seatAssignments: CrewSeatAssignment[];
}) => void;

let policyStore: RSVPPolicy[] = [];
let entryStore: RSVPEntry[] = [];
let assetSlotStore: AssetSlot[] = [];
let seatAssignmentStore: CrewSeatAssignment[] = [];
const listeners = new Set<RsvpListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createId(prefix: string, nowMs = Date.now()): string {
  return `${prefix}_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function notifyListeners() {
  const snapshot = {
    policies: [...policyStore],
    entries: [...entryStore],
    assetSlots: [...assetSlotStore],
    seatAssignments: [...seatAssignmentStore],
  };
  for (const listener of listeners) listener(snapshot);
}

function commsReadyFromEntry(entry: RSVPEntryInput): boolean {
  const notes = String(entry.notes || '').toLowerCase();
  return notes.includes('comms-ok') || notes.includes('mic-ok') || notes.includes('#comms');
}

export function buildDefaultRsvpRulesForPosture(posture: OperationPosture): RequirementRule[] {
  if (posture === 'FOCUSED') {
    return [
      {
        id: 'rule-focused-comms',
        enforcement: 'HARD',
        kind: 'COMMS',
        predicate: { commsRequired: true },
        message: 'Focused ops require comms readiness (add "comms-ok" in notes).',
      },
      {
        id: 'rule-focused-role',
        enforcement: 'SOFT',
        kind: 'ROLE',
        predicate: { roleIn: ['Lead', 'Fireteam Lead', 'Medic', 'Pilot', 'Breacher'] },
        message: 'Role is outside preferred focused roster lanes.',
      },
      {
        id: 'rule-focused-asset',
        enforcement: 'ADVISORY',
        kind: 'ASSET',
        predicate: { shipTagsAny: ['combat', 'transport', 'medical'] },
        message: 'Consider attaching a tagged support asset for focused posture.',
      },
    ];
  }

  return [
    {
      id: 'rule-casual-comms',
      enforcement: 'SOFT',
      kind: 'COMMS',
      predicate: { commsRequired: true },
      message: 'Casual op prefers comms-ready participants.',
    },
    {
      id: 'rule-casual-role',
      enforcement: 'ADVISORY',
      kind: 'ROLE',
      predicate: { roleIn: ['Lead', 'Scout', 'Pilot', 'Medic'] },
      message: 'Role is outside suggested casual roster lanes.',
    },
  ];
}

export function getOrCreateRSVPPolicy(opId: string, posture: OperationPosture): RSVPPolicy {
  const existing = policyStore.find((entry) => entry.opId === opId);
  if (existing) return existing;

  const policy: RSVPPolicy = {
    id: createId('policy'),
    opId,
    rules: buildDefaultRsvpRulesForPosture(posture),
  };
  policyStore = [policy, ...policyStore];
  notifyListeners();
  return policy;
}

/**
 * Posture alignment hook.
 * Focused posture defaults to stricter enforcement than casual posture.
 */
export function alignRSVPPolicyToPosture(opId: string, posture: OperationPosture): RSVPPolicy {
  const rules = buildDefaultRsvpRulesForPosture(posture);
  const existing = policyStore.find((entry) => entry.opId === opId);
  if (!existing) {
    const created: RSVPPolicy = {
      id: createId('policy'),
      opId,
      rules,
    };
    policyStore = [created, ...policyStore];
    notifyListeners();
    return created;
  }
  const updated = { ...existing, rules };
  policyStore = policyStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function updateRSVPPolicy(opId: string, rules: RequirementRule[]): RSVPPolicy {
  const existing = policyStore.find((entry) => entry.opId === opId);
  if (!existing) {
    const created: RSVPPolicy = { id: createId('policy'), opId, rules };
    policyStore = [created, ...policyStore];
    notifyListeners();
    return created;
  }
  const updated = { ...existing, rules: [...rules] };
  policyStore = policyStore.map((entry) => (entry.opId === opId ? updated : entry));
  notifyListeners();
  return updated;
}

export function listRSVPPolicies(): RSVPPolicy[] {
  return [...policyStore];
}

function applyRule(rule: RequirementRule, entry: RSVPEntryInput, assetSlot?: AssetSlot): boolean {
  if (rule.kind === 'ROLE') {
    const roleIn = rule.predicate.roleIn || [];
    if (!roleIn.length) return true;
    return roleIn.map((value) => value.toLowerCase()).includes(entry.rolePrimary.toLowerCase());
  }
  if (rule.kind === 'COMMS') {
    if (!rule.predicate.commsRequired) return true;
    return commsReadyFromEntry(entry);
  }
  if (rule.kind === 'ASSET') {
    const requiredTags = rule.predicate.shipTagsAny || [];
    if (!requiredTags.length) return true;
    if (!assetSlot) return false;
    const tags = (assetSlot.capabilitySnapshot.tags || []).map((entry) => entry.toLowerCase());
    return requiredTags.some((tag) => tags.includes(tag.toLowerCase()));
  }
  if (rule.kind === 'CAPABILITY') {
    const requiredCapabilities = rule.predicate.capabilityAny || [];
    if (!requiredCapabilities.length) return true;
    if (!assetSlot) return false;
    const tags = (assetSlot.capabilitySnapshot.tags || []).map((entry) => entry.toLowerCase());
    return requiredCapabilities.some((entry) => tags.includes(entry.toLowerCase()));
  }
  return true;
}

function pushByEnforcement(
  compliance: RSVPCompliance,
  enforcement: RuleEnforcement,
  message: string
) {
  if (enforcement === 'HARD') compliance.hardViolations.push(message);
  else if (enforcement === 'SOFT') compliance.softFlags.push(message);
  else compliance.advisory.push(message);
}

export function validateRSVP(
  opId: string,
  entry: RSVPEntryInput,
  policy = policyStore.find((candidate) => candidate.opId === opId) || null,
  assetSlot?: AssetSlot
): RSVPCompliance {
  const compliance: RSVPCompliance = {
    hardViolations: [],
    softFlags: [],
    advisory: [],
    exceptionReason: entry.exceptionReason?.trim() || undefined,
  };
  if (!policy) return compliance;

  for (const rule of policy.rules) {
    const passed = applyRule(rule, entry, assetSlot);
    if (passed) continue;
    pushByEnforcement(compliance, rule.enforcement, rule.message);
  }

  return compliance;
}

export function upsertRSVPEntry(
  opId: string,
  input: RSVPEntryInput,
  nowMs = Date.now()
): RSVPEntry {
  const policy = policyStore.find((entry) => entry.opId === opId) || null;
  const existing = entryStore.find((entry) => entry.opId === opId && entry.userId === input.userId);
  const compliance = validateRSVP(opId, input, policy);
  if (compliance.hardViolations.length > 0) {
    throw new Error(`Hard requirement violations: ${compliance.hardViolations.join(' | ')}`);
  }
  if (compliance.softFlags.length > 0 && !compliance.exceptionReason) {
    throw new Error('Soft requirement mismatch requires exception reason');
  }

  const record: RSVPEntry = {
    id: existing?.id || createId('rsvp', nowMs),
    opId,
    userId: input.userId,
    mode: input.mode,
    rolePrimary: input.rolePrimary,
    roleSecondary: [...new Set(input.roleSecondary || [])],
    notes: input.notes,
    status: input.status || 'SUBMITTED',
    compliance,
    createdAt: existing?.createdAt || nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };

  entryStore = existing
    ? entryStore.map((entry) => (entry.id === existing.id ? record : entry))
    : [record, ...entryStore];
  notifyListeners();
  return record;
}

export function listRSVPEntries(opId: string): RSVPEntry[] {
  return entryStore.filter((entry) => entry.opId === opId);
}

export function addAssetSlot(input: AssetSlotInput, nowMs = Date.now()): AssetSlot {
  const entry = entryStore.find((candidate) => candidate.id === input.rsvpEntryId);
  if (!entry) throw new Error(`RSVP entry ${input.rsvpEntryId} not found`);
  if (entry.opId !== input.opId) throw new Error('RSVP entry does not belong to operation');
  if (entry.mode !== 'ASSET') throw new Error('Asset slots require ASSET RSVP mode');

  const slot: AssetSlot = {
    id: createId('asset', nowMs),
    opId: input.opId,
    rsvpEntryId: input.rsvpEntryId,
    assetId: input.assetId,
    assetName: input.assetName,
    fitProfileId: input.fitProfileId,
    capabilitySnapshot: {
      tags: [...new Set(input.capabilitySnapshot.tags || [])],
      shipClass: input.capabilitySnapshot.shipClass,
      crewSeats: input.capabilitySnapshot.crewSeats,
      cargoClass: input.capabilitySnapshot.cargoClass,
      medical: Boolean(input.capabilitySnapshot.medical),
      interdiction: Boolean(input.capabilitySnapshot.interdiction),
    },
    crewProvided: Math.max(0, Number(input.crewProvided || 0)),
    crewNeeded: [],
    createdAt: nowIso(nowMs),
    updatedAt: nowIso(nowMs),
  };

  assetSlotStore = [slot, ...assetSlotStore];
  notifyListeners();
  return slot;
}

export function updateAssetSlot(
  assetSlotId: string,
  patch: Partial<Omit<AssetSlot, 'id' | 'opId' | 'rsvpEntryId' | 'createdAt'>>,
  nowMs = Date.now()
): AssetSlot {
  const existing = assetSlotStore.find((entry) => entry.id === assetSlotId);
  if (!existing) throw new Error(`Asset slot ${assetSlotId} not found`);
  const next: AssetSlot = {
    ...existing,
    assetName: patch.assetName || existing.assetName,
    fitProfileId: patch.fitProfileId ?? existing.fitProfileId,
    capabilitySnapshot: patch.capabilitySnapshot || existing.capabilitySnapshot,
    crewProvided: typeof patch.crewProvided === 'number' ? patch.crewProvided : existing.crewProvided,
    crewNeeded: patch.crewNeeded || existing.crewNeeded,
    updatedAt: nowIso(nowMs),
  };
  assetSlotStore = assetSlotStore.map((entry) => (entry.id === assetSlotId ? next : entry));
  notifyListeners();
  return next;
}

export function createCrewSeatRequests(
  assetSlotId: string,
  requests: Array<Omit<CrewSeatRequest, 'id' | 'assetSlotId'>>,
  nowMs = Date.now()
): CrewSeatRequest[] {
  const slot = assetSlotStore.find((entry) => entry.id === assetSlotId);
  if (!slot) throw new Error(`Asset slot ${assetSlotId} not found`);
  const created = requests.map((request) => ({
    id: createId('seatreq', nowMs),
    assetSlotId,
    roleNeeded: request.roleNeeded,
    qty: Math.max(1, Number(request.qty || 1)),
    enforcementPreferences: request.enforcementPreferences,
    notes: request.notes,
  }));
  const next = {
    ...slot,
    crewNeeded: [...slot.crewNeeded, ...created],
    updatedAt: nowIso(nowMs),
  };
  assetSlotStore = assetSlotStore.map((entry) => (entry.id === assetSlotId ? next : entry));
  notifyListeners();
  return created;
}

function assignmentCountForRequest(requestId: string): number {
  return seatAssignmentStore.filter((entry) => {
    if (entry.status !== 'REQUESTED' && entry.status !== 'ACCEPTED') return false;
    const request = assetSlotStore
      .flatMap((slot) => slot.crewNeeded)
      .find((seatRequest) => seatRequest.id === requestId);
    if (!request) return false;
    return entry.assetSlotId === request.assetSlotId && entry.role === request.roleNeeded;
  }).length;
}

export function joinCrewSeat(
  assetSlotId: string,
  userId: string,
  role: string,
  nowMs = Date.now()
): CrewSeatAssignment {
  const slot = assetSlotStore.find((entry) => entry.id === assetSlotId);
  if (!slot) throw new Error(`Asset slot ${assetSlotId} not found`);
  const request = slot.crewNeeded.find((entry) => entry.roleNeeded.toLowerCase() === role.toLowerCase());
  if (!request) throw new Error(`Role ${role} is not requested for asset slot ${assetSlotId}`);
  const assignedCount = assignmentCountForRequest(request.id);
  if (assignedCount >= request.qty) throw new Error('Requested crew seat is already full');

  const assignment: CrewSeatAssignment = {
    id: createId('seatassign', nowMs),
    opId: slot.opId,
    assetSlotId,
    userId,
    role: request.roleNeeded,
    status: 'REQUESTED',
    createdAt: nowIso(nowMs),
  };
  seatAssignmentStore = [assignment, ...seatAssignmentStore];
  notifyListeners();
  return assignment;
}

export function listAssetSlots(opId: string): AssetSlot[] {
  return assetSlotStore.filter((entry) => entry.opId === opId);
}

export function listCrewSeatAssignments(opId: string): CrewSeatAssignment[] {
  return seatAssignmentStore.filter((entry) => entry.opId === opId);
}

export function computeRosterSummary(opId: string): RosterSummary {
  const entries = listRSVPEntries(opId).filter((entry) => entry.status === 'SUBMITTED');
  const slots = listAssetSlots(opId);
  const assignments = listCrewSeatAssignments(opId).filter(
    (entry) => entry.status === 'REQUESTED' || entry.status === 'ACCEPTED'
  );
  const openSeats: RosterSummary['openSeats'] = [];

  for (const slot of slots) {
    for (const request of slot.crewNeeded) {
      const acceptedCount = assignments.filter((entry) => entry.assetSlotId === slot.id && entry.role === request.roleNeeded).length;
      const openQty = Math.max(0, request.qty - acceptedCount);
      if (openQty > 0) {
        openSeats.push({
          assetSlotId: slot.id,
          roleNeeded: request.roleNeeded,
          openQty,
        });
      }
    }
  }

  return {
    opId,
    submittedCount: entries.length,
    assetEntryCount: entries.filter((entry) => entry.mode === 'ASSET').length,
    crewAssignmentsCount: assignments.length,
    openSeats,
    hardViolations: entries.reduce((acc, entry) => acc + entry.compliance.hardViolations.length, 0),
    softFlags: entries.reduce((acc, entry) => acc + entry.compliance.softFlags.length, 0),
    advisoryFlags: entries.reduce((acc, entry) => acc + entry.compliance.advisory.length, 0),
  };
}

export function listOpenCrewSeats(opId: string): Array<{ assetSlot: AssetSlot; request: CrewSeatRequest; openQty: number }> {
  const slots = listAssetSlots(opId);
  const assignments = listCrewSeatAssignments(opId).filter(
    (entry) => entry.status === 'REQUESTED' || entry.status === 'ACCEPTED'
  );
  const open: Array<{ assetSlot: AssetSlot; request: CrewSeatRequest; openQty: number }> = [];

  for (const slot of slots) {
    for (const request of slot.crewNeeded) {
      const acceptedCount = assignments.filter((entry) => entry.assetSlotId === slot.id && entry.role === request.roleNeeded).length;
      const openQty = Math.max(0, request.qty - acceptedCount);
      if (openQty > 0) open.push({ assetSlot: slot, request, openQty });
    }
  }
  return open;
}

export function subscribeRsvp(listener: RsvpListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetRsvpServiceState() {
  policyStore = [];
  entryStore = [];
  assetSlotStore = [];
  seatAssignmentStore = [];
  notifyListeners();
}
