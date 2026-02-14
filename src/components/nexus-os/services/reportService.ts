/**
 * Reporting Service (MVP in-memory repository)
 *
 * Reports are first-class artifacts with narrative + evidence tracks.
 * This service preserves deterministic generation shape and audit metadata.
 */

import type {
  Citation,
  EvidenceBlock,
  ReportArtifact,
  ReportKind,
  ReportRef,
  ReportSection,
  ReportScope,
} from '../schemas/reportSchemas';
import { getDefaultReferenceGameVersion } from './referenceDataService';
import { REPORT_GENERATORS } from './reportGenerators';
import { nowIso } from './reportFormatting';
import {
  canManageOperation,
  getOperationById,
  listOperationEvents,
  listOperationsForUser,
} from './operationService';
import {
  listAssumptions,
  listDecisions,
  listObjectives,
  listPhases,
  listTasks,
} from './planningService';
import { listAssetSlots, listRSVPEntries } from './rsvpService';
import { listAllIntelObjectsForDev } from './intelService';
import { getFitProfileById } from './fitProfileService';
import { listRouteHypotheses } from './marketIntelService';
import { appendNarrativeFromReport } from './narrativeService';

export interface GenerateReportParams {
  generatedBy?: string;
  opId?: string;
  fitProfileId?: string;
  gameVersionContext?: string;
  locale?: string;
  voicePack?: string;
}

export interface ReportListFilter {
  kind?: ReportKind;
  scopeKind?: ReportScope['kind'];
  opId?: string;
  generatedBy?: string;
}

export interface ReportValidationResult {
  warnings: string[];
  missingRefs: ReportRef[];
}

export interface ReportInputSnapshot {
  id: string;
  reportId: string;
  kind: ReportKind;
  scope: ReportScope;
  generatedBy: string;
  generatedAt: string;
  checksum: string;
  inputs: {
    refs: ReportRef[];
    snapshotRefs: ReportRef[];
    gameVersionContext?: string;
    dataSources: Array<{ source: string; importedAt?: string; note?: string }>;
  };
}

type ReportListener = (reports: ReportArtifact[]) => void;

let reportStore: ReportArtifact[] = [];
let reportInputSnapshotStore: ReportInputSnapshot[] = [];
const listeners = new Set<ReportListener>();
const reportPreviewCache = new Map<string, { createdAtMs: number; payload: Omit<ReportArtifact, 'id'> }>();
const REPORT_PREVIEW_CACHE_WINDOW_MS = 10000;
const REPORT_PREVIEW_CACHE_MAX_AGE_MS = 30000;

