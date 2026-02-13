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

export interface OperationTemplateBlueprint {
  name: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture: OperationPosture;
  status: OperationStatus;
  domains: OperationDomains;
  ao: Operation['ao'];
  commsTemplateId: CommsTemplateId;
  ttlProfileId: string;
  permissions?: Operation['permissions'];
}

export interface OperationTemplate {
  id: string;
  name: string;
  description?: string;
  sourceOpId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  blueprint: OperationTemplateBlueprint;
}

export interface OperationTemplateCreateInput {
  createdBy: string;
  name: string;
  description?: string;
  blueprint: Partial<OperationTemplateBlueprint>;
}

export interface OperationTemplateInstantiateInput {
  createdBy: string;
  name?: string;
  hostOrgId?: string;
  invitedOrgIds?: string[];
  classification?: DataClassification;
  posture?: OperationPosture;
  status?: OperationStatus;
  ao?: Operation['ao'];
}

export interface OperationCloneInput {
  createdBy: string;
  name?: string;
}

export interface OperationAuditEvent {
  id: string;
  opId: string;
  action: string;
  actorId: string;
  summary: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

type OperationListener = (state: {
  operations: Operation[];
  focusByUser: Record<string, string>;
  events: OperationEventStub[];
}) => void;

interface OperationServiceSnapshot {
  operationsStore: Operation[];
  operationEventsStore: OperationEventStub[];
  operationTemplatesStore: OperationTemplate[];
  operationAuditStore: OperationAuditEvent[];
  focusByUser: Record<string, string>;
}

const OP_SERVICE_STORAGE_KEY = 'nexus.os.operationService.v1';

let operationsStore: Operation[] = [];
let operationEventsStore: OperationEventStub[] = [];
let operationTemplatesStore: OperationTemplate[] = [];
let operationAuditStore: OperationAuditEvent[] = [];
const focusByUser: Record<string, string> = {};
const listeners = new Set<OperationListener>();
let hasHydratedFromStorage = false;

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createOperationId(nowMs = Date.now()): string {
  return `op_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createOperationEventId(nowMs = Date.now()): string {
  return `op_evt_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTemplateId(nowMs = Date.now()): string {
  return `op_tpl_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createAuditId(nowMs = Date.now()): string {
  return `op_audit_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortOperations(records: Operation[]): Operation[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function sortOperationEvents(records: OperationEventStub[]): OperationEventStub[] {
  return [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function sortOperationTemplates(records: OperationTemplate[]): OperationTemplate[] {
  return [...records].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function sortOperationAudit(records: OperationAuditEvent[]): OperationAuditEvent[] {
  return [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function hasBrowserStorage(): boolean {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function persistSnapshot() {
  if (!hasBrowserStorage()) return;
  try {
    const snapshot: OperationServiceSnapshot = {
      operationsStore,
      operationEventsStore,
      operationTemplatesStore,
      operationAuditStore,
      focusByUser: { ...focusByUser },
    };
    window.localStorage.setItem(OP_SERVICE_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort only.
  }
}

function hydrateSnapshot() {
  if (hasHydratedFromStorage) return;
  hasHydratedFromStorage = true;
  if (!hasBrowserStorage()) return;
  try {
    const raw = window.localStorage.getItem(OP_SERVICE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<OperationServiceSnapshot>;
    if (Array.isArray(parsed.operationsStore)) operationsStore = sortOperations(parsed.operationsStore);
    if (Array.isArray(parsed.operationEventsStore)) operationEventsStore = sortOperationEvents(parsed.operationEventsStore);
    if (Array.isArray(parsed.operationTemplatesStore)) operationTemplatesStore = sortOperationTemplates(parsed.operationTemplatesStore);
    if (Array.isArray(parsed.operationAuditStore)) operationAuditStore = sortOperationAudit(parsed.operationAuditStore);
    if (parsed.focusByUser && typeof parsed.focusByUser === 'object') {
      for (const key of Object.keys(focusByUser)) delete focusByUser[key];
      Object.assign(focusByUser, parsed.focusByUser);
    }
  } catch {
    // Ignore invalid snapshots.
  }
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

function appendAuditEvent(
  opId: string,
  action: string,
  actorId: string,
  summary: string,
  details?: Record<string, unknown>,
  nowMs = Date.now()
) {
  const record: OperationAuditEvent = {
    id: createAuditId(nowMs),
    opId,
    action,
    actorId,
    summary,
    details,
    createdAt: nowIso(nowMs),
  };
  operationAuditStore = sortOperationAudit([record, ...operationAuditStore]);
}

function buildOperationRecord(input: OperationCreateInput, nowMs = Date.now()): Operation {
  const posture = input.posture || 'CASUAL';
  const status = input.status || 'PLANNING';
  const createdAt = nowIso(nowMs);

  return {
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
}

function notifyListeners() {
  hydrateSnapshot();
  const snapshot = {
    operations: sortOperations(operationsStore),
    focusByUser: { ...focusByUser },
    events: sortOperationEvents(operationEventsStore),
  };
  persistSnapshot();
  for (const listener of listeners) listener(snapshot);
}

export function canManageOperation(opId: string, actorId: string): OperationPermissionResult {
  hydrateSnapshot();
  const op = operationsStore.find((entry) => entry.id === opId);
  if (!op) return { allowed: false, reason: 'Operation not found' };
  const allowed = hasManageRights(op, actorId);
  return {
    allowed,
    reason: allowed ? 'Authorized by stub op permissions.' : 'Only owners/commanders may manage this operation.',
  };
}

export function createOperation(input: OperationCreateInput, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operation = buildOperationRecord(input, nowMs);

  operationsStore = sortOperations([operation, ...operationsStore]);
  if (!focusByUser[input.createdBy]) focusByUser[input.createdBy] = operation.id;
  appendAuditEvent(
    operation.id,
    'OP_CREATED',
    input.createdBy,
    `Operation ${operation.name} created.`,
    {
      posture: operation.posture,
      status: operation.status,
      classification: operation.classification,
      aoNodeId: operation.ao?.nodeId,
    },
    nowMs
  );
  notifyListeners();
  return operation;
}

export function listOperationsForUser(viewContext: OperationViewContext = {}): Operation[] {
  hydrateSnapshot();
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
  hydrateSnapshot();
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
  hydrateSnapshot();
  return operationsStore.find((entry) => entry.id === opId) || null;
}

export function joinOperation(opId: string, userId: string, nowMs = Date.now()): Operation {
  hydrateSnapshot();
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
  appendAuditEvent(opId, 'OP_MEMBER_JOINED', actorId, `${actorId} joined operation.`, undefined, nowMs);
  notifyListeners();
  return next;
}

export function setFocusOperation(userId: string, opId: string | null): string | null {
  hydrateSnapshot();
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
  appendAuditEvent(opId, 'OP_FOCUS_SET', actorId, `${actorId} set operation focus.`, undefined);
  notifyListeners();
  return opId;
}

export function getFocusOperationId(userId: string): string | null {
  hydrateSnapshot();
  return focusByUser[userId] || null;
}

function patchOperation(
  opId: string,
  mutate: (operation: Operation) => Operation,
  options: { notify?: boolean } = {}
): Operation {
  hydrateSnapshot();
  const existing = getOperationById(opId);
  if (!existing) throw new Error(`Operation ${opId} not found`);
  const updated = mutate(existing);
  operationsStore = sortOperations(operationsStore.map((entry) => (entry.id === opId ? updated : entry)));
  if (options.notify !== false) notifyListeners();
  return updated;
}

export function updateOperation(opId: string, input: OperationUpdateInput, actorId?: string, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'updateOperation');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  const updated = patchOperation(opId, (operation) => ({
    ...operation,
    name: input.name?.trim() || operation.name,
    ao: input.ao || operation.ao,
    linkedIntelIds: input.linkedIntelIds ? [...new Set(input.linkedIntelIds)] : operation.linkedIntelIds,
    invitedOrgIds: input.invitedOrgIds ? [...new Set(input.invitedOrgIds)] : operation.invitedOrgIds,
    classification: input.classification || operation.classification,
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(
    opId,
    'OP_METADATA_UPDATED',
    operatorId,
    'Operation metadata updated.',
    {
      name: updated.name,
      classification: updated.classification,
      aoNodeId: updated.ao?.nodeId,
    },
    nowMs
  );
  notifyListeners();
  return updated;
}

export function updateStatus(opId: string, status: OperationStatus, actorId?: string, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'updateStatus');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  const updated = patchOperation(opId, (operation) => ({
    ...operation,
    status,
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(opId, 'OP_STATUS_UPDATED', operatorId, `Operation status set to ${status}.`, { status }, nowMs);
  notifyListeners();
  return updated;
}

export function setPosture(opId: string, posture: OperationPosture, actorId?: string, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'setPosture');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  const updated = patchOperation(opId, (operation) => ({
    ...operation,
    posture,
    focusRules: defaultFocusRulesByPosture(posture),
    commsTemplateId: defaultCommsTemplateByPosture(posture),
    ttlProfileId: defaultTTlProfileByPosture(posture),
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(opId, 'OP_POSTURE_UPDATED', operatorId, `Operation posture set to ${posture}.`, { posture }, nowMs);
  notifyListeners();
  return updated;
}

export function applyCommsTemplate(
  opId: string,
  templateId: CommsTemplateId,
  actorId?: string,
  nowMs = Date.now()
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'applyCommsTemplate');
  const permission = canManageOperation(opId, operatorId);
  if (!permission.allowed) throw new Error(permission.reason);
  const updated = patchOperation(opId, (operation) => ({
    ...operation,
    commsTemplateId: templateId,
    updatedAt: nowIso(nowMs),
  }), { notify: false });
  appendAuditEvent(
    opId,
    'OP_COMMS_TEMPLATE_APPLIED',
    operatorId,
    `Comms template set to ${templateId}.`,
    { templateId },
    nowMs
  );
  notifyListeners();
  return updated;
}

export function createOperationTemplateFromOperation(
  opId: string,
  actorId: string,
  options: { name?: string; description?: string } = {},
  nowMs = Date.now()
): OperationTemplate {
  hydrateSnapshot();
  const operatorId = requireActorId(actorId, 'createOperationTemplateFromOperation');
  const operation = getOperationById(opId);
  if (!operation) throw new Error(`Operation ${opId} not found`);
  if (!hasManageRights(operation, operatorId)) {
    throw new Error('Only owners/commanders may create templates from this operation.');
  }

  const createdAt = nowIso(nowMs);
  const template: OperationTemplate = {
    id: createTemplateId(nowMs),
    name: options.name?.trim() || `${operation.name} Template`,
    description: options.description?.trim() || '',
    sourceOpId: operation.id,
    createdBy: operatorId,
    createdAt,
    updatedAt: createdAt,
    blueprint: {
      name: operation.name,
      hostOrgId: operation.hostOrgId,
      invitedOrgIds: [...new Set(operation.invitedOrgIds || [])],
      classification: operation.classification,
      posture: operation.posture,
      status: operation.status,
      domains: { ...operation.domains },
      ao: { ...operation.ao },
      commsTemplateId: operation.commsTemplateId as CommsTemplateId,
      ttlProfileId: operation.ttlProfileId,
      permissions: {
        commanderIds: [...new Set(operation.permissions.commanderIds || [])],
        guestOrgIds: [...new Set(operation.permissions.guestOrgIds || [])],
      },
    },
  };

  operationTemplatesStore = sortOperationTemplates([template, ...operationTemplatesStore]);
  appendAuditEvent(opId, 'OP_TEMPLATE_SAVED', operatorId, `Template ${template.name} saved from operation.`, { templateId: template.id }, nowMs);
  notifyListeners();
  return template;
}

export function createOperationTemplate(input: OperationTemplateCreateInput, nowMs = Date.now()): OperationTemplate {
  hydrateSnapshot();
  const operatorId = requireActorId(input.createdBy, 'createOperationTemplate');
  const createdAt = nowIso(nowMs);
  const posture = input.blueprint.posture || 'CASUAL';
  const template: OperationTemplate = {
    id: createTemplateId(nowMs),
    name: input.name.trim() || 'Untitled Template',
    description: input.description?.trim() || '',
    createdBy: operatorId,
    createdAt,
    updatedAt: createdAt,
    blueprint: {
      name: input.blueprint.name?.trim() || 'Untitled Operation',
      hostOrgId: input.blueprint.hostOrgId || 'ORG-LOCAL',
      invitedOrgIds: [...new Set(input.blueprint.invitedOrgIds || [])],
      classification: input.blueprint.classification || 'INTERNAL',
      posture,
      status: input.blueprint.status || 'PLANNING',
      domains: {
        fps: input.blueprint.domains?.fps ?? true,
        ground: input.blueprint.domains?.ground ?? true,
        airSpace: input.blueprint.domains?.airSpace ?? false,
        logistics: input.blueprint.domains?.logistics ?? true,
      },
      ao: input.blueprint.ao || { nodeId: 'system-stanton' },
      commsTemplateId: (input.blueprint.commsTemplateId || defaultCommsTemplateByPosture(posture)) as CommsTemplateId,
      ttlProfileId: input.blueprint.ttlProfileId || defaultTTlProfileByPosture(posture),
      permissions: {
        commanderIds: [...new Set(input.blueprint.permissions?.commanderIds || [])],
        guestOrgIds: [...new Set(input.blueprint.permissions?.guestOrgIds || [])],
      },
    },
  };

  operationTemplatesStore = sortOperationTemplates([template, ...operationTemplatesStore]);
  notifyListeners();
  return template;
}

export function listOperationTemplates(viewContext: { createdBy?: string } = {}): OperationTemplate[] {
  hydrateSnapshot();
  const creator = String(viewContext.createdBy || '').trim();
  if (!creator) return sortOperationTemplates(operationTemplatesStore);
  return sortOperationTemplates(operationTemplatesStore).filter((entry) => entry.createdBy === creator);
}

export function instantiateOperationFromTemplate(
  templateId: string,
  input: OperationTemplateInstantiateInput,
  nowMs = Date.now()
): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(input.createdBy, 'instantiateOperationFromTemplate');
  const template = operationTemplatesStore.find((entry) => entry.id === templateId);
  if (!template) throw new Error(`Operation template ${templateId} not found`);

  const operation = createOperation(
    {
      createdBy: operatorId,
      name: input.name?.trim() || template.blueprint.name,
      hostOrgId: input.hostOrgId || template.blueprint.hostOrgId,
      invitedOrgIds: input.invitedOrgIds || template.blueprint.invitedOrgIds,
      classification: input.classification || template.blueprint.classification,
      posture: input.posture || template.blueprint.posture,
      status: input.status || template.blueprint.status,
      domains: template.blueprint.domains,
      ao: input.ao || template.blueprint.ao,
      commsTemplateId: template.blueprint.commsTemplateId,
      ttlProfileId: template.blueprint.ttlProfileId,
      permissions: template.blueprint.permissions,
    },
    nowMs
  );
  appendAuditEvent(
    operation.id,
    'OP_TEMPLATE_APPLIED',
    operatorId,
    `Operation instantiated from template ${template.name}.`,
    { templateId: template.id, templateName: template.name },
    nowMs
  );
  notifyListeners();
  return operation;
}

export function cloneOperation(sourceOpId: string, input: OperationCloneInput, nowMs = Date.now()): Operation {
  hydrateSnapshot();
  const operatorId = requireActorId(input.createdBy, 'cloneOperation');
  const source = getOperationById(sourceOpId);
  if (!source) throw new Error(`Operation ${sourceOpId} not found`);
  if (!hasOperationAccess(source, operatorId)) {
    throw new Error('Cannot clone operation without membership');
  }
  const clone = createOperation(
    {
      createdBy: operatorId,
      name: input.name?.trim() || `${source.name} Copy`,
      hostOrgId: source.hostOrgId,
      invitedOrgIds: source.invitedOrgIds,
      classification: source.classification,
      posture: source.posture,
      status: 'PLANNING',
      domains: source.domains,
      ao: source.ao,
      commsTemplateId: source.commsTemplateId as CommsTemplateId,
      ttlProfileId: source.ttlProfileId,
      permissions: {
        commanderIds: source.permissions.commanderIds,
        guestOrgIds: source.permissions.guestOrgIds,
      },
    },
    nowMs
  );
  appendAuditEvent(
    clone.id,
    'OP_CLONED_FROM',
    operatorId,
    `Operation cloned from ${source.id}.`,
    { sourceOpId: source.id, sourceOpName: source.name },
    nowMs
  );
  appendAuditEvent(
    source.id,
    'OP_CLONED_TO',
    operatorId,
    `Operation cloned into ${clone.id}.`,
    { cloneOpId: clone.id, cloneOpName: clone.name },
    nowMs
  );
  notifyListeners();
  return clone;
}

export function appendOperationEvent(
  input: Omit<OperationEventStub, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  nowMs = Date.now()
): OperationEventStub {
  hydrateSnapshot();
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
  hydrateSnapshot();
  const events = sortOperationEvents(operationEventsStore);
  if (!opId) return events;
  return events.filter((entry) => entry.opId === opId);
}

export function listLiveOperationEvents(opId?: string): OperationEventStub[] {
  return listOperationEvents(opId).filter((entry) => !entry.isSimulation);
}

export function listSimulationOperationEvents(opId?: string, sessionId?: string): OperationEventStub[] {
  hydrateSnapshot();
  return listOperationEvents(opId).filter((entry) => {
    if (!entry.isSimulation) return false;
    if (sessionId && entry.simulationSessionId !== sessionId) return false;
    return true;
  });
}

export function listOperationAuditEvents(opId?: string, limit = 60): OperationAuditEvent[] {
  hydrateSnapshot();
  const events = sortOperationAudit(operationAuditStore);
  const scoped = opId ? events.filter((entry) => entry.opId === opId) : events;
  return scoped.slice(0, Math.max(1, limit));
}

export function subscribeOperations(listener: OperationListener): () => void {
  hydrateSnapshot();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOperationServiceState() {
  hydrateSnapshot();
  operationsStore = [];
  operationEventsStore = [];
  operationTemplatesStore = [];
  operationAuditStore = [];
  for (const key of Object.keys(focusByUser)) delete focusByUser[key];
  if (hasBrowserStorage()) {
    try {
      window.localStorage.removeItem(OP_SERVICE_STORAGE_KEY);
    } catch {
      // no-op
    }
  }
  notifyListeners();
}
