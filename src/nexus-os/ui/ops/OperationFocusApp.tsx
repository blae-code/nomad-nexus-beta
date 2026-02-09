import React, { useEffect, useMemo, useState } from 'react';
import { useRenderProfiler } from '../../diagnostics';
import { CommsTemplateRegistry, type CommsTemplateId } from '../../registries/commsTemplateRegistry';
import type { Operation, RequirementKind, RuleEnforcement } from '../../schemas/opSchemas';
import {
  applyCommsTemplate,
  getFocusOperationId,
  listOperationsForUser,
  setFocusOperation,
  setPosture,
  subscribeOperations,
  updateStatus,
} from '../../services/operationService';
import {
  challengeAssumption,
  createAssumption,
  createObjective,
  createPhase,
  createTask,
  listAssumptions,
  listDecisions,
  listObjectives,
  listPhases,
  listTasks,
  promoteCommentToDecision,
  subscribePlanning,
} from '../../services/planningService';
import {
  addAssetSlot,
  alignRSVPPolicyToPosture,
  computeRosterSummary,
  createCrewSeatRequests,
  getOrCreateRSVPPolicy,
  joinCrewSeat,
  listAssetSlots,
  listOpenCrewSeats,
  listRSVPEntries,
  listRSVPPolicies,
  subscribeRsvp,
  updateRSVPPolicy,
  upsertRSVPEntry,
} from '../../services/rsvpService';
import { addComment, listComments, subscribeOpThread } from '../../services/opThreadService';
import {
  attachFitProfileToAssetSlot,
  listFitProfiles,
  subscribeFitProfiles,
} from '../../services/fitProfileService';
import { getOperationTagAvailability } from '../../services/forceDesignService';
import {
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
} from '../state';
import type { CqbPanelSharedProps } from '../cqb/cqbTypes';
import { DegradedStateCard, NexusBadge, NexusButton } from '../primitives';
import OperationNarrativePanel from './OperationNarrativePanel';
import CoalitionOutreachPanel from './CoalitionOutreachPanel';

type TabId = 'PLAN' | 'ROSTER' | 'REQUIREMENTS' | 'COMMS' | 'NARRATIVE' | 'COALITION';

interface OperationFocusAppProps extends Partial<CqbPanelSharedProps> {
  actorId: string;
  onClose?: () => void;
}

const TABS: TabId[] = ['PLAN', 'ROSTER', 'REQUIREMENTS', 'COMMS', 'NARRATIVE', 'COALITION'];

function cycleStatus(status: Operation['status']): Operation['status'] {
  if (status === 'PLANNING') return 'ACTIVE';
  if (status === 'ACTIVE') return 'WRAPPING';
  if (status === 'WRAPPING') return 'ARCHIVED';
  return 'PLANNING';
}

function toneForStatus(status: Operation['status']): 'ok' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'ok';
  if (status === 'PLANNING') return 'warning';
  return 'neutral';
}

