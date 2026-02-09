/**
 * Operation Service (MVP in-memory adapter)
 *
 * Supports multiple concurrent operations with user-specific focus selection.
 * Permission and policy checks are stubs designed for later auth integration.
 */

import type {
  Operation,
  OperationEventStub,
  OperationPosture,
  OperationStatus,
  OperationFocusRules,
  OperationDomains,
} from '../schemas/opSchemas';
import type { CommsTemplateId } from '../registries/commsTemplateRegistry';
import type { DataClassification } from '../schemas/crossOrgSchemas';

export interface OperationCreateInput {
  name: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture?: OperationPosture;
  status?: OperationStatus;
  domains?: Partial<OperationDomains>;
  ao?: Operation['ao'];
  commsTemplateId?: CommsTemplateId;
  ttlProfileId?: string;
  permissions?: Operation['permissions'];
  createdBy: string;
}

export interface OperationViewContext {
  userId?: string;
  orgId?: string;
  includeArchived?: boolean;
}

export interface OperationUpdateInput {
  name?: string;
  ao?: Operation['ao'];
  linkedIntelIds?: string[];
  invitedOrgIds?: string[];
  classification?: DataClassification;
}

export interface OperationPermissionResult {
  allowed: boolean;
  reason: string;
}

type OperationListener = (state: {
  operations: Operation[];
  focusByUser: Record<string, string>;
  events: OperationEventStub[];
}) => void;

