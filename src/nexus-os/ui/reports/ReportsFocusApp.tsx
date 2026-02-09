import React, { useEffect, useMemo, useState } from 'react';
import { useRenderProfiler } from '../../diagnostics';
import type { Citation, ReportArtifact, ReportKind, ReportScopeKind } from '../../schemas/reportSchemas';
import { NexusBadge, NexusButton, DegradedStateCard } from '../primitives';
import {
  deleteReport,
  formatCitationProvenance,
  generateReport,
  getDefaultReferenceGameVersion,
  listReports,
  subscribeReports,
} from '../../services';
import { appendNarrativeFromReport } from '../../services/narrativeService';
import { getFocusOperationId, listOperationsForUser, listOperationEvents, subscribeOperations } from '../../services/operationService';
import { listAllIntelObjectsForDev } from '../../services/intelService';
import {
  listAssumptions,
  listDecisions,
  listObjectives,
  listPhases,
  listTasks,
} from '../../services/planningService';
import { listAssetSlots, listRSVPEntries } from '../../services/rsvpService';
import { getFitProfileById } from '../../services/fitProfileService';
import { SkeletonText, SkeletonTile } from '../components';
import {
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
} from '../state';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';

type ViewerMode = 'NARRATIVE' | 'EVIDENCE' | 'SPLIT';

interface ReportsFocusAppProps extends Partial<CqbPanelSharedProps> {
  actorId: string;
  initialOpId?: string;
  onClose?: () => void;
}

const REPORT_KINDS: ReportKind[] = [
  'OP_BRIEF',
  'AAR',
  'SITREP',
  'INTEL_BRIEF',
  'INDUSTRIAL_RUN',
  'FORCE_POSTURE',
];

function confidenceTone(band: ReportArtifact['evidence'][number]['confidenceBand']): 'ok' | 'warning' | 'danger' {
  if (band === 'HIGH') return 'ok';
  if (band === 'MED') return 'warning';
  return 'danger';
}

function ttlTone(ttlState: string | undefined): 'ok' | 'warning' | 'danger' | 'neutral' {
  if (ttlState === 'FRESH') return 'ok';
  if (ttlState === 'STALE') return 'warning';
  if (ttlState === 'EXPIRED') return 'danger';
  return 'neutral';
}

function resolveCitationLabel(citation: Citation): string {
  return `${citation.kind}:${citation.refId}`;
}

function resolveCitationDetail(citation: Citation, opIdHint?: string): string {
  if (citation.kind === 'OP_EVENT') {
    const event = listOperationEvents(opIdHint).find((entry) => entry.id === citation.refId);
    if (!event) return `Missing OP_EVENT ${citation.refId}`;
    return `OP_EVENT ${event.kind} by ${event.createdBy} at ${event.createdAt}`;
  }
  if (citation.kind === 'INTEL') {
    const intel = listAllIntelObjectsForDev().find((entry) => entry.id === citation.refId);
    if (!intel) return `Missing INTEL ${citation.refId}`;
    return `INTEL ${intel.type}/${intel.stratum}: ${intel.title}`;
  }
  if (citation.kind === 'RSVP') {
    const opIds = opIdHint ? [opIdHint] : listOperationsForUser({ includeArchived: true }).map((op) => op.id);
    for (const opId of opIds) {
      const entry = listRSVPEntries(opId).find((item) => item.id === citation.refId);
      if (entry) return `RSVP ${entry.userId} (${entry.mode}/${entry.rolePrimary})`;
      const slot = listAssetSlots(opId).find((item) => item.id === citation.refId);
      if (slot) return `ASSET ${slot.assetName} tags: ${(slot.capabilitySnapshot.tags || []).join(', ') || 'none'}`;
    }
    return `Missing RSVP/Asset reference ${citation.refId}`;
  }
  if (citation.kind === 'PLANNING') {
    const opIds = opIdHint ? [opIdHint] : listOperationsForUser({ includeArchived: true }).map((op) => op.id);
    for (const opId of opIds) {
      const objective = listObjectives(opId).find((item) => item.id === citation.refId);
      if (objective) return `OBJECTIVE ${objective.title}`;
      const phase = listPhases(opId).find((item) => item.id === citation.refId);
      if (phase) return `PHASE ${phase.orderIndex + 1}: ${phase.title}`;
      const task = listTasks(opId).find((item) => item.id === citation.refId);
      if (task) return `TASK ${task.domain}: ${task.title}`;
      const assumption = listAssumptions(opId).find((item) => item.id === citation.refId);
      if (assumption) return `ASSUMPTION ${assumption.status}: ${assumption.statement}`;
      const decision = listDecisions(opId).find((item) => item.id === citation.refId);
      if (decision) return `DECISION ${decision.title}`;
    }
    return `Missing PLANNING reference ${citation.refId}`;
  }
  if (citation.kind === 'FIT_PROFILE') {
    const fit = getFitProfileById(citation.refId);
    if (!fit) return `Missing FIT_PROFILE ${citation.refId}`;
    return `FIT_PROFILE ${fit.name} (${fit.scope}) v${fit.gameVersion}`;
  }
  return `${citation.kind} ${citation.refId}`;
}