export default function OperationFocusApp({
  actorId,
  roster = [],
  onClose,
  onOpenForceDesign,
  onOpenReports,
}: OperationFocusAppProps) {
  useRenderProfiler('OperationFocusApp');
  const [opsVersion, setOpsVersion] = useState(0);
  const [planVersion, setPlanVersion] = useState(0);
  const [rsvpVersion, setRsvpVersion] = useState(0);
  const [fitVersion, setFitVersion] = useState(0);
  const [threadVersion, setThreadVersion] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [tabId, setTabId] = useState<TabId>('PLAN');
  const [selectedOpId, setSelectedOpId] = useState('');

  const [objectiveInput, setObjectiveInput] = useState('');
  const [phaseInput, setPhaseInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [assumptionInput, setAssumptionInput] = useState('');

  const [rsvpMode, setRsvpMode] = useState<'INDIVIDUAL' | 'ASSET'>('INDIVIDUAL');
  const [rsvpRole, setRsvpRole] = useState('Lead');
  const [rsvpNotes, setRsvpNotes] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetId, setAssetId] = useState('');
  const [crewProvided, setCrewProvided] = useState(1);
  const [seatRole, setSeatRole] = useState('Gunner');
  const [seatQty, setSeatQty] = useState(1);
  const [joinUserId, setJoinUserId] = useState('');

  const [ruleEnforcement, setRuleEnforcement] = useState<RuleEnforcement>('SOFT');
  const [ruleKind, setRuleKind] = useState<RequirementKind>('ROLE');
  const [ruleMessage, setRuleMessage] = useState('');
  const [rulePredicate, setRulePredicate] = useState('{"roleIn":["Lead","Medic"]}');

  const [threadBody, setThreadBody] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionCommentId, setDecisionCommentId] = useState('');

  useEffect(() => {
    const unsubOps = subscribeOperations(() => setOpsVersion((v) => v + 1));
    const unsubPlan = subscribePlanning(() => setPlanVersion((v) => v + 1));
    const unsubRsvp = subscribeRsvp(() => setRsvpVersion((v) => v + 1));
    const unsubFits = subscribeFitProfiles(() => setFitVersion((v) => v + 1));
    const unsubThread = subscribeOpThread(() => setThreadVersion((v) => v + 1));
    return () => {
      unsubOps();
      unsubPlan();
      unsubRsvp();
      unsubFits();
      unsubThread();
    };
  }, []);

  const operations = useMemo(() => listOperationsForUser({ userId: actorId, includeArchived: false }), [actorId, opsVersion]);
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);

  useEffect(() => {
    if (!joinUserId) setJoinUserId(roster[0]?.id || actorId);
  }, [joinUserId, roster, actorId]);

  useEffect(() => {
    if (!operations.length) {
      setSelectedOpId('');
      return;
    }
    if (selectedOpId && operations.some((op) => op.id === selectedOpId)) return;
    setSelectedOpId(focusOperationId || operations[0].id);
  }, [operations, selectedOpId, focusOperationId]);

  const selectedOp = useMemo(() => operations.find((op) => op.id === selectedOpId) || null, [operations, selectedOpId]);

  useEffect(() => {
    if (selectedOp) getOrCreateRSVPPolicy(selectedOp.id, selectedOp.posture);
  }, [selectedOp?.id, selectedOp?.posture]);

  const objectives = useMemo(() => (selectedOp ? listObjectives(selectedOp.id) : []), [selectedOp?.id, planVersion]);
  const phases = useMemo(() => (selectedOp ? listPhases(selectedOp.id) : []), [selectedOp?.id, planVersion]);
  const tasks = useMemo(() => (selectedOp ? listTasks(selectedOp.id) : []), [selectedOp?.id, planVersion]);
  const assumptions = useMemo(() => (selectedOp ? listAssumptions(selectedOp.id) : []), [selectedOp?.id, planVersion]);
  const decisions = useMemo(() => (selectedOp ? listDecisions(selectedOp.id) : []), [selectedOp?.id, planVersion]);

  const summary = useMemo(() => (selectedOp ? computeRosterSummary(selectedOp.id) : null), [selectedOp?.id, rsvpVersion]);
  const policy = useMemo(() => listRSVPPolicies().find((entry) => entry.opId === selectedOp?.id) || null, [selectedOp?.id, rsvpVersion]);
  const entries = useMemo(() => (selectedOp ? listRSVPEntries(selectedOp.id) : []), [selectedOp?.id, rsvpVersion]);
  const slots = useMemo(() => (selectedOp ? listAssetSlots(selectedOp.id) : []), [selectedOp?.id, rsvpVersion]);
  const openSeats = useMemo(() => (selectedOp ? listOpenCrewSeats(selectedOp.id) : []), [selectedOp?.id, rsvpVersion]);
  const fitProfiles = useMemo(() => listFitProfiles(), [fitVersion]);
  const tagAvailability = useMemo(
    () => (selectedOp ? getOperationTagAvailability(selectedOp.id) : { roleTags: [], capabilityTags: [] }),
    [selectedOp?.id, rsvpVersion, fitVersion]
  );

  const comments = useMemo(() => (selectedOp ? listComments(selectedOp.id) : []), [selectedOp?.id, threadVersion]);
  const rosterAvailability = resolveAvailabilityState({
    count: selectedOp ? entries.length : undefined,
    staleCount: (summary?.hardViolations || 0) + (summary?.softFlags || 0),
    hasConflict: (summary?.hardViolations || 0) > 0,
  });
  const requirementsAvailability = resolveAvailabilityState({
    count: selectedOp ? (policy?.rules.length || 0) : undefined,
    staleCount: (summary?.softFlags || 0) > 0 ? 1 : 0,
    hasConflict: (summary?.hardViolations || 0) > 0,
  });

  const runAction = (action: () => void) => {
    try {
      setErrorText('');
      action();
    } catch (error: any) {
      setErrorText(error?.message || 'Action failed');
    }
  };

  if (!selectedOp) {
    return (
      <div className="h-full min-h-0 flex flex-col gap-3">
        <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Operation Focus</h3>
            <p className="text-xs text-zinc-500">No operation available. Create one in Ops Strip.</p>
          </div>
          {onClose ? <NexusButton size="sm" intent="subtle" onClick={onClose}>Return</NexusButton> : null}
        </section>
        <DegradedStateCard state="LOCKED" reason="Operation context required." />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-100">Operation Focus</h3>
            <p className="text-xs text-zinc-500">Parallel ops supported. Focus op is foregrounded, others are dimmed.</p>
          </div>
          <div className="flex items-center gap-2">
            <NexusBadge tone={selectedOp.id === focusOperationId ? 'active' : 'neutral'}>{selectedOp.id === focusOperationId ? 'FOCUS OP' : 'BACKGROUND'}</NexusBadge>
            {onOpenReports ? <NexusButton size="sm" intent="subtle" onClick={() => onOpenReports(selectedOp.id)}>Reports</NexusButton> : null}
            {onClose ? <NexusButton size="sm" intent="subtle" onClick={onClose}>Return</NexusButton> : null}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-2">
          <select value={selectedOp.id} onChange={(e) => setSelectedOpId(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2">
            {operations.map((op) => <option key={op.id} value={op.id}>{op.name} ({op.posture}/{op.status})</option>)}
          </select>
          <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => setFocusOperation(actorId, selectedOp.id))}>Set Focus</NexusButton>
          <NexusButton
            size="sm"
            intent="subtle"
            onClick={() =>
              runAction(() => {
                const nextPosture = selectedOp.posture === 'FOCUSED' ? 'CASUAL' : 'FOCUSED';
                setPosture(selectedOp.id, nextPosture, actorId);
                alignRSVPPolicyToPosture(selectedOp.id, nextPosture);
              })
            }
          >
            Toggle Posture
          </NexusButton>
          <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => updateStatus(selectedOp.id, cycleStatus(selectedOp.status), actorId))}>Cycle Status</NexusButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1"><span className="text-zinc-500">Posture</span><div><NexusBadge tone={selectedOp.posture === 'FOCUSED' ? 'active' : 'warning'}>{selectedOp.posture}</NexusBadge></div></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1"><span className="text-zinc-500">Status</span><div><NexusBadge tone={toneForStatus(selectedOp.status)}>{selectedOp.status}</NexusBadge></div></div>
          <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-zinc-300">Open seats: {summary?.openSeats.reduce((n, s) => n + s.openQty, 0) || 0}</div>
          <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-zinc-300">Hard violations: {summary?.hardViolations || 0}</div>
        </div>

        {errorText ? <div className="rounded border border-red-900/60 bg-red-950/35 px-2 py-1 text-xs text-red-300">{errorText}</div> : null}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 flex items-center gap-2">
        {TABS.map((id) => <NexusButton key={id} size="sm" intent={tabId === id ? 'primary' : 'subtle'} onClick={() => setTabId(id)}>{id}</NexusButton>)}
      </section>

      <div className="flex-1 min-h-0 overflow-auto pr-1">
        {tabId === 'PLAN' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Objectives</h4>
              <div className="flex gap-2"><input value={objectiveInput} onChange={(e) => setObjectiveInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Objective" /><NexusButton size="sm" intent="primary" onClick={() => runAction(() => { if (!objectiveInput.trim()) return; createObjective({ opId: selectedOp.id, title: objectiveInput, priority: 'MED', status: 'OPEN', createdBy: actorId }); setObjectiveInput(''); })}>Add</NexusButton></div>
              <div className="space-y-1 max-h-44 overflow-auto pr-1">{objectives.map((item) => <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-300">{item.title}</div>)}</div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Phases + Tasks</h4>
              <div className="flex gap-2"><input value={phaseInput} onChange={(e) => setPhaseInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Phase" /><NexusButton size="sm" intent="subtle" onClick={() => runAction(() => { if (!phaseInput.trim()) return; createPhase({ opId: selectedOp.id, title: phaseInput, orderIndex: phases.length, status: 'OPEN' }); setPhaseInput(''); })}>Add Phase</NexusButton></div>
              <div className="flex gap-2"><input value={taskInput} onChange={(e) => setTaskInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Task" /><NexusButton size="sm" intent="subtle" onClick={() => runAction(() => { if (!taskInput.trim()) return; createTask({ opId: selectedOp.id, domain: 'COMMAND', title: taskInput, status: 'OPEN', createdBy: actorId }); setTaskInput(''); })}>Add Task</NexusButton></div>
              <div className="space-y-1 max-h-40 overflow-auto pr-1">{phases.map((item) => <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-300">Phase {item.orderIndex + 1}: {item.title}</div>)}{tasks.map((item) => <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950/45 px-2 py-1 text-[11px] text-zinc-400">Task: {item.title}</div>)}</div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 xl:col-span-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Assumptions</h4>
              <div className="flex gap-2"><input value={assumptionInput} onChange={(e) => setAssumptionInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Assumption" /><NexusButton size="sm" intent="primary" onClick={() => runAction(() => { if (!assumptionInput.trim()) return; createAssumption({ opId: selectedOp.id, statement: assumptionInput, confidence: 0.6, ttlProfileId: selectedOp.ttlProfileId, createdBy: actorId, status: 'ACTIVE' }); setAssumptionInput(''); })}>Add</NexusButton></div>
              <div className="space-y-1 max-h-44 overflow-auto pr-1">{assumptions.map((item) => <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] flex items-center justify-between gap-2"><span className="text-zinc-300 truncate">{item.statement}</span><NexusButton size="sm" intent="subtle" onClick={() => runAction(() => challengeAssumption(item.id, actorId))}>{item.status}</NexusButton></div>)}</div>
            </section>
          </div>
        ) : null}

        {tabId === 'ROSTER' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">RSVP</h4>
                <NexusBadge tone={availabilityTone(rosterAvailability)}>{availabilityLabel(rosterAvailability)}</NexusBadge>
              </div>
              {rosterAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(rosterAvailability)}</div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={rsvpMode} onChange={(e) => setRsvpMode(e.target.value as 'INDIVIDUAL' | 'ASSET')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="INDIVIDUAL">INDIVIDUAL</option><option value="ASSET">BRING A SHIP</option></select>
                <input value={rsvpRole} onChange={(e) => setRsvpRole(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Primary role" />
              </div>
              <textarea value={rsvpNotes} onChange={(e) => setRsvpNotes(e.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder="Notes (comms-ok)" />
              <input value={exceptionReason} onChange={(e) => setExceptionReason(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Exception reason for soft flags" />
              {rsvpMode === 'ASSET' ? (
                <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/55 p-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input value={assetName} onChange={(e) => setAssetName(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Ship name" /><input value={assetId} onChange={(e) => setAssetId(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Ship id" /></div>
                  <div className="grid grid-cols-3 gap-2"><input type="number" min={0} value={crewProvided} onChange={(e) => setCrewProvided(Number(e.target.value))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" /><input value={seatRole} onChange={(e) => setSeatRole(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Seat role" /><input type="number" min={1} value={seatQty} onChange={(e) => setSeatQty(Number(e.target.value))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" /></div>
                </div>
              ) : null}
              <NexusButton size="sm" intent="primary" onClick={() => runAction(() => {
                const entry = upsertRSVPEntry(selectedOp.id, { opId: selectedOp.id, userId: actorId, mode: rsvpMode, rolePrimary: rsvpRole || 'Member', notes: rsvpNotes, exceptionReason: exceptionReason || undefined });
                if (rsvpMode === 'ASSET') {
                  const slot = addAssetSlot({ opId: selectedOp.id, rsvpEntryId: entry.id, assetId: assetId || `asset-${Date.now()}`, assetName: assetName || 'Unnamed Asset', capabilitySnapshot: { tags: ['combat'] }, crewProvided: crewProvided || 0 });
                  createCrewSeatRequests(slot.id, [{ roleNeeded: seatRole || 'Crew', qty: Math.max(1, seatQty || 1) }]);
                }
              })}>Submit RSVP</NexusButton>
              <div className="text-[11px] text-zinc-400">Entries: {entries.length} | Assets: {slots.length} | Open seats: {summary?.openSeats.reduce((n, s) => n + s.openQty, 0) || 0}</div>
              {onOpenForceDesign ? (
                <NexusButton size="sm" intent="subtle" onClick={() => onOpenForceDesign(selectedOp.id)}>
                  Force Coverage
                </NexusButton>
              ) : null}
              {onOpenReports ? (
                <NexusButton size="sm" intent="subtle" onClick={() => onOpenReports(selectedOp.id)}>
                  Op Reports
                </NexusButton>
              ) : null}
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Crew Seat Marketplace</h4>
              <select value={joinUserId} onChange={(e) => setJoinUserId(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                {[actorId, ...roster.map((m) => m.id)].filter((v, i, arr) => arr.indexOf(v) === i).map((userId) => <option key={userId} value={userId}>{userId}</option>)}
              </select>
              <div className="space-y-1.5 max-h-56 overflow-auto pr-1">
                {openSeats.map((entry) => (
                  <div key={`${entry.assetSlot.id}:${entry.request.id}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                    <div className="text-zinc-300">{entry.assetSlot.assetName} - {entry.request.roleNeeded}</div>
                    <div className="text-zinc-500">open {entry.openQty}</div>
                    <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => joinCrewSeat(entry.assetSlot.id, joinUserId || actorId, entry.request.roleNeeded))}>Join Seat</NexusButton>
                  </div>
                ))}
                {openSeats.length === 0 ? <div className="text-xs text-zinc-500">No open seats.</div> : null}
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Asset Fit Linkage</h4>
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {slots.map((slot) => {
                  const selectedFit = fitProfiles.find((fit) => fit.id === slot.fitProfileId) || null;
                  return (
                    <div key={slot.id} className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1.5 text-[11px]">
                      <div className="text-zinc-200">{slot.assetName}</div>
                      <div className="text-zinc-500 truncate">{slot.assetId}</div>
                      <select
                        value={slot.fitProfileId || ''}
                        onChange={(e) =>
                          runAction(() => {
                            const fitId = e.target.value;
                            if (!fitId) return;
                            attachFitProfileToAssetSlot(selectedOp.id, slot.id, fitId, Date.now());
                          })
                        }
                        className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                      >
                        <option value="">Attach FitProfile</option>
                        {fitProfiles.map((fit) => <option key={fit.id} value={fit.id}>{fit.name}</option>)}
                      </select>
                      <div className="text-zinc-400">tags: {(slot.capabilitySnapshot.tags || []).join(', ') || 'none'}</div>
                      {selectedFit?.validation.patchMismatchWarnings.map((warning) => (
                        <div key={warning} className="rounded border border-amber-900/50 bg-amber-950/25 px-2 py-1 text-[10px] text-amber-200">{warning}</div>
                      ))}
                      {selectedFit?.validation.unknowns.slice(0, 2).map((unknown) => (
                        <div key={unknown} className="rounded border border-zinc-800 bg-zinc-900/65 px-2 py-1 text-[10px] text-zinc-500">{unknown}</div>
                      ))}
                    </div>
                  );
                })}
                {slots.length === 0 ? <div className="text-xs text-zinc-500">No asset RSVP slots yet.</div> : null}
              </div>
            </section>
          </div>
        ) : null}

        {tabId === 'REQUIREMENTS' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Policy Editor</h4>
                <NexusBadge tone={availabilityTone(requirementsAvailability)}>{availabilityLabel(requirementsAvailability)}</NexusBadge>
              </div>
              {requirementsAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(requirementsAvailability)}</div>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                <select value={ruleEnforcement} onChange={(e) => setRuleEnforcement(e.target.value as RuleEnforcement)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="HARD">HARD</option><option value="SOFT">SOFT</option><option value="ADVISORY">ADVISORY</option></select>
                <select value={ruleKind} onChange={(e) => setRuleKind(e.target.value as RequirementKind)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="ROLE">ROLE</option><option value="ASSET">ASSET</option><option value="CAPABILITY">CAPABILITY</option><option value="COMPOSITION">COMPOSITION</option><option value="READINESS">READINESS</option><option value="COMMS">COMMS</option></select>
              </div>
              <input value={ruleMessage} onChange={(e) => setRuleMessage(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Rule message" />
              <textarea value={rulePredicate} onChange={(e) => setRulePredicate(e.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder='Predicate JSON' />
              <NexusButton size="sm" intent="primary" onClick={() => runAction(() => {
                const current = policy || getOrCreateRSVPPolicy(selectedOp.id, selectedOp.posture);
                let parsed = {};
                try { parsed = JSON.parse(rulePredicate || '{}'); } catch { parsed = {}; }
                updateRSVPPolicy(selectedOp.id, [...current.rules, { id: `rule_${Date.now()}`, enforcement: ruleEnforcement, kind: ruleKind, predicate: parsed, message: ruleMessage || 'Custom rule' }]);
              })}>Add Rule</NexusButton>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Active Rules</h4>
              <div className="space-y-1.5 max-h-64 overflow-auto pr-1">
                {(policy?.rules || []).map((rule) => (
                  <div key={rule.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] space-y-1">
                    <div className="flex items-center justify-between gap-2"><NexusBadge tone={rule.enforcement === 'HARD' ? 'danger' : rule.enforcement === 'SOFT' ? 'warning' : 'neutral'}>{rule.enforcement}</NexusBadge><NexusButton size="sm" intent="subtle" onClick={() => runAction(() => updateRSVPPolicy(selectedOp.id, (policy?.rules || []).filter((r) => r.id !== rule.id)))}>Remove</NexusButton></div>
                    <div className="text-zinc-300">{rule.kind}</div>
                    <div className="text-zinc-500">{rule.message}</div>
                  </div>
                ))}
                {!policy || policy.rules.length === 0 ? <div className="text-xs text-zinc-500">No rules configured.</div> : null}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400">Available Tags</div>
                <div className="text-[11px] text-zinc-500">
                  Roles: {tagAvailability.roleTags.slice(0, 6).map((entry) => `${entry.tag}(${entry.count})`).join(', ') || 'none'}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Caps: {tagAvailability.capabilityTags.slice(0, 6).map((entry) => `${entry.tag}(${entry.count})`).join(', ') || 'none'}
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {tabId === 'COMMS' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Comms Discipline</h4>
              <select value={selectedOp.commsTemplateId} onChange={(e) => runAction(() => applyCommsTemplate(selectedOp.id, e.target.value as CommsTemplateId, actorId))} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                {(Object.keys(CommsTemplateRegistry) as CommsTemplateId[]).map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] text-zinc-400 space-y-1">
                <div>Template: {selectedOp.commsTemplateId}</div>
                <div>Channels: {CommsTemplateRegistry[selectedOp.commsTemplateId]?.channels.length || 0}</div>
                <div>Foregrounding: {selectedOp.id === focusOperationId ? 'Focus Op emphasized' : 'Background Op dimmed'}</div>
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Op Thread + Decisions</h4>
              <textarea value={threadBody} onChange={(e) => setThreadBody(e.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder="Scoped op comment" />
              <NexusButton size="sm" intent="primary" onClick={() => runAction(() => { if (!threadBody.trim()) return; addComment({ opId: selectedOp.id, by: actorId, body: threadBody }); setThreadBody(''); })}>Post</NexusButton>
              <div className="space-y-1 max-h-36 overflow-auto pr-1">
                {comments.map((entry) => <button key={entry.id} type="button" onClick={() => setDecisionCommentId(entry.id)} className={`w-full text-left rounded border px-2 py-1 text-[11px] ${decisionCommentId === entry.id ? 'border-orange-500/70 bg-zinc-900/75' : 'border-zinc-800 bg-zinc-950/55'}`}><div className="text-zinc-200 truncate">{entry.body}</div><div className="text-zinc-500">{entry.by}</div></button>)}
              </div>
              <div className="flex gap-2"><input value={decisionTitle} onChange={(e) => setDecisionTitle(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Decision title" /><NexusButton size="sm" intent="subtle" onClick={() => runAction(() => { if (!decisionCommentId || !decisionTitle.trim()) return; promoteCommentToDecision({ opId: selectedOp.id, sourceCommentId: decisionCommentId, title: decisionTitle, createdBy: actorId }); setDecisionTitle(''); setDecisionCommentId(''); })}>Promote</NexusButton></div>
              <div className="space-y-1 max-h-24 overflow-auto pr-1">{decisions.map((d) => <div key={d.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-300">{d.title}</div>)}</div>
            </section>
          </div>
        ) : null}

        {tabId === 'NARRATIVE' ? (
          <OperationNarrativePanel op={selectedOp} actorId={actorId} />
        ) : null}

        {tabId === 'COALITION' ? (
          <CoalitionOutreachPanel op={selectedOp} actorId={actorId} />
        ) : null}
      </div>
    </div>
  );
}
