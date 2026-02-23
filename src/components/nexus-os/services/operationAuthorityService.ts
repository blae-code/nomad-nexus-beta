import type {
  Operation,
  OperationReadinessGate,
} from '../schemas/opSchemas';

export type OperationRoleView = 'COMMAND' | 'LEAD' | 'PARTICIPANT';

export interface OperationActorContext {
  actorId: string;
  rank?: string;
  roles?: string[];
  orgId?: string;
  isAdmin?: boolean;
}

export interface OperationPermissionCheck {
  allowed: boolean;
  reason: string;
}

export interface ReadinessGateEvaluation {
  ready: boolean;
  blockingGateIds: string[];
  reason: string;
}

export interface ResolveRoleViewInput {
  context: OperationActorContext;
  operation?: Operation | null;
  rsvpPrimaryRole?: string;
  previewRoleView?: OperationRoleView | '';
}

const OVERRIDE_ROLE_TAGS = new Set(['admin', 'command', 'operations']);
const LEAD_ROLE_HINTS = [
  'lead',
  'leader',
  'squad',
  'officer',
  'xo',
  'exec',
  'platoon',
  'wing',
  'command',
];
const RANK_TIER: Record<string, number> = {
  VAGRANT: 0,
  SCOUT: 1,
  VOYAGER: 2,
  FOUNDER: 3,
  PIONEER: 4,
  COMMANDER: 5,
};
const ROLE_VIEW_ORDER: Record<OperationRoleView, number> = {
  PARTICIPANT: 0,
  LEAD: 1,
  COMMAND: 2,
};

function normalizeToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeRank(value: unknown): string {
  return String(value || 'VAGRANT').trim().toUpperCase();
}

function normalizeRoles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeToken(entry)).filter(Boolean);
}

function hasRoleOverride(context: OperationActorContext): boolean {
  if (context.isAdmin) return true;
  const roleSet = new Set(normalizeRoles(context.roles));
  for (const tag of OVERRIDE_ROLE_TAGS) {
    if (roleSet.has(tag)) return true;
  }
  return false;
}

function rankTier(rank: string): number {
  return RANK_TIER[normalizeRank(rank)] ?? -1;
}

function isRankAtLeast(rank: string | undefined, requiredRank: string): boolean {
  return rankTier(rank || 'VAGRANT') >= rankTier(requiredRank);
}

export function hasOperationCommandAuthority(operation: Operation | null | undefined, actorId: string): boolean {
  if (!operation || !actorId) return false;
  if (operation.createdBy === actorId) return true;
  if (operation.permissions.ownerIds?.includes(actorId)) return true;
  if (operation.permissions.commanderIds?.includes(actorId)) return true;
  return false;
}

export function canCreateOperation(context: OperationActorContext): OperationPermissionCheck {
  if (hasRoleOverride(context)) {
    return { allowed: true, reason: 'Authorized by command/admin role override.' };
  }
  if (isRankAtLeast(context.rank, 'SCOUT')) {
    return { allowed: true, reason: 'Authorized by rank threshold (SCOUT+).' };
  }
  return {
    allowed: false,
    reason: 'Operation creation requires SCOUT+ rank or admin/command/operations role override.',
  };
}

export function canControlLifecycle(
  context: OperationActorContext,
  operation?: Operation | null
): OperationPermissionCheck {
  if (hasRoleOverride(context)) {
    return { allowed: true, reason: 'Lifecycle authorized by command/admin role override.' };
  }
  if (hasOperationCommandAuthority(operation, context.actorId)) {
    return { allowed: true, reason: 'Lifecycle authorized by operation command authority.' };
  }
  if (isRankAtLeast(context.rank, 'SCOUT')) {
    return { allowed: true, reason: 'Lifecycle authorized by rank threshold (SCOUT+).' };
  }
  return {
    allowed: false,
    reason: 'Lifecycle controls require SCOUT+ rank, command authority, or admin/command/operations role override.',
  };
}

function hasLeadRoleSignal(context: OperationActorContext, rsvpPrimaryRole?: string): boolean {
  const tokens = [
    ...normalizeRoles(context.roles),
    normalizeToken(rsvpPrimaryRole),
  ].filter(Boolean);
  if (!tokens.length) return false;
  return tokens.some((token) => LEAD_ROLE_HINTS.some((hint) => token.includes(hint)));
}

export function deriveBaseOperationRoleView(
  context: OperationActorContext,
  operation?: Operation | null,
  rsvpPrimaryRole?: string
): OperationRoleView {
  if (canControlLifecycle(context, operation).allowed) return 'COMMAND';
  if (hasLeadRoleSignal(context, rsvpPrimaryRole)) return 'LEAD';
  return 'PARTICIPANT';
}

function canPreviewRole(baseRoleView: OperationRoleView, previewRoleView: OperationRoleView): boolean {
  return ROLE_VIEW_ORDER[previewRoleView] <= ROLE_VIEW_ORDER[baseRoleView];
}

export function resolveOperationRoleView(input: ResolveRoleViewInput): {
  baseRoleView: OperationRoleView;
  roleView: OperationRoleView;
  previewApplied: boolean;
} {
  const baseRoleView = deriveBaseOperationRoleView(input.context, input.operation, input.rsvpPrimaryRole);
  const previewRoleView = input.previewRoleView || '';
  if (!previewRoleView) {
    return { baseRoleView, roleView: baseRoleView, previewApplied: false };
  }
  if (!canPreviewRole(baseRoleView, previewRoleView)) {
    return { baseRoleView, roleView: baseRoleView, previewApplied: false };
  }
  return { baseRoleView, roleView: previewRoleView, previewApplied: previewRoleView !== baseRoleView };
}

export function evaluateReadinessGates(gates: OperationReadinessGate[] | undefined): ReadinessGateEvaluation {
  const allGates = Array.isArray(gates) ? gates : [];
  const blocking = allGates
    .filter((gate) => gate.required && gate.status !== 'READY')
    .map((gate) => gate.id);
  if (blocking.length === 0) {
    return {
      ready: true,
      blockingGateIds: [],
      reason: 'All required readiness gates are READY.',
    };
  }
  return {
    ready: false,
    blockingGateIds: blocking,
    reason: `Required readiness gates pending: ${blocking.join(', ')}.`,
  };
}

export function canActivateOperation(
  context: OperationActorContext,
  operation: Operation,
  overrideReason?: string
): OperationPermissionCheck {
  const lifecycle = canControlLifecycle(context, operation);
  if (!lifecycle.allowed) return lifecycle;

  const readiness = evaluateReadinessGates(operation.readinessGates);
  if (readiness.ready) {
    return { allowed: true, reason: 'Lifecycle + readiness gates satisfied.' };
  }
  if (String(overrideReason || '').trim()) {
    return { allowed: true, reason: 'Command override accepted with reason.' };
  }
  return {
    allowed: false,
    reason: 'Activation blocked by required readiness gates. Provide command override reason to proceed.',
  };
}