export default function ReportsFocusApp({
  actorId,
  initialOpId,
  onClose,
}: ReportsFocusAppProps) {
  useRenderProfiler('ReportsFocusApp');
  const [reportsVersion, setReportsVersion] = useState(0);
  const [opsVersion, setOpsVersion] = useState(0);
  const [isListLoading, setIsListLoading] = useState(true);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('SPLIT');
  const [filterScopeKind, setFilterScopeKind] = useState<'ALL' | ReportScopeKind>('ALL');
  const [filterKind, setFilterKind] = useState<'ALL' | ReportKind>('ALL');
  const [selectedReportId, setSelectedReportId] = useState('');
  const [generateKind, setGenerateKind] = useState<ReportKind>('OP_BRIEF');
  const [generateScopeKind, setGenerateScopeKind] = useState<ReportScopeKind>('OP');
  const [selectedOpId, setSelectedOpId] = useState(initialOpId || '');
  const [citationDetail, setCitationDetail] = useState('');
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const unsubReports = subscribeReports(() => setReportsVersion((value) => value + 1));
    const unsubOps = subscribeOperations(() => setOpsVersion((value) => value + 1));
    return () => {
      unsubReports();
      unsubOps();
    };
  }, []);

  const operations = useMemo(
    () => listOperationsForUser({ userId: actorId, includeArchived: false }),
    [actorId, opsVersion]
  );
  const focusOpId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);

  useEffect(() => {
    if (selectedOpId && operations.some((op) => op.id === selectedOpId)) return;
    const fallback = initialOpId || focusOpId || operations[0]?.id || '';
    setSelectedOpId(fallback);
  }, [selectedOpId, operations, initialOpId, focusOpId]);

  const reports = useMemo(() => {
    const filter = {
      scopeKind: filterScopeKind === 'ALL' ? undefined : filterScopeKind,
      kind: filterKind === 'ALL' ? undefined : filterKind,
      opId: filterScopeKind === 'OP' && selectedOpId ? selectedOpId : undefined,
    };
    return listReports(filter);
  }, [reportsVersion, filterScopeKind, filterKind, selectedOpId]);
  const reportsAvailability = resolveAvailabilityState({
    loading: isListLoading,
    count: reports.length,
    staleCount: reports.filter((report) => report.warnings.length > 0).length,
  });

  useEffect(() => {
    if (selectedReportId && reports.some((report) => report.id === selectedReportId)) return;
    setSelectedReportId(reports[0]?.id || '');
  }, [reports, selectedReportId]);

  useEffect(() => {
    setIsListLoading(true);
    const handle = requestAnimationFrame(() => setIsListLoading(false));
    return () => cancelAnimationFrame(handle);
  }, [reportsVersion, filterScopeKind, filterKind, selectedOpId]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const runAction = (action: () => void) => {
    try {
      setErrorText('');
      action();
    } catch (error: any) {
      setErrorText(error?.message || 'Action failed');
    }
  };

  const doGenerate = () => {
    runAction(() => {
      const scope =
        generateScopeKind === 'OP'
          ? { kind: 'OP' as const, opId: selectedOpId || undefined }
          : { kind: generateScopeKind };
      const created = generateReport(generateKind, scope, {
        generatedBy: actorId || 'system',
        opId: scope.kind === 'OP' ? scope.opId : undefined,
        gameVersionContext: getDefaultReferenceGameVersion(),
      });
      setSelectedReportId(created.id);
      setFilterScopeKind(scope.kind);
      setFilterKind(generateKind);
    });
  };

  if (!actorId) {
    return <DegradedStateCard state="LOCKED" reason="Actor context required for report generation." />;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Reports and Dispatch</h3>
          <p className="text-xs text-zinc-500">Narrative + Evidence tracks, deterministic snapshots, no fabricated telemetry.</p>
        </div>
        <div className="flex items-center gap-2">
          <NexusBadge tone="warning">MVP</NexusBadge>
          {onClose ? (
            <NexusButton size="sm" intent="subtle" onClick={onClose}>
              Return
            </NexusButton>
          ) : null}
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950/55 p-2.5 grid grid-cols-1 xl:grid-cols-7 gap-2">
        <select value={generateKind} onChange={(event) => setGenerateKind(event.target.value as ReportKind)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
          {REPORT_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select>
        <select value={generateScopeKind} onChange={(event) => setGenerateScopeKind(event.target.value as ReportScopeKind)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
          <option value="OP">OP</option>
          <option value="ORG">ORG</option>
          <option value="PERSONAL">PERSONAL</option>
        </select>
        <select value={selectedOpId} onChange={(event) => setSelectedOpId(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2">
          <option value="">Select operation</option>
          {operations.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
        </select>
        <NexusButton size="sm" intent="primary" onClick={doGenerate}>Generate</NexusButton>
        <select value={filterScopeKind} onChange={(event) => setFilterScopeKind(event.target.value as 'ALL' | ReportScopeKind)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
          <option value="ALL">Filter Scope: ALL</option>
          <option value="OP">OP</option>
          <option value="ORG">ORG</option>
          <option value="PERSONAL">PERSONAL</option>
        </select>
        <select value={filterKind} onChange={(event) => setFilterKind(event.target.value as 'ALL' | ReportKind)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
          <option value="ALL">Filter Kind: ALL</option>
          {REPORT_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
        </select>
      </section>

      {errorText ? (
        <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-xs text-red-300">{errorText}</div>
      ) : null}

      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-3">
        <section className="xl:col-span-3 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 min-h-0 overflow-auto pr-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-wide text-zinc-500">Report List</span>
            <NexusBadge tone={availabilityTone(reportsAvailability)}>{availabilityLabel(reportsAvailability)}</NexusBadge>
          </div>
          {reportsAvailability !== 'OK' ? (
            <div className="text-[11px] text-zinc-500">{availabilityCopy(reportsAvailability)}</div>
          ) : null}
          {isListLoading ? (
            <div className="space-y-2">
              <SkeletonTile />
              <SkeletonTile />
              <SkeletonText className="w-2/3" />
            </div>
          ) : null}
          {!isListLoading ? reports.map((report) => (
            <button key={report.id} type="button" onClick={() => setSelectedReportId(report.id)} className={`w-full text-left rounded border px-2 py-1.5 ${selectedReportId === report.id ? 'border-orange-500/70 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950/55'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-200 truncate">{report.kind}</span>
                <NexusBadge tone="neutral">{report.scope.kind}</NexusBadge>
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 truncate">{report.title}</div>
              <div className="mt-1 text-[10px] text-zinc-600">{report.generatedAt}</div>
            </button>
          )) : null}
          {!isListLoading && reports.length === 0 ? <div className="text-xs text-zinc-500">No reports for selected filters.</div> : null}
        </section>

        <section className="xl:col-span-9 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 min-h-0 overflow-hidden flex flex-col gap-2">
          {!selectedReport ? (
            <DegradedStateCard state="OFFLINE" reason="Select or generate a report to view narrative and evidence tracks." />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-100 truncate">{selectedReport.title}</h4>
                  <p className="text-[11px] text-zinc-500">template {selectedReport.templateId} | generated {selectedReport.generatedAt}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <NexusButton size="sm" intent={viewerMode === 'NARRATIVE' ? 'primary' : 'subtle'} onClick={() => setViewerMode('NARRATIVE')}>Narrative</NexusButton>
                  <NexusButton size="sm" intent={viewerMode === 'EVIDENCE' ? 'primary' : 'subtle'} onClick={() => setViewerMode('EVIDENCE')}>Evidence</NexusButton>
                  <NexusButton size="sm" intent={viewerMode === 'SPLIT' ? 'primary' : 'subtle'} onClick={() => setViewerMode('SPLIT')}>Split</NexusButton>
                  <NexusButton
                    size="sm"
                    intent="subtle"
                    onClick={() =>
                      runAction(() => {
                        const appended = appendNarrativeFromReport(selectedReport, Date.now());
                        if (!appended) throw new Error('This report scope cannot be published to op narrative.');
                      })
                    }
                  >
                    Publish Narrative
                  </NexusButton>
                  <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => { deleteReport(selectedReport.id); setSelectedReportId(''); })}>Delete</NexusButton>
                </div>
              </div>

              {selectedReport.warnings.length ? (
                <div className="rounded border border-amber-900/60 bg-amber-950/25 px-2 py-1 text-[11px] text-amber-200">
                  {selectedReport.warnings.join(' | ')}
                </div>
              ) : null}

              <div className={`flex-1 min-h-0 grid gap-3 ${viewerMode === 'SPLIT' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {viewerMode !== 'EVIDENCE' ? (
                  <div className="min-h-0 overflow-auto pr-1 space-y-2">
                    {selectedReport.narrative
                      .slice()
                      .sort((a, b) => a.orderIndex - b.orderIndex)
                      .map((section) => (
                        <article key={section.id} className="rounded border border-zinc-800 bg-zinc-950/55 p-2">
                          <h5 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">{section.heading}</h5>
                          <p className="mt-1 text-xs text-zinc-300 whitespace-pre-wrap">{section.body}</p>
                        </article>
                      ))}
                    {selectedReport.narrative.length === 0 ? <div className="text-xs text-zinc-500">Narrative track is empty.</div> : null}
                  </div>
                ) : null}

                {viewerMode !== 'NARRATIVE' ? (
                  <div className="min-h-0 overflow-auto pr-1 space-y-2">
                    {selectedReport.evidence.map((block) => {
                      const blockAvailability = resolveAvailabilityState({
                        count: block.citations.length,
                        hasConflict: block.ttlState === 'EXPIRED',
                        staleCount: block.ttlState === 'STALE' ? 1 : 0,
                      });
                      return (
                        <article key={block.id} className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-zinc-200">{block.claim}</p>
                            <div className="flex items-center gap-1">
                              <NexusBadge tone={availabilityTone(blockAvailability)}>{availabilityLabel(blockAvailability)}</NexusBadge>
                              <NexusBadge tone={confidenceTone(block.confidenceBand)}>{block.confidenceBand}</NexusBadge>
                              <NexusBadge tone={ttlTone(block.ttlState)}>{block.ttlState || 'N_A'}</NexusBadge>
                            </div>
                          </div>
                          <div className="text-[11px] text-zinc-500">{availabilityCopy(blockAvailability)}</div>
                          <div className="space-y-1">
                            {block.citations.map((citation) => (
                              <button
                                key={`${block.id}:${citation.kind}:${citation.refId}`}
                                type="button"
                                className="w-full text-left rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-900/65"
                                onClick={() => {
                                  const detail = resolveCitationDetail(citation, selectedReport.scope.opId);
                                  setCitationDetail(`${resolveCitationLabel(citation)}\n${detail}\n${formatCitationProvenance(citation)}`);
                                }}
                              >
                                <div className="text-zinc-200">{resolveCitationLabel(citation)}</div>
                                <div className="text-zinc-500 truncate">{formatCitationProvenance(citation)}</div>
                              </button>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                    {selectedReport.evidence.length === 0 ? <div className="text-xs text-zinc-500">Evidence track is empty.</div> : null}
                  </div>
                ) : null}
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 text-[11px] text-zinc-400 min-h-[3rem] whitespace-pre-wrap">
                {citationDetail || 'Citation inspector: select a citation to inspect underlying reference details.'}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
