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
import { getOperationById, listOperationEvents, listOperationsForUser } from './operationService';
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

type ReportListener = (reports: ReportArtifact[]) => void;

let reportStore: ReportArtifact[] = [];
const listeners = new Set<ReportListener>();
const reportPreviewCache = new Map<string, { createdAtMs: number; payload: Omit<ReportArtifact, 'id'> }>();
const REPORT_PREVIEW_CACHE_WINDOW_MS = 10000;
const REPORT_PREVIEW_CACHE_MAX_AGE_MS = 30000;

function createReportId(nowMs = Date.now()): string {
  return `report_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
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
  // TODO(Package 7): add strict schema-level validation for markdown/link safety.
  const warnings: string[] = [];
  const missingRefs: ReportRef[] = [];

  if (!report.title?.trim()) warnings.push('Report title is missing.');
  if (!report.narrative?.length) warnings.push('Report narrative track is empty.');
  if (!report.evidence?.length) warnings.push('Report evidence track is empty.');
  if (!report.generatedAt) warnings.push('Report generatedAt is missing.');
  if (!report.templateId) warnings.push('Report templateId is missing.');
  if (!report.inputs?.snapshotRefs?.length) warnings.push('Report input snapshot refs are missing.');

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
  // TODO(Package 7): enforce role-based permissions for generation/deletion at scope boundaries.
  // TODO(Package 7): persist reproducible input snapshots in durable storage adapter.
  const generated = generateReportPreview(kind, scope, params, nowMs);

  const report: ReportArtifact = {
    ...generated,
    id: createReportId(nowMs),
    generatedAt: generated.generatedAt || nowIso(nowMs),
    generatedBy: generated.generatedBy || params.generatedBy || 'system',
  };

  const validation = validateReport(report);
  report.warnings = [...new Set([...(report.warnings || []), ...validation.warnings])];

  reportStore = sortReports([report, ...reportStore]);
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

export function deleteReport(id: string): boolean {
  const exists = reportStore.some((report) => report.id === id);
  if (!exists) return false;
  reportStore = reportStore.filter((report) => report.id !== id);
  notifyListeners();
  return true;
}

export function subscribeReports(listener: ReportListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetReportServiceState() {
  reportStore = [];
  reportPreviewCache.clear();
  notifyListeners();
}
