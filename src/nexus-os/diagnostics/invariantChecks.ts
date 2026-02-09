/**
 * Nexus OS invariants checker.
 *
 * Guardrails:
 * - No fake telemetry: all non-user truth needs recency + TTL + confidence.
 * - No omniscient global chat: discussion must remain intel/op scoped.
 * - Multi-op focus must stay safe: focus op must exist in visible operation set.
 */

import type { ControlZone } from '../schemas/mapSchemas';
import type { IntelComment, IntelObject } from '../schemas/intelSchemas';
import type { OpComment, Operation, OperationEventStub } from '../schemas/opSchemas';
import type { FitProfile } from '../schemas/fitForceSchemas';

type MarketObservationLike = { stale?: boolean };

export type InvariantSeverity = 'info' | 'warning' | 'critical';

export interface InvariantWarning {
  code: string;
  severity: InvariantSeverity;
  message: string;
  details?: string;
}

type TTLLike = {
  id?: string;
  ttlProfileId?: string;
  ttlSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ProvenanceReferenceLike = {
  id?: string;
  source?: string;
  gameVersion?: string;
  importedAt?: string;
};

type ProvenanceMarketLike = {
  id?: string;
  source?: string;
  reportedAt?: string;
  confidence?: number;
  ttlProfileId?: string;
};

export interface TTLPresenceInput {
  intelObjects?: Array<TTLLike | null | undefined>;
  controlZones?: Array<TTLLike | null | undefined>;
  marketObservations?: Array<TTLLike | null | undefined>;
  assumptions?: Array<TTLLike | null | undefined>;
}

export interface ProvenancePresenceInput {
  referenceRecords?: Array<ProvenanceReferenceLike | null | undefined>;
  marketObservations?: Array<ProvenanceMarketLike | null | undefined>;
}

export interface OpScopingInput {
  events?: Array<OperationEventStub | null | undefined>;
  intelObjects?: Array<IntelObject | null | undefined>;
  comments?: Array<OpComment | null | undefined>;
}

export interface NoGlobalChatInput {
  opComments?: Array<OpComment | null | undefined>;
  intelComments?: Array<IntelComment | null | undefined>;
}

export interface FocusOpLogicInput {
  operations?: Array<Operation | null | undefined>;
  focusOperationId?: string | null;
}

export interface NexusInvariantInput {
  ttl?: TTLPresenceInput;
  provenance?: ProvenancePresenceInput;
  scoping?: OpScopingInput;
  noGlobalChat?: NoGlobalChatInput;
  focus?: FocusOpLogicInput;
}

export interface DiagnosticsSummary {
  warningCount: number;
  criticalCount: number;
  byCode: Record<string, number>;
}

function toArray<T>(value?: Array<T | null | undefined>): T[] {
  return (value || []).filter(Boolean) as T[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushWarning(
  bucket: InvariantWarning[],
  warning: Omit<InvariantWarning, 'details'> & { details?: string }
) {
  bucket.push({
    code: warning.code,
    severity: warning.severity,
    message: warning.message,
    details: warning.details,
  });
}

function checkTtlForGroup(
  objects: TTLLike[],
  groupName: string,
  warnings: InvariantWarning[]
) {
  for (const object of objects) {
    const hasProfile = isNonEmptyString(object.ttlProfileId);
    const hasSeconds = Number.isFinite(object.ttlSeconds) && Number(object.ttlSeconds) > 0;
    if (hasProfile || hasSeconds) continue;
    pushWarning(warnings, {
      code: 'TTL_MISSING',
      severity: 'warning',
      message: `${groupName} object is missing TTL metadata.`,
      details: object.id ? `id=${object.id}` : undefined,
    });
  }
}

export function checkTTLPresence(input: TTLPresenceInput): InvariantWarning[] {
  const warnings: InvariantWarning[] = [];
  checkTtlForGroup(toArray(input.intelObjects), 'Intel', warnings);
  checkTtlForGroup(toArray(input.controlZones), 'ControlZone', warnings);
  checkTtlForGroup(toArray(input.marketObservations), 'MarketObservation', warnings);
  checkTtlForGroup(toArray(input.assumptions), 'Assumption', warnings);
  return warnings;
}

export function checkProvenancePresence(input: ProvenancePresenceInput): InvariantWarning[] {
  const warnings: InvariantWarning[] = [];
  const references = toArray(input.referenceRecords);
  for (const record of references) {
    if (isNonEmptyString(record.source) && isNonEmptyString(record.gameVersion) && isNonEmptyString(record.importedAt)) {
      continue;
    }
    pushWarning(warnings, {
      code: 'REFERENCE_PROVENANCE_MISSING',
      severity: 'warning',
      message: 'Reference record is missing source/gameVersion/importedAt provenance.',
      details: record.id ? `id=${record.id}` : undefined,
    });
  }

  const market = toArray(input.marketObservations);
  for (const observation of market) {
    const hasCore = isNonEmptyString(observation.source) && isNonEmptyString(observation.reportedAt);
    const hasConfidence = Number.isFinite(observation.confidence);
    const hasTtl = isNonEmptyString(observation.ttlProfileId);
    if (hasCore && hasConfidence && hasTtl) continue;
    pushWarning(warnings, {
      code: 'MARKET_PROVENANCE_MISSING',
      severity: 'warning',
      message: 'Market observation is missing source/reportedAt/confidence/ttlProfileId.',
      details: observation.id ? `id=${observation.id}` : undefined,
    });
  }
  return warnings;
}

export function checkOpScoping(input: OpScopingInput): InvariantWarning[] {
  const warnings: InvariantWarning[] = [];
  for (const event of toArray(input.events)) {
    const scopeKind = event.scopeKind || (event.opId ? 'OP' : '');
    if (scopeKind === 'OP' && !isNonEmptyString(event.opId)) {
      pushWarning(warnings, {
        code: 'EVENT_UNSCOPED',
        severity: 'critical',
        message: 'OP-scoped event stub is missing opId.',
        details: event.id ? `id=${event.id}` : undefined,
      });
      continue;
    }
    if (!scopeKind && !isNonEmptyString(event.opId)) {
      pushWarning(warnings, {
        code: 'EVENT_SCOPE_UNKNOWN',
        severity: 'warning',
        message: 'Event stub has no explicit scopeKind/opId.',
        details: event.id ? `id=${event.id}` : undefined,
      });
    }
  }

  for (const intel of toArray(input.intelObjects)) {
    if (intel.scope.kind !== 'OP') continue;
    if (Array.isArray(intel.scope.opIds) && intel.scope.opIds.length > 0) continue;
    pushWarning(warnings, {
      code: 'INTEL_OP_SCOPE_EMPTY',
      severity: 'warning',
      message: 'OP-scoped intel object has no opIds.',
      details: `intelId=${intel.id}`,
    });
  }

  for (const comment of toArray(input.comments)) {
    if (isNonEmptyString(comment.opId)) continue;
    pushWarning(warnings, {
      code: 'COMMENT_UNSCOPED',
      severity: 'critical',
      message: 'Operation thread comment is missing op scope.',
      details: comment.id ? `id=${comment.id}` : undefined,
    });
  }
  return warnings;
}

export function checkNoGlobalChat(input: NoGlobalChatInput): InvariantWarning[] {
  const warnings: InvariantWarning[] = [];
  for (const comment of toArray(input.opComments)) {
    if (!isNonEmptyString(comment.opId)) {
      pushWarning(warnings, {
        code: 'GLOBAL_CHAT_RISK_OP',
        severity: 'critical',
        message: 'Detected unscoped op comment that could behave as global chat.',
        details: comment.id ? `id=${comment.id}` : undefined,
      });
    }
  }

  for (const comment of toArray(input.intelComments)) {
    if (!isNonEmptyString(comment.intelId)) {
      pushWarning(warnings, {
        code: 'GLOBAL_CHAT_RISK_INTEL',
        severity: 'critical',
        message: 'Detected intel comment without intelId scope.',
        details: comment.id ? `id=${comment.id}` : undefined,
      });
    }
  }
  return warnings;
}

export function checkFocusOpLogic(input: FocusOpLogicInput): InvariantWarning[] {
  const warnings: InvariantWarning[] = [];
  const operations = toArray(input.operations);
  if (!input.focusOperationId) {
    if (operations.length > 0) {
      pushWarning(warnings, {
        code: 'FOCUS_OP_MISSING',
        severity: 'warning',
        message: 'No focus operation is selected while operations exist.',
      });
    }
    return warnings;
  }

  const focus = operations.find((operation) => operation.id === input.focusOperationId);
  if (!focus) {
    pushWarning(warnings, {
      code: 'FOCUS_OP_INVALID',
      severity: 'critical',
      message: 'Focus operation does not exist in visible operation set.',
      details: `focusOperationId=${input.focusOperationId}`,
    });
    return warnings;
  }

  if (focus.status === 'ARCHIVED') {
    pushWarning(warnings, {
      code: 'FOCUS_OP_ARCHIVED',
      severity: 'warning',
      message: 'Focus operation points to archived op; user context may be stale.',
      details: `focusOperationId=${input.focusOperationId}`,
    });
  }
  return warnings;
}

export function runNexusOSInvariantChecks(input: NexusInvariantInput): InvariantWarning[] {
  return [
    ...checkTTLPresence(input.ttl || {}),
    ...checkProvenancePresence(input.provenance || {}),
    ...checkOpScoping(input.scoping || {}),
    ...checkNoGlobalChat(input.noGlobalChat || {}),
    ...checkFocusOpLogic(input.focus || {}),
  ];
}

export function summarizeInvariantWarnings(warnings: InvariantWarning[]): DiagnosticsSummary {
  const byCode: Record<string, number> = {};
  for (const warning of warnings) {
    byCode[warning.code] = (byCode[warning.code] || 0) + 1;
  }
  return {
    warningCount: warnings.length,
    criticalCount: warnings.filter((warning) => warning.severity === 'critical').length,
    byCode,
  };
}

export function computeStaleCounts(input: {
  intelObjects?: IntelObject[];
  marketObservations?: MarketObservationLike[];
  controlZones?: ControlZone[];
}): { intel: number; market: number; controlZones: number; total: number } {
  const intel = toArray(input.intelObjects).filter((intelObject) => Boolean(intelObject.retiredAt)).length;
  const market = toArray(input.marketObservations).filter((observation) => observation.stale).length;
  const controlZones = toArray(input.controlZones).filter((zone) =>
    !zone.signals.some((signal) => new Date(signal.expiresAt).getTime() > Date.now())
  ).length;
  return {
    intel,
    market,
    controlZones,
    total: intel + market + controlZones,
  };
}

export function computePatchMismatchCount(profiles: FitProfile[]): number {
  return (profiles || []).reduce(
    (count, profile) => count + (profile.validation?.patchMismatchWarnings?.length || 0),
    0
  );
}
