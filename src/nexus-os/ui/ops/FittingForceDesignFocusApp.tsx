import React, { useEffect, useMemo, useState } from 'react';
import { useRenderProfiler } from '../../diagnostics';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import type { CoverageCellStatus, FitProfile, ForceAnalysis } from '../../schemas/fitForceSchemas';
import { getDefaultReferenceGameVersion } from '../../services/referenceDataService';
import {
  createFitProfile,
  listFitProfiles,
  subscribeFitProfiles,
  updateFitProfile,
} from '../../services/fitProfileService';
import { analyzeFitProfile, analyzeRoster } from '../../services/forceDesignService';
import { getFocusOperationId, listOperationsForUser, subscribeOperations } from '../../services/operationService';
import { subscribeRsvp } from '../../services/rsvpService';
import { SkeletonBlock, SkeletonText } from '../components';
import {
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
} from '../state';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';

type FitTabId = 'FIT_PROFILES' | 'FORCE_DESIGN' | 'SCENARIOS' | 'NOTES';
type AnalysisMode = 'OPERATION' | 'FIT_PROFILE';

interface FittingForceDesignFocusAppProps extends Partial<CqbPanelSharedProps> {
  actorId: string;
  onClose?: () => void;
  initialOpId?: string;
}

const TABS: FitTabId[] = ['FIT_PROFILES', 'FORCE_DESIGN', 'SCENARIOS', 'NOTES'];

function statusTone(status: CoverageCellStatus): 'ok' | 'warning' | 'danger' | 'neutral' {
  if (status === 'covered') return 'ok';
  if (status === 'thin') return 'warning';
  if (status === 'absent') return 'danger';
  return 'neutral';
}

function bandTone(band: 'LOW' | 'MED' | 'HIGH'): 'ok' | 'warning' | 'danger' {
  if (band === 'HIGH') return 'ok';
  if (band === 'MED') return 'warning';
  return 'danger';
}

function cardClass(status: CoverageCellStatus): string {
  if (status === 'covered') return 'border-emerald-900/50 bg-emerald-950/20 text-emerald-300';
  if (status === 'thin') return 'border-amber-900/50 bg-amber-950/20 text-amber-300';
  if (status === 'absent') return 'border-red-900/60 bg-red-950/20 text-red-300';
  return 'border-zinc-800 bg-zinc-900/50 text-zinc-400';
}

function layoutDependencyNodes(analysis: ForceAnalysis) {
  const count = analysis.dependencyGraph.nodes.length;
  if (!count) return [] as Array<{ id: string; label: string; x: number; y: number }>;
  const cx = 160;
  const cy = 110;
  const radius = Math.min(85, 28 + count * 8);
  return analysis.dependencyGraph.nodes.map((node, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return {
      id: node.id,
      label: node.label,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
    };
  });
}