function createReportId(nowMs = Date.now()): string {
  return `report_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function createReportSnapshotId(nowMs = Date.now()): string {
  return `report_snapshot_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeToken(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function sortRefs(refs: ReportRef[]): ReportRef[] {
  return [...(refs || [])].sort((a, b) => {
    const kind = a.kind.localeCompare(b.kind);
    if (kind !== 0) return kind;
    return a.id.localeCompare(b.id);
  });
}

function sortCitations(citations: Citation[]): Citation[] {
  return [...(citations || [])].sort((a, b) => {
    const aTs = new Date(a.occurredAt || a.reportedAt || a.importedAt || '').getTime();
    const bTs = new Date(b.occurredAt || b.reportedAt || b.importedAt || '').getTime();
    if (Number.isFinite(aTs) && Number.isFinite(bTs) && aTs !== bTs) return bTs - aTs;
    const kind = a.kind.localeCompare(b.kind);
    if (kind !== 0) return kind;
    return a.refId.localeCompare(b.refId);
  });
}

function sortNarrative(sections: ReportSection[]): ReportSection[] {
  return [...(sections || [])]
    .map((section) => ({ ...section, linkedRefs: sortRefs(section.linkedRefs || []) }))
    .sort((a, b) => {
      const byIndex = a.orderIndex - b.orderIndex;
      if (byIndex !== 0) return byIndex;
      return a.id.localeCompare(b.id);
    });
}

function sortEvidence(evidence: EvidenceBlock[]): EvidenceBlock[] {
  return [...(evidence || [])]
    .map((block) => ({ ...block, citations: sortCitations(block.citations || []) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeReportShape<T extends Omit<ReportArtifact, 'id'>>(report: T): T {
  const sortedWarnings = [...new Set(report.warnings || [])].sort((a, b) => a.localeCompare(b));
  return {
    ...report,
    narrative: sortNarrative(report.narrative || []),
    evidence: sortEvidence(report.evidence || []),
    inputs: {
      ...report.inputs,
      refs: sortRefs(report.inputs?.refs || []),
      snapshotRefs: sortRefs(report.inputs?.snapshotRefs || report.inputs?.refs || []),
      dataSources: [...(report.inputs?.dataSources || [])].sort((a, b) =>
        `${a.source}:${a.importedAt || ''}:${a.note || ''}`.localeCompare(
          `${b.source}:${b.importedAt || ''}:${b.note || ''}`
        )
      ),
    },
    warnings: sortedWarnings,
  };
}

function previewCacheKey(kind: ReportKind, scope: ReportScope, params: GenerateReportParams, nowMs: number): string {
  const bucket = Math.floor(nowMs / REPORT_PREVIEW_CACHE_WINDOW_MS);
  const scopeKey = `${scope.kind}:${scope.opId || ''}`;
  return [
    kind,
    scopeKey,
    params.generatedBy || 'system',
    params.opId || '',
    params.fitProfileId || '',
    params.gameVersionContext || '',
    params.locale || '',
    params.voicePack || '',
    String(bucket),
  ].join('|');
}

function sortReports(records: ReportArtifact[]): ReportArtifact[] {
  return [...records].sort((a, b) => {
    const byTime = new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

function notifyListeners() {
  const snapshot = sortReports(reportStore);
  for (const listener of listeners) listener(snapshot);
}

function canAccessOperationScope(opId: string, actorId: string): boolean {
  if (!opId) return false;
  const normalizedActor = normalizeToken(actorId);
  if (!normalizedActor) return false;
  if (normalizedActor === 'system') return true;
  return listOperationsForUser({ userId: actorId, includeArchived: true }).some((operation) => operation.id === opId);
}

function assertGeneratePermissions(
  kind: ReportKind,
  scope: ReportScope,
  generatedBy: string
) {
  if (scope.kind === 'OP') {
    if (!scope.opId) throw new Error(`${kind} generation requires OP scope opId`);
    if (!canAccessOperationScope(scope.opId, generatedBy)) {
      throw new Error(`Report generation denied: ${generatedBy || 'unknown'} lacks OP scope access`);
    }
  }
}

function assertDeletePermissions(report: ReportArtifact, actorId: string) {
  const normalizedActor = normalizeToken(actorId);
  if (!normalizedActor) throw new Error('deleteReport requires actorId');
  if (normalizedActor === 'system') return;
  const editableBy = report.permissions?.editableBy || [];
  if (editableBy.includes(actorId) || report.generatedBy === actorId) return;
  if (report.scope.kind === 'OP' && report.scope.opId) {
    const permission = canManageOperation(report.scope.opId, actorId);
    if (permission.allowed) return;
    throw new Error('Delete denied: OP scope report requires owner/commander or report editor rights.');
  }
  throw new Error('Delete denied: report may only be removed by generator/editor.');
}

function collectUnsafeMarkdownWarnings(text: string, context: string): string[] {
  if (!text) return [];
  const warnings: string[] = [];
  const checks: Array<{ pattern: RegExp; message: string }> = [
    { pattern: /<\s*script\b/i, message: 'script tags are not allowed' },
    { pattern: /<\s*(iframe|object|embed)\b/i, message: 'embedded HTML tags are not allowed' },
    { pattern: /\bon[a-z]+\s*=/i, message: 'inline event handlers are not allowed' },
    { pattern: /\[[^\]]*]\(\s*javascript:/i, message: 'javascript: links are not allowed' },
    { pattern: /\[[^\]]*]\(\s*data:/i, message: 'data: links are not allowed' },
    { pattern: /javascript:/i, message: 'javascript protocol is not allowed' },
  ];
  for (const check of checks) {
    if (!check.pattern.test(text)) continue;
    warnings.push(`${context} contains unsafe markdown/html: ${check.message}.`);
  }
  return warnings;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${key}:${stableStringify(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function computeChecksum(value: unknown): string {
  const text = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function persistReportInputSnapshot(report: ReportArtifact, nowMs = Date.now()): ReportInputSnapshot {
  const snapshot: ReportInputSnapshot = {
    id: createReportSnapshotId(nowMs),
    reportId: report.id,
    kind: report.kind,
    scope: { ...report.scope },
    generatedBy: report.generatedBy,
    generatedAt: report.generatedAt,
    checksum: computeChecksum({
      kind: report.kind,
      scope: report.scope,
      generatedBy: report.generatedBy,
      generatedAt: report.generatedAt,
      inputs: report.inputs,
      narrative: report.narrative,
      evidence: report.evidence,
    }),
    inputs: {
      refs: sortRefs(report.inputs?.refs || []),
      snapshotRefs: sortRefs(report.inputs?.snapshotRefs || report.inputs?.refs || []),
      gameVersionContext: report.inputs?.gameVersionContext,
      dataSources: [...(report.inputs?.dataSources || [])].sort((a, b) =>
        `${a.source}:${a.importedAt || ''}:${a.note || ''}`.localeCompare(
          `${b.source}:${b.importedAt || ''}:${b.note || ''}`
        )
      ),
    },
  };
  reportInputSnapshotStore = [
    snapshot,
    ...reportInputSnapshotStore.filter((entry) => entry.reportId !== report.id),
  ];
  return snapshot;
}

function findRefAcrossOps<T>(reader: (opId: string) => T[]): T[] {
  const ops = listOperationsForUser({ includeArchived: true });
  return ops.flatMap((op) => reader(op.id));
}

function hasRef(ref: ReportRef): boolean {
  if (ref.kind === 'operation') return Boolean(getOperationById(ref.id));
  if (ref.kind === 'objective') return findRefAcrossOps(listObjectives).some((item: any) => item.id === ref.id);
  if (ref.kind === 'phase') return findRefAcrossOps(listPhases).some((item: any) => item.id === ref.id);
  if (ref.kind === 'task') return findRefAcrossOps(listTasks).some((item: any) => item.id === ref.id);
  if (ref.kind === 'assumption') return findRefAcrossOps(listAssumptions).some((item: any) => item.id === ref.id);
  if (ref.kind === 'decision') return findRefAcrossOps(listDecisions).some((item: any) => item.id === ref.id);
  if (ref.kind === 'rsvp') return findRefAcrossOps(listRSVPEntries).some((item: any) => item.id === ref.id);
  if (ref.kind === 'asset_slot') return findRefAcrossOps(listAssetSlots).some((item: any) => item.id === ref.id);
  if (ref.kind === 'op_event') return listOperationEvents().some((item) => item.id === ref.id);
  if (ref.kind === 'intel') return listAllIntelObjectsForDev().some((item) => item.id === ref.id);
  if (ref.kind === 'fit_profile') return Boolean(getFitProfileById(ref.id));
  if (ref.kind === 'route_hypothesis') {
    return listRouteHypotheses().some((route) => `${route.fromNodeId}->${route.toNodeId}` === ref.id);
  }
  return false;
}

export function validateReport(report: ReportArtifact): ReportValidationResult {
  const warnings: string[] = [];
  const missingRefs: ReportRef[] = [];

  if (!report.title?.trim()) warnings.push('Report title is missing.');
  if (!report.narrative?.length) warnings.push('Report narrative track is empty.');
  if (!report.evidence?.length) warnings.push('Report evidence track is empty.');
  if (!report.generatedAt) warnings.push('Report generatedAt is missing.');
  if (!report.templateId) warnings.push('Report templateId is missing.');
  if (!report.inputs?.snapshotRefs?.length) warnings.push('Report input snapshot refs are missing.');
  warnings.push(...collectUnsafeMarkdownWarnings(report.title || '', 'Report title'));

  for (const ref of report.inputs?.refs || []) {
    if (hasRef(ref)) continue;
    missingRefs.push(ref);
  }
  if (missingRefs.length) {
    warnings.push(`Missing referenced artifacts: ${missingRefs.length}.`);
  }

  for (const block of report.evidence || []) {
    if (!block.citations?.length) {
      warnings.push(`Evidence block ${block.id} has no citations.`);
    }
    warnings.push(...collectUnsafeMarkdownWarnings(block.claim || '', `Evidence ${block.id} claim`));
    warnings.push(...collectUnsafeMarkdownWarnings(block.notes || '', `Evidence ${block.id} notes`));
  }

  for (const section of report.narrative || []) {
    warnings.push(...collectUnsafeMarkdownWarnings(section.heading || '', `Section ${section.id} heading`));
    warnings.push(...collectUnsafeMarkdownWarnings(section.body || '', `Section ${section.id} body`));
  }

  return {
    warnings: [...new Set(warnings)],
    missingRefs,
  };
}

export function generateReport(
  kind: ReportKind,
  scope: ReportScope,
  params: GenerateReportParams = {},
  nowMs = Date.now()
): ReportArtifact {
  const generatedBy = params.generatedBy || 'system';
  assertGeneratePermissions(kind, scope, generatedBy);
  const generated = generateReportPreview(kind, scope, params, nowMs);

  const report: ReportArtifact = {
    ...generated,
    id: createReportId(nowMs),
    generatedAt: generated.generatedAt || nowIso(nowMs),
    generatedBy: generated.generatedBy || generatedBy,
  };

  const validation = validateReport(report);
  report.warnings = [...new Set([...(report.warnings || []), ...validation.warnings])];

  reportStore = sortReports([report, ...reportStore]);
  persistReportInputSnapshot(report, nowMs);
  // Bridge official reports into op-scoped narrative log when possible.
  appendNarrativeFromReport(report, nowMs);
  notifyListeners();
  return report;
}

export function generateReportPreview(
  kind: ReportKind,
  scope: ReportScope,
  params: GenerateReportParams = {},
  nowMs = Date.now()
): Omit<ReportArtifact, 'id'> {
  const generator = REPORT_GENERATORS[kind];
  if (!generator) throw new Error(`No generator registered for report kind ${kind}`);

  const key = previewCacheKey(kind, scope, params, nowMs);
  const cached = reportPreviewCache.get(key);
  if (cached && nowMs - cached.createdAtMs <= REPORT_PREVIEW_CACHE_MAX_AGE_MS) {
    return cached.payload;
  }

  const generated = generator(
    {
      scope,
      generatedBy: params.generatedBy || 'system',
      opId: params.opId,
      fitProfileId: params.fitProfileId,
      gameVersionContext: params.gameVersionContext || getDefaultReferenceGameVersion(),
      locale: params.locale,
      voicePack: params.voicePack,
    },
    nowMs
  );

  const normalized = normalizeReportShape({
    ...generated,
    generatedAt: generated.generatedAt || nowIso(nowMs),
    generatedBy: generated.generatedBy || params.generatedBy || 'system',
    inputs: {
      refs: generated.inputs?.refs || [],
      snapshotRefs: generated.inputs?.snapshotRefs || generated.inputs?.refs || [],
      gameVersionContext:
        generated.inputs?.gameVersionContext || params.gameVersionContext || getDefaultReferenceGameVersion(),
      dataSources: generated.inputs?.dataSources || [],
    },
    warnings: generated.warnings || [],
  });

  reportPreviewCache.set(key, {
    createdAtMs: nowMs,
    payload: normalized,
  });
  if (reportPreviewCache.size > 20) {
    const oldest = [...reportPreviewCache.entries()].sort((a, b) => a[1].createdAtMs - b[1].createdAtMs)[0];
    if (oldest) reportPreviewCache.delete(oldest[0]);
  }
  return normalized;
}

export function listReports(filter: ReportListFilter = {}): ReportArtifact[] {
  return sortReports(reportStore).filter((report) => {
    if (filter.kind && report.kind !== filter.kind) return false;
    if (filter.scopeKind && report.scope.kind !== filter.scopeKind) return false;
    if (filter.opId && report.scope.opId !== filter.opId) return false;
    if (filter.generatedBy && report.generatedBy !== filter.generatedBy) return false;
    return true;
  });
}

export function getReport(id: string): ReportArtifact | null {
  return reportStore.find((report) => report.id === id) || null;
}

export function getReportInputSnapshot(reportId: string): ReportInputSnapshot | null {
  return reportInputSnapshotStore.find((entry) => entry.reportId === reportId) || null;
}

export function listReportInputSnapshots(): ReportInputSnapshot[] {
  return [...reportInputSnapshotStore].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export function deleteReport(id: string, actorId: string): boolean {
  const report = reportStore.find((entry) => entry.id === id);
  if (!report) return false;
  assertDeletePermissions(report, actorId);
  reportStore = reportStore.filter((report) => report.id !== id);
  reportInputSnapshotStore = reportInputSnapshotStore.filter((entry) => entry.reportId !== id);
  notifyListeners();
  return true;
}

export function subscribeReports(listener: ReportListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetReportServiceState() {
  reportStore = [];
  reportInputSnapshotStore = [];
  reportPreviewCache.clear();
  notifyListeners();
}