let operationsStore: Operation[] = [];
let operationEventsStore: OperationEventStub[] = [];
const focusByUser: Record<string, string> = {};
const listeners = new Set<OperationListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createOperationId(nowMs = Date.now()): string {
  return `op_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createOperationEventId(nowMs = Date.now()): string {
  return `op_evt_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortOperations(records: Operation[]): Operation[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function sortOperationEvents(records: OperationEventStub[]): OperationEventStub[] {
  return [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function defaultCommsTemplateByPosture(posture: OperationPosture): CommsTemplateId {
  return posture === 'FOCUSED' ? 'COMMAND_NET' : 'SQUAD_NETS';
}

function defaultTTlProfileByPosture(posture: OperationPosture): string {
  return posture === 'FOCUSED' ? 'TTL-OP-FOCUSED' : 'TTL-OP-CASUAL';
}

function defaultFocusRulesByPosture(posture: OperationPosture): OperationFocusRules {
  if (posture === 'FOCUSED') {
    return {
      notificationPriority: 'HIGH',
      commsForegroundMode: 'PRIMARY_AND_MONITOR',
      backgroundAggregate: true,
    };
  }
  return {
    notificationPriority: 'MED',
    commsForegroundMode: 'PRIMARY_ONLY',
    backgroundAggregate: true,
  };
}

function hasManageRights(op: Operation, actorId: string | undefined): boolean {
  if (!actorId) return false;
  if (op.createdBy === actorId) return true;
  if (op.permissions.ownerIds?.includes(actorId)) return true;
  if (op.permissions.commanderIds?.includes(actorId)) return true;
  return false;
}

function hasOperationAccess(op: Operation, actorId: string | undefined): boolean {
  if (!actorId) return false;
  if (hasManageRights(op, actorId)) return true;
  if (op.permissions.participantIds?.includes(actorId)) return true;
  return false;
}

function requireActorId(actorId: string | undefined, actionLabel: string): string {
  const trimmed = String(actorId || '').trim();
  if (!trimmed) {
    throw new Error(`${actionLabel} requires actorId`);
  }
  return trimmed;
}

function notifyListeners() {
  const snapshot = {
    operations: sortOperations(operationsStore),
    focusByUser: { ...focusByUser },
    events: sortOperationEvents(operationEventsStore),
  };
  for (const listener of listeners) listener(snapshot);
}

export function canManageOperation(opId: string, actorId: string): OperationPermissionResult {
  const op = operationsStore.find((entry) => entry.id === opId);
  if (!op) return { allowed: false, reason: 'Operation not found' };
  const allowed = hasManageRights(op, actorId);
  return {
    allowed,
    reason: allowed ? 'Authorized by stub op permissions.' : 'Only owners/commanders may manage this operation.',
  };
}

export function createOperation(input: OperationCreateInput, nowMs = Date.now()): Operation {
  const posture = input.posture || 'CASUAL';
  const status = input.status || 'PLANNING';
  const createdAt = nowIso(nowMs);

  const operation: Operation = {
    id: createOperationId(nowMs),
    name: input.name.trim() || 'Untitled Operation',
    hostOrgId: input.hostOrgId || 'ORG-LOCAL',
    invitedOrgIds: [...new Set(input.invitedOrgIds || [])],
    classification: input.classification || 'INTERNAL',
    posture,
    status,
    domains: {
      fps: input.domains?.fps ?? true,
      ground: input.domains?.ground ?? true,
      airSpace: input.domains?.airSpace ?? false,
      logistics: input.domains?.logistics ?? true,
    },
    createdBy: input.createdBy,
    createdAt,
    updatedAt: createdAt,
    focusRules: defaultFocusRulesByPosture(posture),
    linkedIntelIds: [],
    ao: input.ao || { nodeId: 'system-stanton' },
    commsTemplateId: input.commsTemplateId || defaultCommsTemplateByPosture(posture),
    ttlProfileId: input.ttlProfileId || defaultTTlProfileByPosture(posture),
    permissions: {
      ownerIds: [...new Set([input.createdBy, ...(input.permissions?.ownerIds || [])])],
      commanderIds: [...new Set(input.permissions?.commanderIds || [])],
      participantIds: [...new Set([input.createdBy, ...(input.permissions?.participantIds || [])])],
      guestOrgIds: [...new Set(input.permissions?.guestOrgIds || [])],
    },
  };

  operationsStore = sortOperations([operation, ...operationsStore]);
  if (!focusByUser[input.createdBy]) focusByUser[input.createdBy] = operation.id;
  notifyListeners();
  return operation;
}

export function listOperationsForUser(viewContext: OperationViewContext = {}): Operation[] {
  const includeArchived = Boolean(viewContext.includeArchived);
  const scopedByOrg = (op: Operation) => {
    if (!viewContext.orgId) return true;
    if (op.hostOrgId === viewContext.orgId) return true;
    if ((op.invitedOrgIds || []).includes(viewContext.orgId)) return true;
    if ((op.permissions.guestOrgIds || []).includes(viewContext.orgId)) return true;
    return false;
  };
  if (!viewContext.userId) {
    return sortOperations(operationsStore).filter(
      (op) => (includeArchived ? true : op.status !== 'ARCHIVED') && scopedByOrg(op)
    );
  }

  return sortOperations(operationsStore).filter((op) => {
    if (!includeArchived && op.status === 'ARCHIVED') return false;
    if (!scopedByOrg(op)) return false;
    return hasOperationAccess(op, viewContext.userId);
  });
}

export function listOperationsForOrg(orgId: string, includeArchived = false): Operation[] {
  const targetOrg = String(orgId || '').trim();
  if (!targetOrg) return [];
  return sortOperations(operationsStore).filter((op) => {
    if (!includeArchived && op.status === 'ARCHIVED') return false;
    if (op.hostOrgId === targetOrg) return true;
    if ((op.invitedOrgIds || []).includes(targetOrg)) return true;
    if ((op.permissions.guestOrgIds || []).includes(targetOrg)) return true;
    return false;
  });
}

export function getOperationById(opId: string): Operation | null {
  return operationsStore.find((entry) => entry.id === opId) || null;
}

export function joinOperation(opId: string, userId: string, nowMs = Date.now()): Operation {
  const actorId = requireActorId(userId, 'joinOperation');
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  const next: Operation = {
    ...existing,
    permissions: {
      ...existing.permissions,
      participantIds: [...new Set([...(existing.permissions.participantIds || []), actorId])],
    },
    updatedAt: nowIso(nowMs),
  };
  operationsStore = sortOperations(operationsStore.map((entry) => (entry.id === opId ? next : entry)));
  if (!focusByUser[actorId]) focusByUser[actorId] = next.id;
  notifyListeners();
  return next;
}

export function setFocusOperation(userId: string, opId: string | null): string | null {
  const actorId = requireActorId(userId, 'setFocusOperation');
  if (!opId) {
    delete focusByUser[actorId];
    notifyListeners();
    return null;
  }
  const op = getOperationById(opId);
  if (!op) throw new Error(`Operation ${opId} not found`);
  if (!hasOperationAccess(op, actorId)) {
    throw new Error('Cannot focus operation without membership');
  }
  focusByUser[actorId] = opId;
  notifyListeners();
  return opId;
}

export function getFocusOperationId(userId: string): string | null {
  return focusByUser[userId] || null;
}

function patchOperation(opId: string, mutate: (operation: Operation) => Operation): Operation {
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  const updated = mutate(existing);
  operationsStore = sortOperations(operationsStore.map((entry) => (entry.id === opId ? updated : entry)));
  notifyListeners();
  return updated;
}

export function updateOperation(opId: string, input: OperationUpdateInput, actorId?: string, nowMs = Date.now()): Operation {
  const operatorId = requireActorId(actorId, 'updateOperation');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  return patchOperation(opId, (operation) => ({
    ...operation,
    name: input.name?.trim() || operation.name,
    ao: input.ao || operation.ao,
    linkedIntelIds: input.linkedIntelIds ? [...new Set(input.linkedIntelIds)] : operation.linkedIntelIds,
    invitedOrgIds: input.invitedOrgIds ? [...new Set(input.invitedOrgIds)] : operation.invitedOrgIds,
    classification: input.classification || operation.classification,
    updatedAt: nowIso(nowMs),
  }));
}

export function updateStatus(opId: string, status: OperationStatus, actorId?: string, nowMs = Date.now()): Operation {
  const operatorId = requireActorId(actorId, 'updateStatus');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  return patchOperation(opId, (operation) => ({
    ...operation,
    status,
    updatedAt: nowIso(nowMs),
  }));
}

export function setPosture(opId: string, posture: OperationPosture, actorId?: string, nowMs = Date.now()): Operation {
  const operatorId = requireActorId(actorId, 'setPosture');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  return patchOperation(opId, (operation) => ({
    ...operation,
    posture,
    focusRules: defaultFocusRulesByPosture(posture),
    commsTemplateId: defaultCommsTemplateByPosture(posture),
    ttlProfileId: defaultTTlProfileByPosture(posture),
    updatedAt: nowIso(nowMs),
  }));
}

export function applyCommsTemplate(
  opId: string,
  templateId: CommsTemplateId,
  actorId?: string,
  nowMs = Date.now()
): Operation {
  const operatorId = requireActorId(actorId, 'applyCommsTemplate');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  return patchOperation(opId, (operation) => ({
    ...operation,
    commsTemplateId: templateId,
    updatedAt: nowIso(nowMs),
  }));
}

export function appendOperationEvent(
  input: Omit<OperationEventStub, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  nowMs = Date.now()
): OperationEventStub {
  const scopeKind = input.scopeKind || (input.opId ? 'OP' : 'PERSONAL');
  const record: OperationEventStub = {
    id: input.id || createOperationEventId(nowMs),
    opId: input.opId,
    scopeKind,
    kind: input.kind,
    isSimulation: Boolean(input.isSimulation),
    simulationSessionId: input.simulationSessionId,
    simulationScenarioId: input.simulationScenarioId,
    sourceDraftId: input.sourceDraftId,
    nodeId: input.nodeId,
    intelId: input.intelId,
    zoneId: input.zoneId,
    payload: input.payload || {},
    createdBy: input.createdBy,
    createdAt: input.createdAt || nowIso(nowMs),
  };
  operationEventsStore = sortOperationEvents([record, ...operationEventsStore]);
  notifyListeners();
  return record;
}

export function listOperationEvents(opId?: string): OperationEventStub[] {
  const events = sortOperationEvents(operationEventsStore);
  if (!opId) return events;
  return events.filter((entry) => entry.opId === opId);
}

export function listLiveOperationEvents(opId?: string): OperationEventStub[] {
  return listOperationEvents(opId).filter((entry) => !entry.isSimulation);
}

export function listSimulationOperationEvents(opId?: string, sessionId?: string): OperationEventStub[] {
  return listOperationEvents(opId).filter((entry) => {
    if (!entry.isSimulation) return false;
    if (sessionId && entry.simulationSessionId !== sessionId) return false;
    return true;
  });
}

export function subscribeOperations(listener: OperationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOperationServiceState() {
  operationsStore = [];
  operationEventsStore = [];
  for (const key of Object.keys(focusByUser)) delete focusByUser[key];
  notifyListeners();
}