export default function FittingForceDesignFocusApp({
  actorId,
  onClose,
  initialOpId,
}: FittingForceDesignFocusAppProps) {
  useRenderProfiler('FittingForceDesignFocusApp');
  const [fitVersion, setFitVersion] = useState(0);
  const [opsVersion, setOpsVersion] = useState(0);
  const [rsvpVersion, setRsvpVersion] = useState(0);
  const [isAnalysisComputing, setIsAnalysisComputing] = useState(false);
  const [tabId, setTabId] = useState<FitTabId>('FIT_PROFILES');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('OPERATION');
  const [fitName, setFitName] = useState('');
  const [fitScope, setFitScope] = useState<FitProfile['scope']>('INDIVIDUAL');
  const [fitVersionInput, setFitVersionInput] = useState(getDefaultReferenceGameVersion());
  const [fitRoleTags, setFitRoleTags] = useState('escort, command');
  const [fitCapabilityTags, setFitCapabilityTags] = useState('escort');
  const [selectedFitId, setSelectedFitId] = useState('');
  const [selectedOpId, setSelectedOpId] = useState('');
  const [compareLeftFitId, setCompareLeftFitId] = useState('');
  const [compareRightFitId, setCompareRightFitId] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [notesLog, setNotesLog] = useState<Array<{ id: string; at: string; body: string }>>([]);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const unsubFits = subscribeFitProfiles(() => setFitVersion((value) => value + 1));
    const unsubOps = subscribeOperations(() => setOpsVersion((value) => value + 1));
    const unsubRsvp = subscribeRsvp(() => setRsvpVersion((value) => value + 1));
    return () => {
      unsubFits();
      unsubOps();
      unsubRsvp();
    };
  }, []);

  const fits = useMemo(() => listFitProfiles(), [fitVersion]);
  const operations = useMemo(
    () => listOperationsForUser({ userId: actorId, includeArchived: false }),
    [actorId, opsVersion]
  );
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);

  useEffect(() => {
    if (!selectedFitId && fits[0]) setSelectedFitId(fits[0].id);
    if (!compareLeftFitId && fits[0]) setCompareLeftFitId(fits[0].id);
    if (!compareRightFitId && fits[1]) setCompareRightFitId(fits[1].id);
  }, [fits, selectedFitId, compareLeftFitId, compareRightFitId]);

  useEffect(() => {
    if (initialOpId && operations.some((op) => op.id === initialOpId)) {
      setSelectedOpId(initialOpId);
      setAnalysisMode('OPERATION');
      return;
    }
    if (selectedOpId && operations.some((op) => op.id === selectedOpId)) return;
    if (focusOperationId && operations.some((op) => op.id === focusOperationId)) {
      setSelectedOpId(focusOperationId);
      return;
    }
    setSelectedOpId(operations[0]?.id || '');
  }, [operations, focusOperationId, selectedOpId, initialOpId]);

  const selectedFit = useMemo(() => fits.find((entry) => entry.id === selectedFitId) || null, [fits, selectedFitId]);

  const activeAnalysis = useMemo(() => {
    if (analysisMode === 'OPERATION') {
      if (!selectedOpId) return null;
      return analyzeRoster(selectedOpId);
    }
    if (!selectedFitId) return null;
    return analyzeFitProfile(selectedFitId);
  }, [analysisMode, selectedOpId, selectedFitId, rsvpVersion, fitVersion]);

  const compareLeft = useMemo(
    () => (compareLeftFitId ? analyzeFitProfile(compareLeftFitId) : null),
    [compareLeftFitId, fitVersion]
  );
  const compareRight = useMemo(
    () => (compareRightFitId ? analyzeFitProfile(compareRightFitId) : null),
    [compareRightFitId, fitVersion]
  );
  const forceAvailability = resolveAvailabilityState({
    loading: isAnalysisComputing,
    count: activeAnalysis ? activeAnalysis.coverageMatrix.rows.length : 0,
    staleCount: activeAnalysis?.gaps.length || 0,
    hasConflict: (activeAnalysis?.gaps || []).some((gap) => gap.severity === 'HIGH'),
  });

  useEffect(() => {
    setIsAnalysisComputing(true);
    const handle = requestAnimationFrame(() => setIsAnalysisComputing(false));
    return () => cancelAnimationFrame(handle);
  }, [analysisMode, selectedOpId, selectedFitId, fitVersion, rsvpVersion]);

  const dependencyNodeLayout = useMemo(
    () => (activeAnalysis ? layoutDependencyNodes(activeAnalysis) : []),
    [activeAnalysis]
  );
  const nodeById = useMemo(() => {
    return dependencyNodeLayout.reduce<Record<string, { x: number; y: number }>>((acc, node) => {
      acc[node.id] = { x: node.x, y: node.y };
      return acc;
    }, {});
  }, [dependencyNodeLayout]);

  const runAction = (action: () => void) => {
    try {
      setErrorText('');
      action();
    } catch (error: any) {
      setErrorText(error?.message || 'Action failed');
    }
  };

  const createProfile = () => {
    runAction(() => {
      const roleTags = fitRoleTags.split(',').map((token) => token.trim()).filter(Boolean);
      const capabilityTags = fitCapabilityTags.split(',').map((token) => token.trim()).filter(Boolean);
      const fit = createFitProfile({
        scope: fitScope,
        name: fitName.trim() || `Fit Profile ${fits.length + 1}`,
        createdBy: actorId,
        gameVersion: fitVersionInput.trim() || getDefaultReferenceGameVersion(),
        roleTags,
        capabilityTags,
        platforms: fitScope === 'INDIVIDUAL' ? [{ id: 'platform-1', shipNameSnapshot: 'Unknown Platform' }] : [],
        elements:
          fitScope === 'INDIVIDUAL'
            ? []
            : [{ id: 'element-1', label: 'Element A', countPlanned: 1, roleTags, capabilityTags }],
      });
      setSelectedFitId(fit.id);
      setFitName('');
      setTabId('FIT_PROFILES');
    });
  };

  if (!actorId) {
    return <DegradedStateCard state="LOCKED" reason="Actor context required for Force Design workspace." />;
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Fitting + Force Design</h3>
          <p className="text-xs text-zinc-500">Patch-stamped, capability-first analysis. Unknown states are preserved.</p>
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

      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 flex items-center gap-2 flex-wrap">
        {TABS.map((entry) => (
          <NexusButton key={entry} size="sm" intent={tabId === entry ? 'primary' : 'subtle'} onClick={() => setTabId(entry)}>
            {entry.replace('_', ' ')}
          </NexusButton>
        ))}
      </section>

      {errorText ? (
        <div className="rounded border border-red-900/70 bg-red-950/35 px-2 py-1 text-xs text-red-300">{errorText}</div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto pr-1">
        {tabId === 'FIT_PROFILES' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Create Fit Profile</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input value={fitName} onChange={(event) => setFitName(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Profile name" />
                <select value={fitScope} onChange={(event) => setFitScope(event.target.value as FitProfile['scope'])} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="INDIVIDUAL">INDIVIDUAL</option><option value="SQUAD">SQUAD</option><option value="WING">WING</option><option value="FLEET">FLEET</option>
                </select>
              </div>
              <input value={fitVersionInput} onChange={(event) => setFitVersionInput(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Game version" />
              <input value={fitRoleTags} onChange={(event) => setFitRoleTags(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Role tags (comma separated)" />
              <input value={fitCapabilityTags} onChange={(event) => setFitCapabilityTags(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Capability tags (comma separated)" />
              <NexusButton size="sm" intent="primary" onClick={createProfile}>Create Profile</NexusButton>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Profiles</h4>
              <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
                {fits.map((fit) => (
                  <button key={fit.id} type="button" onClick={() => setSelectedFitId(fit.id)} className={`w-full text-left rounded border px-2 py-1.5 ${selectedFitId === fit.id ? 'border-orange-500/70 bg-zinc-900/80' : 'border-zinc-800 bg-zinc-950/55'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-zinc-200 truncate">{fit.name}</span>
                      <NexusBadge tone="neutral">{fit.scope}</NexusBadge>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">v{fit.gameVersion} | caps {fit.capabilityTags.length} | unknowns {fit.validation.unknowns.length}</div>
                  </button>
                ))}
                {fits.length === 0 ? <div className="text-xs text-zinc-500">No fit profiles yet.</div> : null}
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 xl:col-span-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Selected Profile</h4>
              {!selectedFit ? (
                <div className="text-xs text-zinc-500">Select a profile to inspect validation and tags.</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <NexusBadge tone="neutral">{selectedFit.scope}</NexusBadge>
                    <NexusBadge tone="warning">v{selectedFit.gameVersion}</NexusBadge>
                    <NexusBadge tone={selectedFit.validation.patchMismatchWarnings.length ? 'danger' : 'ok'}>{selectedFit.validation.patchMismatchWarnings.length ? 'Patch mismatch' : 'Patch aligned'}</NexusBadge>
                  </div>
                  <div className="text-xs text-zinc-400">Roles: {selectedFit.roleTags.join(', ') || 'none'}</div>
                  <div className="text-xs text-zinc-400">Capabilities: {selectedFit.capabilityTags.join(', ') || 'none'}</div>
                  <div className="space-y-1">
                    {selectedFit.validation.patchMismatchWarnings.map((warning) => <div key={warning} className="rounded border border-amber-900/50 bg-amber-950/25 px-2 py-1 text-[11px] text-amber-200">{warning}</div>)}
                    {selectedFit.validation.unknowns.map((unknown) => <div key={unknown} className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] text-zinc-400">{unknown}</div>)}
                  </div>
                  <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => updateFitProfile(selectedFit.id, { changedBy: actorId, changeSummary: 'Touched in workspace' }))}>Record Change Stamp</NexusButton>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {tabId === 'FORCE_DESIGN' ? (
          <div className="space-y-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 grid grid-cols-1 xl:grid-cols-4 gap-2">
              <select value={analysisMode} onChange={(event) => setAnalysisMode(event.target.value as AnalysisMode)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="OPERATION">Analyze Operation</option><option value="FIT_PROFILE">Analyze Fit Profile</option></select>
              <select value={selectedOpId} onChange={(event) => setSelectedOpId(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                <option value="">Select operation</option>{operations.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
              </select>
              <select value={selectedFitId} onChange={(event) => setSelectedFitId(event.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                <option value="">Select fit profile</option>{fits.map((fit) => <option key={fit.id} value={fit.id}>{fit.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <NexusBadge tone="active">{analysisMode === 'OPERATION' ? 'ROSTER' : 'FIT'}</NexusBadge>
                <NexusBadge tone={activeAnalysis ? bandTone(activeAnalysis.confidenceSummary.band) : 'neutral'}>{activeAnalysis ? activeAnalysis.confidenceSummary.band : 'N/A'}</NexusBadge>
                <NexusBadge tone={availabilityTone(forceAvailability)}>{availabilityLabel(forceAvailability)}</NexusBadge>
              </div>
            </section>
            {forceAvailability !== 'OK' ? (
              <div className="text-[11px] text-zinc-500">{availabilityCopy(forceAvailability)}</div>
            ) : null}

            {isAnalysisComputing ? (
              <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
                <div className="text-xs uppercase tracking-wide text-zinc-500">Computing force analysis...</div>
                <SkeletonText className="w-48" />
                <SkeletonBlock className="h-28" />
              </section>
            ) : !activeAnalysis ? (
              <DegradedStateCard state="OFFLINE" reason="Select an operation or fit profile to analyze." />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
                <section className="xl:col-span-7 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 overflow-auto">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Coverage Matrix</h4>
                  <div className="space-y-1.5">
                    {activeAnalysis.coverageMatrix.rows.map((row) => (
                      <div key={row.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 space-y-1">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="text-zinc-200 truncate">{row.label}</span>
                          <NexusBadge tone={statusTone(row.overallStatus)}>{row.matchedCount}/{row.requiredCount}</NexusBadge>
                        </div>
                        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, activeAnalysis.coverageMatrix.columns.length)}, minmax(0, 1fr))` }}>
                          {row.cells.map((cell) => <div key={`${row.id}:${cell.columnId}`} className={`rounded border px-1 py-0.5 text-[10px] text-center ${cardClass(cell.status)}`}>{cell.status}</div>)}
                        </div>
                      </div>
                    ))}
                    {activeAnalysis.coverageMatrix.rows.length === 0 ? <div className="text-xs text-zinc-500">No requirements available for coverage analysis.</div> : null}
                  </div>
                </section>

                <section className="xl:col-span-5 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Dependency Graph</h4>
                  <div className="rounded border border-zinc-800 bg-zinc-950/60 h-56">
                    <svg viewBox="0 0 320 220" className="w-full h-full">
                      {activeAnalysis.dependencyGraph.edges.map((edge) => {
                        const from = nodeById[edge.from];
                        const to = nodeById[edge.to];
                        if (!from || !to) return null;
                        return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(183,129,96,0.62)" strokeWidth={1.3} />;
                      })}
                      {dependencyNodeLayout.map((node) => (
                        <g key={node.id}>
                          <circle cx={node.x} cy={node.y} r={14} fill="rgba(91, 70, 58, 0.55)" stroke="rgba(186, 142, 112, 0.72)" strokeWidth={1.2} />
                          <text x={node.x} y={node.y + 3} textAnchor="middle" style={{ fill: 'rgba(235, 223, 211, 0.9)', fontSize: '9px' }}>{node.label.slice(0, 8)}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-auto pr-1">
                    {activeAnalysis.sustainmentHints.map((hint) => (
                      <div key={hint.label} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                        <div className="flex items-center justify-between gap-2"><span className="text-zinc-200">{hint.label}</span><NexusBadge tone={bandTone(hint.band)}>{hint.band}</NexusBadge></div>
                        <div className="text-zinc-500 mt-0.5">{hint.note}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="xl:col-span-12 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Gaps</h4>
                  <div className="space-y-1.5 max-h-36 overflow-auto pr-1">
                    {activeAnalysis.gaps.map((gap) => (
                      <div key={`${gap.kind}:${gap.message}`} className="rounded border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px]">
                        <div className="flex items-center justify-between gap-2"><span className="text-zinc-300">{gap.message}</span><NexusBadge tone={gap.severity === 'HIGH' ? 'danger' : gap.severity === 'MED' ? 'warning' : 'neutral'}>{gap.severity}</NexusBadge></div>
                      </div>
                    ))}
                    {activeAnalysis.gaps.length === 0 ? <div className="text-xs text-zinc-500">No significant force gaps detected in this snapshot.</div> : null}
                  </div>
                </section>
              </div>
            )}
          </div>
        ) : null}

        {tabId === 'SCENARIOS' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Scenario A</h4>
              <select value={compareLeftFitId} onChange={(event) => setCompareLeftFitId(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                <option value="">Select fit profile</option>{fits.map((fit) => <option key={fit.id} value={fit.id}>{fit.name}</option>)}
              </select>
              <div className="text-xs text-zinc-400">Confidence: {compareLeft?.confidenceSummary.band || 'N/A'}</div>
              <div className="text-xs text-zinc-400">Gaps: {compareLeft?.gaps.length || 0}</div>
            </section>
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Scenario B</h4>
              <select value={compareRightFitId} onChange={(event) => setCompareRightFitId(event.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                <option value="">Select fit profile</option>{fits.map((fit) => <option key={fit.id} value={fit.id}>{fit.name}</option>)}
              </select>
              <div className="text-xs text-zinc-400">Confidence: {compareRight?.confidenceSummary.band || 'N/A'}</div>
              <div className="text-xs text-zinc-400">Gaps: {compareRight?.gaps.length || 0}</div>
            </section>
          </div>
        ) : null}

        {tabId === 'NOTES' ? (
          <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Notes / Discussion (Stub)</h4>
            <textarea value={notesInput} onChange={(event) => setNotesInput(event.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder="Planning note" />
            <NexusButton size="sm" intent="primary" onClick={() => runAction(() => {
              if (!notesInput.trim()) return;
              setNotesLog((prev) => [{ id: `note-${Date.now()}`, at: new Date().toISOString(), body: notesInput.trim() }, ...prev]);
              setNotesInput('');
            })}>Add Note</NexusButton>
            <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
              {notesLog.map((entry) => <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]"><div className="text-zinc-300">{entry.body}</div><div className="text-zinc-500">{entry.at}</div></div>)}
              {notesLog.length === 0 ? <div className="text-xs text-zinc-500">No notes yet.</div> : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
