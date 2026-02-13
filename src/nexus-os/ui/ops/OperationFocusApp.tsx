import React, { useEffect, useMemo, useState } from 'react';
import { useRenderProfiler } from '../../diagnostics';
import { CommsTemplateRegistry, type CommsTemplateId } from '../../registries/commsTemplateRegistry';
import type { Operation, RequirementKind, RuleEnforcement } from '../../schemas/opSchemas';
import type { DoctrineLevel, MandateEnforcement } from '../../services/operationEnhancementService';
import {
  applyCommsTemplate,
  canManageOperation,
  cloneOperation,
  createOperationTemplateFromOperation,
  getFocusOperationId,
  listOperationAuditEvents,
  listOperationEvents,
  listOperationsForUser,
  setFocusOperation,
  setPosture,
  subscribeOperations,
  updateOperation,
  updateStatus,
} from '../../services/operationService';
import type { DataClassification } from '../../schemas/crossOrgSchemas';
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
  withdrawRSVPEntry,
} from '../../services/rsvpService';
import {
  alignOperationEnhancementsToPosture,
  buildSeatDemands,
  computeOperationCandidateMatches,
  createDoctrineDefinition,
  deleteDoctrineDefinition,
  getOperationDoctrineProfile,
  getOperationMandateProfile,
  initializeOperationEnhancements,
  listDoctrineLibrary,
  listOperationLeadAlerts,
  refreshOperationLeadAlerts,
  removeAssetMandate,
  removeLoadoutMandate,
  removeRoleMandate,
  setDoctrineSelection,
  subscribeOperationEnhancements,
  summarizeDoctrineImpact,
  updateDoctrineDefinition,
  upsertAssetMandate,
  upsertLoadoutMandate,
  upsertRoleMandate,
  upsertUserOperationPreference,
} from '../../services/operationEnhancementService';
import {
  addComment,
  listComments,
  listThreadSummaries,
  markThreadRead,
  subscribeOpThread,
} from '../../services/opThreadService';
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
import { deriveOperationStagePolicy } from './stagePolicy';

type TabId = 'PLAN' | 'ROSTER' | 'REQUIREMENTS' | 'DOCTRINE' | 'COMMS' | 'TIMELINE' | 'NARRATIVE' | 'COALITION';
type TimelineSource = 'AUDIT' | 'DECISION' | 'EVENT';
type TimelineFilter = 'ALL' | TimelineSource;
type TimelineSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

interface TimelineEntry {
  id: string;
  source: TimelineSource;
  kind: string;
  summary: string;
  actor?: string;
  createdAt: string;
  severity: TimelineSeverity;
}

interface OperationFocusAppProps extends Partial<CqbPanelSharedProps> {
  actorId: string;
  onClose?: () => void;
}

const TABS: TabId[] = ['PLAN', 'ROSTER', 'REQUIREMENTS', 'DOCTRINE', 'COMMS', 'TIMELINE', 'NARRATIVE', 'COALITION'];
const TIMELINE_FILTERS: TimelineFilter[] = ['ALL', 'AUDIT', 'DECISION', 'EVENT'];
const DEFAULT_PAGE_SIZE = 6;

interface PagedItems<T> {
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageCount: number;
  visibleItems: T[];
}

function usePagedItems<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE): PagedItems<T> {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount - 1));
  }, [pageCount]);

  const visibleItems = useMemo(
    () => items.slice(page * pageSize, page * pageSize + pageSize),
    [items, page, pageSize]
  );

  return { page, setPage, pageCount, visibleItems };
}

function PaginationControls({
  page,
  pageCount,
  setPage,
  className = '',
}: {
  page: number;
  pageCount: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`.trim()}>
      <NexusButton size="sm" intent="subtle" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0}>
        Prev
      </NexusButton>
      <NexusBadge tone="neutral">
        {page + 1}/{pageCount}
      </NexusBadge>
      <NexusButton
        size="sm"
        intent="subtle"
        onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
        disabled={page >= pageCount - 1}
      >
        Next
      </NexusButton>
    </div>
  );
}

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

function parseTokenList(value: string): string[] {
  return [...new Set(String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean))];
}

function deriveTimelineSeverity(source: TimelineSource, kind: string, summary: string): TimelineSeverity {
  const signal = `${kind} ${summary}`.toUpperCase();
  if (source === 'DECISION') return 'HIGH';
  if (/(CRITICAL|ERROR|FAILED|FAIL|BLOCK|DENY|REJECT)/.test(signal)) return 'HIGH';
  if (/(STATUS|POSTURE|ARCHIVED|WRAPPING|TEMPLATE|CLONED|WARN)/.test(signal)) return 'MEDIUM';
  return 'LOW';
}

function toneForTimelineSeverity(severity: TimelineSeverity): 'ok' | 'active' | 'danger' {
  if (severity === 'HIGH') return 'danger';
  if (severity === 'MEDIUM') return 'active';
  return 'ok';
}

function classesForTimelineSeverity(severity: TimelineSeverity): string {
  if (severity === 'HIGH') return 'border-red-800/70 bg-red-950/20';
  if (severity === 'MEDIUM') return 'border-sky-800/60 bg-sky-950/20';
  return 'border-zinc-800 bg-zinc-950/55';
}

function toneForTimelineSource(source: TimelineSource): 'neutral' | 'active' | 'ok' {
  if (source === 'DECISION') return 'active';
  if (source === 'EVENT') return 'ok';
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
  const [enhancementVersion, setEnhancementVersion] = useState(0);
  const [errorText, setErrorText] = useState('');
  const [tabId, setTabId] = useState<TabId>('PLAN');
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('ALL');
  const [statusCapsuleOpen, setStatusCapsuleOpen] = useState(false);
  const [commandCapsuleOpen, setCommandCapsuleOpen] = useState(false);
  const [auditCapsuleOpen, setAuditCapsuleOpen] = useState(false);
  const [selectedOpId, setSelectedOpId] = useState('');
  const [metadataNameInput, setMetadataNameInput] = useState('');
  const [metadataAoNodeInput, setMetadataAoNodeInput] = useState('');
  const [metadataAoNoteInput, setMetadataAoNoteInput] = useState('');
  const [metadataClassificationInput, setMetadataClassificationInput] = useState<DataClassification>('INTERNAL');
  const [focusTemplateNameInput, setFocusTemplateNameInput] = useState('');
  const [focusTemplateDescriptionInput, setFocusTemplateDescriptionInput] = useState('');

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
  const [doctrineLevel, setDoctrineLevel] = useState<DoctrineLevel>('INDIVIDUAL');
  const [editingDoctrineId, setEditingDoctrineId] = useState('');
  const [doctrineLabelInput, setDoctrineLabelInput] = useState('');
  const [doctrineDescriptionInput, setDoctrineDescriptionInput] = useState('');
  const [doctrineModifierInput, setDoctrineModifierInput] = useState('');
  const [doctrineCasualWeightInput, setDoctrineCasualWeightInput] = useState(0.7);
  const [doctrineFocusedWeightInput, setDoctrineFocusedWeightInput] = useState(0.9);
  const [doctrineCasualEnabledInput, setDoctrineCasualEnabledInput] = useState(true);
  const [doctrineFocusedEnabledInput, setDoctrineFocusedEnabledInput] = useState(true);
  const [roleMandateRole, setRoleMandateRole] = useState('Gunner');
  const [roleMandateMin, setRoleMandateMin] = useState(1);
  const [roleMandateEnforcement, setRoleMandateEnforcement] = useState<MandateEnforcement>('SOFT');
  const [roleMandateRequiredTags, setRoleMandateRequiredTags] = useState('ship-combat,comms');
  const [loadoutMandateLabel, setLoadoutMandateLabel] = useState('Turret Ops Baseline');
  const [loadoutMandateTagsAny, setLoadoutMandateTagsAny] = useState('ship-combat,turret');
  const [loadoutMandateRoles, setLoadoutMandateRoles] = useState('Gunner');
  const [loadoutMandateEnforcement, setLoadoutMandateEnforcement] = useState<MandateEnforcement>('SOFT');
  const [assetMandateTag, setAssetMandateTag] = useState('combat');
  const [assetMandateMin, setAssetMandateMin] = useState(1);
  const [assetMandateEnforcement, setAssetMandateEnforcement] = useState<MandateEnforcement>('SOFT');
  const [preferenceUserId, setPreferenceUserId] = useState('');
  const [preferenceRoles, setPreferenceRoles] = useState('Gunner,Pilot');
  const [preferenceActivities, setPreferenceActivities] = useState('ship-combat,turret');
  const [preferencePosture, setPreferencePosture] = useState<Operation['posture'] | 'ANY'>('ANY');
  const [preferenceNotifyOptIn, setPreferenceNotifyOptIn] = useState(true);

  const [threadBody, setThreadBody] = useState('');
  const [threadParentId, setThreadParentId] = useState('');
  const [selectedThreadRootId, setSelectedThreadRootId] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [decisionCommentId, setDecisionCommentId] = useState('');

  useEffect(() => {
    const unsubOps = subscribeOperations(() => setOpsVersion((v) => v + 1));
    const unsubPlan = subscribePlanning(() => setPlanVersion((v) => v + 1));
    const unsubRsvp = subscribeRsvp(() => setRsvpVersion((v) => v + 1));
    const unsubFits = subscribeFitProfiles(() => setFitVersion((v) => v + 1));
    const unsubThread = subscribeOpThread(() => setThreadVersion((v) => v + 1));
    const unsubEnhancements = subscribeOperationEnhancements(() => setEnhancementVersion((v) => v + 1));
    return () => {
      unsubOps();
      unsubPlan();
      unsubRsvp();
      unsubFits();
      unsubThread();
      unsubEnhancements();
    };
  }, []);

  const operations = useMemo(() => listOperationsForUser({ userId: actorId, includeArchived: false }), [actorId, opsVersion]);
  const focusOperationId = useMemo(() => getFocusOperationId(actorId), [actorId, opsVersion]);

  useEffect(() => {
    if (!joinUserId) setJoinUserId(roster[0]?.id || actorId);
  }, [joinUserId, roster, actorId]);

  useEffect(() => {
    if (!preferenceUserId) setPreferenceUserId(actorId);
  }, [preferenceUserId, actorId]);

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
    setStatusCapsuleOpen(false);
    setCommandCapsuleOpen(false);
    setAuditCapsuleOpen(false);
  }, [selectedOp?.id]);
  useEffect(() => {
    setTimelineFilter('ALL');
  }, [selectedOp?.id]);
  const commandPermission = useMemo(() => {
    if (!selectedOp) return { allowed: false, reason: 'No operation selected.' };
    return canManageOperation(selectedOp.id, actorId);
  }, [selectedOp?.id, actorId, opsVersion]);

  useEffect(() => {
    if (!selectedOp) return;
    setMetadataNameInput(selectedOp.name || '');
    setMetadataAoNodeInput(selectedOp.ao?.nodeId || '');
    setMetadataAoNoteInput(selectedOp.ao?.note || '');
    setMetadataClassificationInput(selectedOp.classification || 'INTERNAL');
    setFocusTemplateNameInput(`${selectedOp.name} Template`);
    setFocusTemplateDescriptionInput(`Template saved from ${selectedOp.name}.`);
  }, [selectedOp?.id, selectedOp?.name, selectedOp?.ao?.nodeId, selectedOp?.ao?.note, selectedOp?.classification]);

  useEffect(() => {
    if (!selectedOp) return;
    getOrCreateRSVPPolicy(selectedOp.id, selectedOp.posture);
    initializeOperationEnhancements(selectedOp.id, selectedOp.posture, actorId);
  }, [selectedOp?.id, selectedOp?.posture, actorId]);

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
  const doctrineProfile = useMemo(
    () => (selectedOp ? getOperationDoctrineProfile(selectedOp.id) : null),
    [selectedOp?.id, enhancementVersion]
  );
  const mandateProfile = useMemo(
    () => (selectedOp ? getOperationMandateProfile(selectedOp.id) : null),
    [selectedOp?.id, enhancementVersion]
  );
  const doctrineImpactSummary = useMemo(
    () => (selectedOp ? summarizeDoctrineImpact(selectedOp.id) : []),
    [selectedOp?.id, enhancementVersion]
  );
  const leadAlerts = useMemo(
    () => (selectedOp ? listOperationLeadAlerts(selectedOp.id) : []),
    [selectedOp?.id, enhancementVersion]
  );
  const doctrineCatalogByLevel = useMemo(() => {
    const grouped: Record<DoctrineLevel, ReturnType<typeof listDoctrineLibrary>> = {
      INDIVIDUAL: [],
      SQUAD: [],
      WING: [],
      FLEET: [],
    };
    for (const doctrine of listDoctrineLibrary()) grouped[doctrine.level].push(doctrine);
    return grouped;
  }, [enhancementVersion]);
  const candidatePool = useMemo(() => {
    const rosterPool = roster.map((member) => ({
      userId: member.id,
      callsign: member.callsign,
      role: member.role,
      element: member.element,
      loadoutTags: [member.role, member.element, 'comms'].filter(Boolean),
      activityTags: [member.role, member.element].filter(Boolean),
      availability: 'READY' as const,
    }));
    const entryPool = entries.map((entry) => ({
      userId: entry.userId,
      role: entry.rolePrimary,
      loadoutTags: [entry.rolePrimary, ...(entry.roleSecondary || []), 'comms'],
      activityTags: [entry.rolePrimary, ...(entry.roleSecondary || [])],
      availability: entry.status === 'WITHDRAWN' ? ('OFFLINE' as const) : ('READY' as const),
    }));
    const merged = [...rosterPool, ...entryPool];
    const byUser = new Map<string, typeof merged[number]>();
    for (const candidate of merged) {
      const current = byUser.get(candidate.userId);
      if (!current) {
        byUser.set(candidate.userId, candidate);
        continue;
      }
      byUser.set(candidate.userId, {
        ...current,
        role: current.role || candidate.role,
        loadoutTags: [...new Set([...(current.loadoutTags || []), ...(candidate.loadoutTags || [])])],
        activityTags: [...new Set([...(current.activityTags || []), ...(candidate.activityTags || [])])],
      });
    }
    return Array.from(byUser.values());
  }, [entries, roster]);
  const seatDemands = useMemo(
    () =>
      buildSeatDemands({
        openSeats: openSeats.map((entry) => ({ roleNeeded: entry.request.roleNeeded, openQty: entry.openQty })),
        mandates: mandateProfile,
      }),
    [openSeats, mandateProfile?.updatedAt]
  );
  const candidateMatches = useMemo(() => {
    if (!selectedOp) return [];
    if (seatDemands.length === 0) return [];
    return computeOperationCandidateMatches({
      opId: selectedOp.id,
      posture: selectedOp.posture,
      candidates: candidatePool,
      demands: seatDemands,
    }).slice(0, 16);
  }, [selectedOp?.id, selectedOp?.posture, candidatePool, seatDemands, enhancementVersion]);
  const fitProfiles = useMemo(() => listFitProfiles(), [fitVersion]);
  const tagAvailability = useMemo(
    () => (selectedOp ? getOperationTagAvailability(selectedOp.id) : { roleTags: [], capabilityTags: [] }),
    [selectedOp?.id, rsvpVersion, fitVersion]
  );

  const comments = useMemo(() => (selectedOp ? listComments(selectedOp.id) : []), [selectedOp?.id, threadVersion]);
  const auditEvents = useMemo(
    () => (selectedOp ? listOperationAuditEvents(selectedOp.id, 10) : []),
    [selectedOp?.id, opsVersion]
  );
  const opEvents = useMemo(
    () => (selectedOp ? listOperationEvents(selectedOp.id).slice(0, 20) : []),
    [selectedOp?.id, opsVersion]
  );
  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const decisionItems = decisions.map((entry) => ({
      id: `decision:${entry.id}`,
      source: 'DECISION' as const,
      kind: 'DECISION',
      summary: entry.title,
      actor: entry.createdBy,
      createdAt: entry.createdAt,
      severity: deriveTimelineSeverity('DECISION', 'DECISION', entry.title),
    }));
    const auditItems = auditEvents.map((entry) => ({
      id: `audit:${entry.id}`,
      source: 'AUDIT' as const,
      kind: entry.action,
      summary: entry.summary,
      actor: entry.actorId,
      createdAt: entry.createdAt,
      severity: deriveTimelineSeverity('AUDIT', entry.action, entry.summary),
    }));
    const eventItems = opEvents.map((entry) => ({
      id: `event:${entry.id}`,
      source: 'EVENT' as const,
      kind: `EVENT:${entry.kind}`,
      summary: (() => {
        const payloadSummary = JSON.stringify(entry.payload || {});
        return payloadSummary === '{}' ? entry.kind : payloadSummary.slice(0, 120);
      })(),
      actor: entry.createdBy,
      createdAt: entry.createdAt,
      severity: deriveTimelineSeverity('EVENT', entry.kind, JSON.stringify(entry.payload || {})),
    }));
    return [...auditItems, ...decisionItems, ...eventItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);
  }, [auditEvents, decisions, opEvents]);
  const timelineCounts = useMemo<Record<TimelineFilter, number>>(() => {
    const counts: Record<TimelineFilter, number> = { ALL: timelineEntries.length, AUDIT: 0, DECISION: 0, EVENT: 0 };
    for (const entry of timelineEntries) counts[entry.source] += 1;
    return counts;
  }, [timelineEntries]);
  const filteredTimelineEntries = useMemo(
    () => (timelineFilter === 'ALL' ? timelineEntries : timelineEntries.filter((entry) => entry.source === timelineFilter)),
    [timelineEntries, timelineFilter]
  );
  const timelineHighSeverityCount = useMemo(
    () => timelineEntries.filter((entry) => entry.severity === 'HIGH').length,
    [timelineEntries]
  );
  const threadSummaries = useMemo(
    () => (selectedOp ? listThreadSummaries(selectedOp.id, actorId) : []),
    [selectedOp?.id, actorId, threadVersion]
  );
  const phaseTaskRows = useMemo(
    () => [
      ...phases.map((item) => ({ id: `phase:${item.id}`, kind: 'PHASE' as const, label: `Phase ${item.orderIndex + 1}: ${item.title}` })),
      ...tasks.map((item) => ({ id: `task:${item.id}`, kind: 'TASK' as const, label: `Task: ${item.title}` })),
    ],
    [phases, tasks]
  );
  const mandateRows = useMemo(
    () => [
      ...(mandateProfile?.roleMandates || []).map((mandate) => ({ id: mandate.id, kind: 'ROLE' as const, mandate })),
      ...(mandateProfile?.loadoutMandates || []).map((mandate) => ({ id: mandate.id, kind: 'LOADOUT' as const, mandate })),
      ...(mandateProfile?.assetMandates || []).map((mandate) => ({ id: mandate.id, kind: 'ASSET' as const, mandate })),
    ],
    [mandateProfile]
  );
  const stagePolicy = selectedOp ? deriveOperationStagePolicy(selectedOp, actorId) : null;
  const planningLocked = stagePolicy ? !stagePolicy.canEditPlan : true;
  const requirementsLocked = stagePolicy ? !stagePolicy.canEditRequirements : true;
  const rosterLocked = stagePolicy ? !stagePolicy.canManageRoster : true;
  const commsLocked = stagePolicy ? !stagePolicy.canPostComms : true;
  const doctrineRegistryLocked = stagePolicy ? !stagePolicy.isCommandRole : true;
  const commandLocked = !commandPermission.allowed || !stagePolicy?.canChangeLifecycle;
  const actorEntry = entries.find((entry) => entry.userId === actorId && entry.status !== 'WITHDRAWN') || null;
  const activeThreadSummary =
    threadSummaries.find((entry) => entry.root.id === selectedThreadRootId) || threadSummaries[0] || null;
  const activeThreadComments = activeThreadSummary
    ? [activeThreadSummary.root, ...activeThreadSummary.replies]
    : comments;
  const pagedAuditEvents = usePagedItems(auditEvents, 4);
  const pagedObjectives = usePagedItems(objectives, 5);
  const pagedPhaseTaskRows = usePagedItems(phaseTaskRows, 6);
  const pagedAssumptions = usePagedItems(assumptions, 6);
  const pagedOpenSeats = usePagedItems(openSeats, 4);
  const pagedLeadAlerts = usePagedItems(leadAlerts, 4);
  const pagedAssetSlots = usePagedItems(slots, 4);
  const pagedRules = usePagedItems(policy?.rules || [], 6);
  const pagedDoctrine = usePagedItems(doctrineCatalogByLevel[doctrineLevel] || [], 5);
  const pagedMandates = usePagedItems(mandateRows, 6);
  const pagedThreadSummaries = usePagedItems(threadSummaries, 4);
  const pagedThreadComments = usePagedItems(activeThreadComments, 5);
  const pagedDecisions = usePagedItems(decisions, 4);
  const pagedTimelineEntries = usePagedItems(filteredTimelineEntries, 7);

  useEffect(() => {
    if (!threadSummaries.length) {
      setSelectedThreadRootId('');
      return;
    }
    if (selectedThreadRootId && threadSummaries.some((entry) => entry.root.id === selectedThreadRootId)) return;
    setSelectedThreadRootId(threadSummaries[0].root.id);
  }, [threadSummaries, selectedThreadRootId]);

  useEffect(() => {
    if (!selectedOp) return;
    if (seatDemands.length === 0 || candidatePool.length === 0) return;
    refreshOperationLeadAlerts({
      opId: selectedOp.id,
      posture: selectedOp.posture,
      candidates: candidatePool,
      demands: seatDemands,
    });
  }, [selectedOp?.id, selectedOp?.posture, seatDemands, candidatePool, mandateProfile?.updatedAt]);

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

  const clearDoctrineDraft = () => {
    setEditingDoctrineId('');
    setDoctrineLabelInput('');
    setDoctrineDescriptionInput('');
    setDoctrineModifierInput('');
    setDoctrineCasualWeightInput(0.7);
    setDoctrineFocusedWeightInput(0.9);
    setDoctrineCasualEnabledInput(true);
    setDoctrineFocusedEnabledInput(true);
  };

  const loadDoctrineDraft = (doctrineId: string) => {
    const doctrine = listDoctrineLibrary().find((entry) => entry.id === doctrineId);
    if (!doctrine) return;
    setEditingDoctrineId(doctrine.id);
    setDoctrineLevel(doctrine.level);
    setDoctrineLabelInput(doctrine.label || '');
    setDoctrineDescriptionInput(doctrine.description || '');
    setDoctrineModifierInput(doctrine.modifierText || '');
    setDoctrineCasualWeightInput(
      typeof doctrine.defaultCasualWeight === 'number' ? doctrine.defaultCasualWeight : 0.7
    );
    setDoctrineFocusedWeightInput(
      typeof doctrine.defaultFocusedWeight === 'number' ? doctrine.defaultFocusedWeight : 0.9
    );
    setDoctrineCasualEnabledInput(
      typeof doctrine.defaultCasualEnabled === 'boolean' ? doctrine.defaultCasualEnabled : true
    );
    setDoctrineFocusedEnabledInput(
      typeof doctrine.defaultFocusedEnabled === 'boolean' ? doctrine.defaultFocusedEnabled : true
    );
  };

  const saveDoctrineDraft = () => {
    if (!selectedOp) return;
    const payload = {
      level: doctrineLevel,
      label: doctrineLabelInput || 'Untitled Doctrine',
      description: doctrineDescriptionInput,
      modifierText: doctrineModifierInput,
      defaultCasualWeight: doctrineCasualWeightInput,
      defaultFocusedWeight: doctrineFocusedWeightInput,
      defaultCasualEnabled: doctrineCasualEnabledInput,
      defaultFocusedEnabled: doctrineFocusedEnabledInput,
    };
    if (editingDoctrineId) {
      updateDoctrineDefinition(selectedOp.id, actorId, editingDoctrineId, payload);
    } else {
      createDoctrineDefinition(selectedOp.id, actorId, payload);
    }
    clearDoctrineDraft();
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
      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-3 py-2.5 space-y-2 nexus-terminal-panel">
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

        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedOp.id} onChange={(e) => setSelectedOpId(e.target.value)} className="h-8 min-w-[15rem] rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
            {operations.map((op) => <option key={op.id} value={op.id}>{op.name} ({op.posture}/{op.status})</option>)}
          </select>
          <NexusBadge tone={selectedOp.posture === 'FOCUSED' ? 'active' : 'warning'}>{selectedOp.posture}</NexusBadge>
          <NexusBadge tone={toneForStatus(selectedOp.status)}>{selectedOp.status}</NexusBadge>
          <NexusBadge tone={(summary?.hardViolations || 0) > 0 ? 'warning' : 'neutral'}>
            Violations {(summary?.hardViolations || 0)}
          </NexusBadge>
          <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => setFocusOperation(actorId, selectedOp.id))}>Set Focus</NexusButton>
          <NexusButton
            size="sm"
            intent={statusCapsuleOpen ? 'primary' : 'subtle'}
            className="nexus-command-capsule"
            data-open={statusCapsuleOpen ? 'true' : 'false'}
            aria-expanded={statusCapsuleOpen}
            aria-controls="op-focus-status-capsule"
            onClick={() => setStatusCapsuleOpen((prev) => !prev)}
          >
            Status {statusCapsuleOpen ? 'Hide' : 'Show'}
          </NexusButton>
          <NexusButton
            size="sm"
            intent={commandCapsuleOpen ? 'primary' : 'subtle'}
            className="nexus-command-capsule"
            data-open={commandCapsuleOpen ? 'true' : 'false'}
            aria-expanded={commandCapsuleOpen}
            aria-controls="op-focus-command-capsule"
            onClick={() => setCommandCapsuleOpen((prev) => !prev)}
          >
            Command {commandCapsuleOpen ? 'Hide' : 'Show'}
          </NexusButton>
          <NexusButton
            size="sm"
            intent={auditCapsuleOpen ? 'primary' : 'subtle'}
            className="nexus-command-capsule"
            data-open={auditCapsuleOpen ? 'true' : 'false'}
            aria-expanded={auditCapsuleOpen}
            aria-controls="op-focus-audit-capsule"
            onClick={() => setAuditCapsuleOpen((prev) => !prev)}
          >
            Audit {auditCapsuleOpen ? 'Hide' : 'Show'}
          </NexusButton>
        </div>

        {statusCapsuleOpen ? (
          <div id="op-focus-status-capsule" className="nexus-command-capsule-grid grid grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1"><span className="text-zinc-500">Posture</span><div><NexusBadge tone={selectedOp.posture === 'FOCUSED' ? 'active' : 'warning'}>{selectedOp.posture}</NexusBadge></div></div>
            <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1"><span className="text-zinc-500">Status</span><div><NexusBadge tone={toneForStatus(selectedOp.status)}>{selectedOp.status}</NexusBadge></div></div>
            <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-zinc-300">Open seats: {summary?.openSeats.reduce((n, s) => n + s.openQty, 0) || 0}</div>
            <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-zinc-300">Hard violations: {summary?.hardViolations || 0}</div>
          </div>
        ) : null}
        {stagePolicy ? (
          <div className="rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1 text-[11px] text-zinc-400">
            {stagePolicy.bannerText}
          </div>
        ) : null}
        {!commandPermission.allowed ? (
          <div className="rounded border border-amber-900/60 bg-amber-950/25 px-2 py-1 text-[11px] text-amber-200">
            {commandPermission.reason}
          </div>
        ) : null}

        {commandCapsuleOpen ? (
          <div id="op-focus-command-capsule" className="nexus-command-capsule-grid space-y-2">
            <div className="grid grid-cols-1 xl:grid-cols-6 gap-2">
              <input
                value={metadataNameInput}
                onChange={(e) => setMetadataNameInput(e.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
                placeholder="Operation name"
              />
              <input
                value={metadataAoNodeInput}
                onChange={(e) => setMetadataAoNodeInput(e.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                placeholder="AO node"
              />
              <select
                value={metadataClassificationInput}
                onChange={(e) => setMetadataClassificationInput(e.target.value as DataClassification)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              >
                <option value="INTERNAL">INTERNAL</option>
                <option value="ALLIED">ALLIED</option>
                <option value="PUBLIC">PUBLIC</option>
              </select>
              <input
                value={metadataAoNoteInput}
                onChange={(e) => setMetadataAoNoteInput(e.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
                placeholder="AO note / command intent"
              />
              <NexusButton size="sm" intent="primary" onClick={() => runAction(() => updateOperation(selectedOp.id, {
                name: metadataNameInput.trim() || selectedOp.name,
                ao: {
                  nodeId: metadataAoNodeInput.trim() || selectedOp.ao.nodeId,
                  note: metadataAoNoteInput.trim() || undefined,
                },
                classification: metadataClassificationInput,
              }, actorId))} disabled={commandLocked}>
                Save Metadata
              </NexusButton>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['CASUAL', 'FOCUSED'] as Operation['posture'][]).map((posture) => (
                <NexusButton
                  key={posture}
                  size="sm"
                  intent={selectedOp.posture === posture ? 'primary' : 'subtle'}
                  disabled={commandLocked}
                  onClick={() =>
                    runAction(() => {
                      setPosture(selectedOp.id, posture, actorId);
                      alignRSVPPolicyToPosture(selectedOp.id, posture);
                      alignOperationEnhancementsToPosture(selectedOp.id, posture, actorId);
                    })
                  }
                >
                  {posture}
                </NexusButton>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['PLANNING', 'ACTIVE', 'WRAPPING', 'ARCHIVED'] as Operation['status'][]).map((status) => (
                <NexusButton
                  key={status}
                  size="sm"
                  intent={selectedOp.status === status ? 'primary' : 'subtle'}
                  disabled={commandLocked}
                  onClick={() => runAction(() => updateStatus(selectedOp.id, status, actorId))}
                >
                  {status}
                </NexusButton>
              ))}
              <NexusButton
                size="sm"
                intent="subtle"
                disabled={commandLocked}
                onClick={() => runAction(() => updateStatus(selectedOp.id, cycleStatus(selectedOp.status), actorId))}
              >
                Cycle Status
              </NexusButton>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-2">
              <input
                value={focusTemplateNameInput}
                onChange={(e) => setFocusTemplateNameInput(e.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 xl:col-span-2"
                placeholder="Template name"
              />
              <input
                value={focusTemplateDescriptionInput}
                onChange={(e) => setFocusTemplateDescriptionInput(e.target.value)}
                className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
                placeholder="Template description"
              />
              <div className="flex items-center gap-2">
                <NexusButton
                  size="sm"
                  intent="subtle"
                  disabled={commandLocked}
                  onClick={() =>
                    runAction(() => {
                      createOperationTemplateFromOperation(selectedOp.id, actorId, {
                        name: focusTemplateNameInput.trim() || `${selectedOp.name} Template`,
                        description: focusTemplateDescriptionInput.trim() || undefined,
                      });
                    })
                  }
                >
                  Save Template
                </NexusButton>
                <NexusButton
                  size="sm"
                  intent="subtle"
                  disabled={commandLocked}
                  onClick={() =>
                    runAction(() => {
                      const cloned = cloneOperation(selectedOp.id, {
                        createdBy: actorId,
                        name: `${selectedOp.name} Copy`,
                      });
                      getOrCreateRSVPPolicy(cloned.id, cloned.posture);
                      initializeOperationEnhancements(cloned.id, cloned.posture, actorId);
                      setFocusOperation(actorId, cloned.id);
                      setSelectedOpId(cloned.id);
                    })
                  }
                >
                  Clone Op
                </NexusButton>
              </div>
            </div>
          </div>
        ) : null}

        {auditCapsuleOpen ? (
          <div id="op-focus-audit-capsule" className="nexus-command-capsule-grid">
            <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">Audit Stream</div>
            <div className="space-y-1 max-h-24 overflow-hidden pr-1 nexus-terminal-feed">
              {pagedAuditEvents.visibleItems.map((entry) => (
                <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[10px] text-zinc-400">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-200">{entry.action}</span>
                    <span>{entry.createdAt}</span>
                  </div>
                  <div className="truncate">{entry.summary}</div>
                </div>
              ))}
              {auditEvents.length === 0 ? <div className="text-[11px] text-zinc-500">No audit entries yet.</div> : null}
            </div>
            <PaginationControls page={pagedAuditEvents.page} pageCount={pagedAuditEvents.pageCount} setPage={pagedAuditEvents.setPage} />
          </div>
        ) : null}

        {errorText ? <div className="rounded border border-red-900/60 bg-red-950/35 px-2 py-1 text-xs text-red-300">{errorText}</div> : null}
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 flex items-center gap-2 nexus-terminal-panel">
        {TABS.map((id) => <NexusButton key={id} size="sm" intent={tabId === id ? 'primary' : 'subtle'} onClick={() => setTabId(id)}>{id}</NexusButton>)}
      </section>

      <div className="flex-1 min-h-0 overflow-hidden pr-1">
        {tabId === 'PLAN' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {planningLocked ? (
              <section className="xl:col-span-2 rounded border border-amber-900/60 bg-amber-950/25 px-3 py-2 text-[11px] text-amber-200">
                Planning artifacts are locked while operation status is <strong>{selectedOp.status}</strong>.
              </section>
            ) : null}
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Objectives</h4>
              <div className="flex gap-2"><input value={objectiveInput} disabled={planningLocked} onChange={(e) => setObjectiveInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Objective" /><NexusButton size="sm" intent="primary" disabled={planningLocked} onClick={() => runAction(() => { if (!objectiveInput.trim()) return; createObjective({ opId: selectedOp.id, title: objectiveInput, priority: 'MED', status: 'OPEN', createdBy: actorId }); setObjectiveInput(''); })}>Add</NexusButton></div>
              <div className="space-y-1 max-h-44 overflow-hidden pr-1">
                {pagedObjectives.visibleItems.map((item) => (
                  <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-300">
                    {item.title}
                  </div>
                ))}
              </div>
              <PaginationControls page={pagedObjectives.page} pageCount={pagedObjectives.pageCount} setPage={pagedObjectives.setPage} />
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Phases + Tasks</h4>
              <div className="flex gap-2"><input value={phaseInput} disabled={planningLocked} onChange={(e) => setPhaseInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Phase" /><NexusButton size="sm" intent="subtle" disabled={planningLocked} onClick={() => runAction(() => { if (!phaseInput.trim()) return; createPhase({ opId: selectedOp.id, title: phaseInput, orderIndex: phases.length, status: 'OPEN' }); setPhaseInput(''); })}>Add Phase</NexusButton></div>
              <div className="flex gap-2"><input value={taskInput} disabled={planningLocked} onChange={(e) => setTaskInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Task" /><NexusButton size="sm" intent="subtle" disabled={planningLocked} onClick={() => runAction(() => { if (!taskInput.trim()) return; createTask({ opId: selectedOp.id, domain: 'COMMAND', title: taskInput, status: 'OPEN', createdBy: actorId }); setTaskInput(''); })}>Add Task</NexusButton></div>
              <div className="space-y-1 max-h-40 overflow-hidden pr-1">
                {pagedPhaseTaskRows.visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded border px-2 py-1 text-[11px] ${item.kind === 'PHASE' ? 'border-zinc-800 bg-zinc-950/55 text-zinc-300' : 'border-zinc-800 bg-zinc-950/45 text-zinc-400'}`}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
              <PaginationControls page={pagedPhaseTaskRows.page} pageCount={pagedPhaseTaskRows.pageCount} setPage={pagedPhaseTaskRows.setPage} />
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 xl:col-span-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Assumptions</h4>
              <div className="flex gap-2"><input value={assumptionInput} disabled={planningLocked} onChange={(e) => setAssumptionInput(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Assumption" /><NexusButton size="sm" intent="primary" disabled={planningLocked} onClick={() => runAction(() => { if (!assumptionInput.trim()) return; createAssumption({ opId: selectedOp.id, statement: assumptionInput, confidence: 0.6, ttlProfileId: selectedOp.ttlProfileId, createdBy: actorId, status: 'ACTIVE' }); setAssumptionInput(''); })}>Add</NexusButton></div>
              <div className="space-y-1 max-h-44 overflow-hidden pr-1">
                {pagedAssumptions.visibleItems.map((item) => (
                  <div key={item.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] flex items-center justify-between gap-2">
                    <span className="text-zinc-300 truncate">{item.statement}</span>
                    <NexusButton size="sm" intent="subtle" onClick={() => runAction(() => challengeAssumption(item.id, actorId))}>
                      {item.status}
                    </NexusButton>
                  </div>
                ))}
              </div>
              <PaginationControls page={pagedAssumptions.page} pageCount={pagedAssumptions.pageCount} setPage={pagedAssumptions.setPage} />
            </section>
          </div>
        ) : null}

        {tabId === 'ROSTER' ? (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">RSVP</h4>
                <NexusBadge tone={availabilityTone(rosterAvailability)}>{availabilityLabel(rosterAvailability)}</NexusBadge>
              </div>
              {rosterAvailability !== 'OK' ? (
                <div className="text-[11px] text-zinc-500">{availabilityCopy(rosterAvailability)}</div>
              ) : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={rsvpMode} disabled={rosterLocked} onChange={(e) => setRsvpMode(e.target.value as 'INDIVIDUAL' | 'ASSET')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="INDIVIDUAL">INDIVIDUAL</option><option value="ASSET">BRING A SHIP</option></select>
                <input value={rsvpRole} disabled={rosterLocked} onChange={(e) => setRsvpRole(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Primary role" />
              </div>
              <textarea value={rsvpNotes} disabled={rosterLocked} onChange={(e) => setRsvpNotes(e.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder="Notes (comms-ok)" />
              <input value={exceptionReason} disabled={rosterLocked} onChange={(e) => setExceptionReason(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Exception reason for soft flags" />
              {rsvpMode === 'ASSET' ? (
                <div className="space-y-2 rounded border border-zinc-800 bg-zinc-950/55 p-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input value={assetName} disabled={rosterLocked} onChange={(e) => setAssetName(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Ship name" /><input value={assetId} disabled={rosterLocked} onChange={(e) => setAssetId(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Ship id" /></div>
                  <div className="grid grid-cols-3 gap-2"><input type="number" min={0} value={crewProvided} disabled={rosterLocked} onChange={(e) => setCrewProvided(Number(e.target.value))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" /><input value={seatRole} disabled={rosterLocked} onChange={(e) => setSeatRole(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Seat role" /><input type="number" min={1} value={seatQty} disabled={rosterLocked} onChange={(e) => setSeatQty(Number(e.target.value))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" /></div>
                </div>
              ) : null}
              <NexusButton size="sm" intent="primary" disabled={rosterLocked} onClick={() => runAction(() => {
                const entry = upsertRSVPEntry(selectedOp.id, { opId: selectedOp.id, userId: actorId, mode: rsvpMode, rolePrimary: rsvpRole || 'Member', notes: rsvpNotes, exceptionReason: exceptionReason || undefined });
                if (rsvpMode === 'ASSET') {
                  const slot = addAssetSlot({ opId: selectedOp.id, rsvpEntryId: entry.id, assetId: assetId || `asset-${Date.now()}`, assetName: assetName || 'Unnamed Asset', capabilitySnapshot: { tags: ['combat'] }, crewProvided: crewProvided || 0 });
                  createCrewSeatRequests(slot.id, [{ roleNeeded: seatRole || 'Crew', qty: Math.max(1, seatQty || 1) }]);
                }
              })}>Submit RSVP</NexusButton>
              {actorEntry ? (
                <NexusButton
                  size="sm"
                  intent="subtle"
                  disabled={rosterLocked}
                  onClick={() => runAction(() => {
                    withdrawRSVPEntry(selectedOp.id, actorId, actorId);
                  })}
                >
                  Withdraw RSVP
                </NexusButton>
              ) : null}
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
              <div className="space-y-1.5 max-h-56 overflow-hidden pr-1">
                {pagedOpenSeats.visibleItems.map((entry) => (
                  <div key={`${entry.assetSlot.id}:${entry.request.id}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                    <div className="text-zinc-300">{entry.assetSlot.assetName} - {entry.request.roleNeeded}</div>
                    <div className="text-zinc-500">open {entry.openQty}</div>
                    <NexusButton size="sm" intent="subtle" disabled={rosterLocked} onClick={() => runAction(() => joinCrewSeat(entry.assetSlot.id, joinUserId || actorId, entry.request.roleNeeded))}>Join Seat</NexusButton>
                  </div>
                ))}
                {openSeats.length === 0 ? <div className="text-xs text-zinc-500">No open seats.</div> : null}
              </div>
              <PaginationControls page={pagedOpenSeats.page} pageCount={pagedOpenSeats.pageCount} setPage={pagedOpenSeats.setPage} />
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Talent Matching + Alerts</h4>
                <NexusBadge tone={leadAlerts.some((alert) => alert.severity === 'HIGH' || alert.severity === 'CRITICAL') ? 'warning' : 'neutral'}>
                  {leadAlerts.length} alerts
                </NexusBadge>
              </div>
              <div className="text-[11px] text-zinc-500">
                Capture role/activity preferences and push dynamic recruiting alerts when operation demands match.
              </div>
              <select
                value={preferenceUserId}
                onChange={(e) => setPreferenceUserId(e.target.value)}
                className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
              >
                {[actorId, ...roster.map((member) => member.id), ...entries.map((entry) => entry.userId)]
                  .filter((value, index, array) => array.indexOf(value) === index)
                  .map((userId) => (
                    <option key={userId} value={userId}>{userId}</option>
                  ))}
              </select>
              <input value={preferenceRoles} onChange={(e) => setPreferenceRoles(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Preferred roles (comma-separated)" />
              <input value={preferenceActivities} onChange={(e) => setPreferenceActivities(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Activity tags (comma-separated)" />
              <div className="grid grid-cols-2 gap-2">
                <select value={preferencePosture} onChange={(e) => setPreferencePosture(e.target.value as Operation['posture'] | 'ANY')} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                  <option value="ANY">ANY</option>
                  <option value="CASUAL">CASUAL</option>
                  <option value="FOCUSED">FOCUSED</option>
                </select>
                <label className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 flex items-center gap-2">
                  <input type="checkbox" checked={preferenceNotifyOptIn} onChange={(e) => setPreferenceNotifyOptIn(e.target.checked)} />
                  Notify
                </label>
              </div>
              <NexusButton
                size="sm"
                intent="primary"
                onClick={() =>
                  runAction(() =>
                    upsertUserOperationPreference({
                      userId: preferenceUserId || actorId,
                      preferredRoles: parseTokenList(preferenceRoles),
                      activityTags: parseTokenList(preferenceActivities),
                      postureAffinity: preferencePosture,
                      notifyOptIn: preferenceNotifyOptIn,
                    })
                  )
                }
              >
                Save Preference
              </NexusButton>
              <NexusButton
                size="sm"
                intent="subtle"
                onClick={() =>
                  runAction(() => {
                    refreshOperationLeadAlerts({
                      opId: selectedOp.id,
                      posture: selectedOp.posture,
                      candidates: candidatePool,
                      demands: seatDemands,
                    });
                  })
                }
              >
                Refresh Matching Alerts
              </NexusButton>

              <div className="space-y-1 max-h-32 overflow-hidden pr-1">
                {candidateMatches.slice(0, 6).map((match) => (
                  <div key={`${match.userId}:${match.matchedRole}`} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                    <div className="text-zinc-200">{match.callsign || match.userId} {'->'} {match.matchedRole}</div>
                    <div className="text-zinc-500">score {match.score}{match.blockedByHardMandate ? ' · blocked by hard mandate' : ''}</div>
                  </div>
                ))}
                {candidateMatches.length === 0 ? <div className="text-xs text-zinc-500">No role demand detected yet.</div> : null}
              </div>

              <div className="space-y-1 max-h-28 overflow-hidden pr-1">
                {pagedLeadAlerts.visibleItems.map((alert) => (
                  <div key={alert.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-200">{alert.title}</span>
                      <NexusBadge tone={alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'warning' : 'neutral'}>
                        {alert.severity}
                      </NexusBadge>
                    </div>
                    <div className="text-zinc-500">{alert.summary}</div>
                    <div className="text-zinc-600 truncate">Notify: {alert.notifiedUserIds.join(', ') || 'none'}</div>
                  </div>
                ))}
                {leadAlerts.length === 0 ? <div className="text-xs text-zinc-500">No active lead alerts.</div> : null}
              </div>
              <PaginationControls page={pagedLeadAlerts.page} pageCount={pagedLeadAlerts.pageCount} setPage={pagedLeadAlerts.setPage} />
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Asset Fit Linkage</h4>
              <div className="space-y-2 max-h-72 overflow-hidden pr-1">
                {pagedAssetSlots.visibleItems.map((slot) => {
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
                            attachFitProfileToAssetSlot(selectedOp.id, slot.id, fitId, actorId, Date.now());
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
              <PaginationControls page={pagedAssetSlots.page} pageCount={pagedAssetSlots.pageCount} setPage={pagedAssetSlots.setPage} />
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
                <select value={ruleEnforcement} disabled={requirementsLocked} onChange={(e) => setRuleEnforcement(e.target.value as RuleEnforcement)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="HARD">HARD</option><option value="SOFT">SOFT</option><option value="ADVISORY">ADVISORY</option></select>
                <select value={ruleKind} disabled={requirementsLocked} onChange={(e) => setRuleKind(e.target.value as RequirementKind)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="ROLE">ROLE</option><option value="ASSET">ASSET</option><option value="CAPABILITY">CAPABILITY</option><option value="COMPOSITION">COMPOSITION</option><option value="READINESS">READINESS</option><option value="COMMS">COMMS</option></select>
              </div>
              <input value={ruleMessage} disabled={requirementsLocked} onChange={(e) => setRuleMessage(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Rule message" />
              <textarea value={rulePredicate} disabled={requirementsLocked} onChange={(e) => setRulePredicate(e.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder='Predicate JSON' />
              <NexusButton size="sm" intent="primary" disabled={requirementsLocked} onClick={() => runAction(() => {
                const current = policy || getOrCreateRSVPPolicy(selectedOp.id, selectedOp.posture);
                let parsed = {};
                try { parsed = JSON.parse(rulePredicate || '{}'); } catch { parsed = {}; }
                updateRSVPPolicy(selectedOp.id, [...current.rules, { id: `rule_${Date.now()}`, enforcement: ruleEnforcement, kind: ruleKind, predicate: parsed, message: ruleMessage || 'Custom rule' }]);
              })}>Add Rule</NexusButton>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Active Rules</h4>
              <div className="space-y-1.5 max-h-64 overflow-hidden pr-1">
                {pagedRules.visibleItems.map((rule) => (
                  <div key={rule.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] space-y-1">
                    <div className="flex items-center justify-between gap-2"><NexusBadge tone={rule.enforcement === 'HARD' ? 'danger' : rule.enforcement === 'SOFT' ? 'warning' : 'neutral'}>{rule.enforcement}</NexusBadge><NexusButton size="sm" intent="subtle" disabled={requirementsLocked} onClick={() => runAction(() => updateRSVPPolicy(selectedOp.id, (policy?.rules || []).filter((r) => r.id !== rule.id)))}>Remove</NexusButton></div>
                    <div className="text-zinc-300">{rule.kind}</div>
                    <div className="text-zinc-500">{rule.message}</div>
                  </div>
                ))}
                {!policy || policy.rules.length === 0 ? <div className="text-xs text-zinc-500">No rules configured.</div> : null}
              </div>
              <PaginationControls page={pagedRules.page} pageCount={pagedRules.pageCount} setPage={pagedRules.setPage} />
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

        {tabId === 'DOCTRINE' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Doctrine Stack</h4>
                <div className="flex items-center gap-2">
                  <NexusBadge tone={doctrineRegistryLocked ? 'warning' : 'ok'}>
                    {doctrineRegistryLocked ? 'Member View' : 'Leadership'}
                  </NexusBadge>
                  <NexusBadge tone="active">{selectedOp.posture}</NexusBadge>
                </div>
              </div>
              {doctrineRegistryLocked ? (
                <div className="rounded border border-amber-900/50 bg-amber-950/20 px-2 py-1 text-[11px] text-amber-200">
                  Doctrine registry edits are restricted to operation leadership.
                </div>
              ) : null}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                {(['INDIVIDUAL', 'SQUAD', 'WING', 'FLEET'] as DoctrineLevel[]).map((level) => (
                  <NexusButton key={level} size="sm" intent={doctrineLevel === level ? 'primary' : 'subtle'} onClick={() => setDoctrineLevel(level)}>
                    {level}
                  </NexusButton>
                ))}
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {editingDoctrineId ? 'Edit Doctrine' : 'Create Doctrine'}
                </div>
                <input value={doctrineLabelInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineLabelInput(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Doctrine label" />
                <textarea value={doctrineDescriptionInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineDescriptionInput(e.target.value)} className="h-14 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder="Doctrine description" />
                <input value={doctrineModifierInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineModifierInput(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Modifier text" />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] text-zinc-500 flex flex-col gap-1">
                    Casual weight
                    <input type="number" step={0.05} min={0} max={1} value={doctrineCasualWeightInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineCasualWeightInput(Math.max(0, Math.min(1, Number(e.target.value) || 0)))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
                  </label>
                  <label className="text-[10px] text-zinc-500 flex flex-col gap-1">
                    Focused weight
                    <input type="number" step={0.05} min={0} max={1} value={doctrineFocusedWeightInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineFocusedWeightInput(Math.max(0, Math.min(1, Number(e.target.value) || 0)))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[11px] text-zinc-500 flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/55 px-2 h-8">
                    <input type="checkbox" checked={doctrineCasualEnabledInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineCasualEnabledInput(e.target.checked)} />
                    Casual enabled
                  </label>
                  <label className="text-[11px] text-zinc-500 flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/55 px-2 h-8">
                    <input type="checkbox" checked={doctrineFocusedEnabledInput} disabled={doctrineRegistryLocked} onChange={(e) => setDoctrineFocusedEnabledInput(e.target.checked)} />
                    Focused enabled
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <NexusButton size="sm" intent="primary" disabled={doctrineRegistryLocked} onClick={() => runAction(() => saveDoctrineDraft())}>
                    {editingDoctrineId ? 'Update Doctrine' : 'Create Doctrine'}
                  </NexusButton>
                  <NexusButton size="sm" intent="subtle" onClick={clearDoctrineDraft}>
                    Clear
                  </NexusButton>
                </div>
              </div>
              <div className="space-y-2 max-h-80 overflow-hidden pr-1">
                {pagedDoctrine.visibleItems.map((doctrine) => {
                  const selection = doctrineProfile?.doctrineByLevel[doctrineLevel]?.find((entry) => entry.doctrineId === doctrine.id) || null;
                  return (
                    <div key={doctrine.id} className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-zinc-200 text-[11px]">{doctrine.label}</div>
                        <label className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={Boolean(selection?.enabled)}
                            disabled={requirementsLocked}
                            onChange={(e) => runAction(() => setDoctrineSelection(selectedOp.id, doctrineLevel, doctrine.id, { enabled: e.target.checked }, actorId))}
                          />
                          Enabled
                        </label>
                      </div>
                      <div className="text-[10px] text-zinc-500">{doctrine.description}</div>
                      <div className="text-[10px] text-zinc-600">{doctrine.modifierText}</div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round((selection?.weight || 0) * 100)}
                        disabled={requirementsLocked}
                        onChange={(e) => runAction(() => setDoctrineSelection(selectedOp.id, doctrineLevel, doctrine.id, { weight: Number(e.target.value) / 100 }, actorId))}
                        className="w-full"
                      />
                      <div className="flex items-center gap-2">
                        <NexusButton size="sm" intent="subtle" disabled={doctrineRegistryLocked} onClick={() => loadDoctrineDraft(doctrine.id)}>
                          Edit
                        </NexusButton>
                        <NexusButton size="sm" intent="subtle" disabled={doctrineRegistryLocked} onClick={() => runAction(() => {
                          const removed = deleteDoctrineDefinition(selectedOp.id, actorId, doctrine.id);
                          if (removed && editingDoctrineId === doctrine.id) clearDoctrineDraft();
                        })}>
                          Delete
                        </NexusButton>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={pagedDoctrine.page} pageCount={pagedDoctrine.pageCount} setPage={pagedDoctrine.setPage} />
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1 text-[11px]">
                <div className="text-zinc-400 uppercase tracking-wide">Impact Snapshot</div>
                {doctrineImpactSummary.map((entry) => (
                  <div key={entry.level} className="flex items-center justify-between gap-2 text-zinc-500">
                    <span>{entry.level}</span>
                    <span>enabled {entry.enabled} / avg {entry.avgWeight}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Mandates + Restrictions</h4>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
                <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Role Mandate</div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={roleMandateRole} disabled={requirementsLocked} onChange={(e) => setRoleMandateRole(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Role" />
                  <input type="number" min={0} value={roleMandateMin} disabled={requirementsLocked} onChange={(e) => setRoleMandateMin(Number(e.target.value))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Min" />
                </div>
                <input value={roleMandateRequiredTags} disabled={requirementsLocked} onChange={(e) => setRoleMandateRequiredTags(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Required loadout tags (csv)" />
                <select value={roleMandateEnforcement} disabled={requirementsLocked} onChange={(e) => setRoleMandateEnforcement(e.target.value as MandateEnforcement)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="HARD">HARD</option><option value="SOFT">SOFT</option><option value="ADVISORY">ADVISORY</option></select>
                <NexusButton size="sm" intent="primary" disabled={requirementsLocked} onClick={() => runAction(() => upsertRoleMandate(selectedOp.id, { role: roleMandateRole || 'Crew', minCount: Math.max(0, roleMandateMin), enforcement: roleMandateEnforcement, requiredLoadoutTags: parseTokenList(roleMandateRequiredTags) }, actorId))}>Add Role Mandate</NexusButton>
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
                <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Loadout Mandate</div>
                <input value={loadoutMandateLabel} disabled={requirementsLocked} onChange={(e) => setLoadoutMandateLabel(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Mandate label" />
                <input value={loadoutMandateTagsAny} disabled={requirementsLocked} onChange={(e) => setLoadoutMandateTagsAny(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Any tags (csv)" />
                <input value={loadoutMandateRoles} disabled={requirementsLocked} onChange={(e) => setLoadoutMandateRoles(e.target.value)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Roles (csv, optional)" />
                <select value={loadoutMandateEnforcement} disabled={requirementsLocked} onChange={(e) => setLoadoutMandateEnforcement(e.target.value as MandateEnforcement)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="HARD">HARD</option><option value="SOFT">SOFT</option><option value="ADVISORY">ADVISORY</option></select>
                <NexusButton size="sm" intent="subtle" disabled={requirementsLocked} onClick={() => runAction(() => upsertLoadoutMandate(selectedOp.id, { label: loadoutMandateLabel || 'Loadout Mandate', tagsAny: parseTokenList(loadoutMandateTagsAny), appliesToRoles: parseTokenList(loadoutMandateRoles), enforcement: loadoutMandateEnforcement }, actorId))}>Add Loadout Mandate</NexusButton>
              </div>

              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-2">
                <div className="text-[11px] text-zinc-400 uppercase tracking-wide">Asset Mandate</div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={assetMandateTag} disabled={requirementsLocked} onChange={(e) => setAssetMandateTag(e.target.value)} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Asset tag" />
                  <input type="number" min={0} value={assetMandateMin} disabled={requirementsLocked} onChange={(e) => setAssetMandateMin(Number(e.target.value))} className="h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Min" />
                </div>
                <select value={assetMandateEnforcement} disabled={requirementsLocked} onChange={(e) => setAssetMandateEnforcement(e.target.value as MandateEnforcement)} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"><option value="HARD">HARD</option><option value="SOFT">SOFT</option><option value="ADVISORY">ADVISORY</option></select>
                <NexusButton size="sm" intent="subtle" disabled={requirementsLocked} onClick={() => runAction(() => upsertAssetMandate(selectedOp.id, { assetTag: assetMandateTag || 'support', minCount: Math.max(0, assetMandateMin), enforcement: assetMandateEnforcement }, actorId))}>Add Asset Mandate</NexusButton>
              </div>

              <div className="space-y-1 max-h-40 overflow-hidden pr-1">
                {pagedMandates.visibleItems.map((entry) => (
                  <div key={entry.id} className="rounded border border-zinc-800 bg-zinc-950/45 px-2 py-1 text-[11px] flex items-center justify-between gap-2">
                    <div className="truncate text-zinc-300">
                      {entry.kind === 'ROLE'
                        ? `${entry.mandate.role} min ${entry.mandate.minCount} (${entry.mandate.enforcement})`
                        : entry.kind === 'LOADOUT'
                          ? `Loadout: ${entry.mandate.label} (${entry.mandate.enforcement})`
                          : `Asset ${entry.mandate.assetTag} min ${entry.mandate.minCount} (${entry.mandate.enforcement})`}
                    </div>
                    <NexusButton
                      size="sm"
                      intent="subtle"
                      disabled={requirementsLocked}
                      onClick={() =>
                        runAction(() => {
                          if (entry.kind === 'ROLE') {
                            removeRoleMandate(selectedOp.id, entry.mandate.id, actorId);
                            return;
                          }
                          if (entry.kind === 'LOADOUT') {
                            removeLoadoutMandate(selectedOp.id, entry.mandate.id, actorId);
                            return;
                          }
                          removeAssetMandate(selectedOp.id, entry.mandate.id, actorId);
                        })
                      }
                    >
                      Remove
                    </NexusButton>
                  </div>
                ))}
              </div>
              <PaginationControls page={pagedMandates.page} pageCount={pagedMandates.pageCount} setPage={pagedMandates.setPage} />
            </section>
          </div>
        ) : null}

        {tabId === 'COMMS' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Comms Discipline</h4>
              <select value={selectedOp.commsTemplateId} disabled={!stagePolicy?.canChangeLifecycle || commsLocked} onChange={(e) => runAction(() => applyCommsTemplate(selectedOp.id, e.target.value as CommsTemplateId, actorId))} className="h-8 w-full rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200">
                {(Object.keys(CommsTemplateRegistry) as CommsTemplateId[]).map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] text-zinc-400 space-y-1">
                <div>Template: {selectedOp.commsTemplateId}</div>
                <div>Channels: {CommsTemplateRegistry[selectedOp.commsTemplateId]?.channels.length || 0}</div>
                <div>Foregrounding: {selectedOp.id === focusOperationId ? 'Focus Op emphasized' : 'Background Op dimmed'}</div>
              </div>
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Op Thread + Decisions</h4>
                <NexusBadge tone={threadSummaries.some((entry) => entry.unreadReplies > 0) ? 'warning' : 'neutral'}>
                  Unread {threadSummaries.reduce((total, entry) => total + entry.unreadReplies, 0)}
                </NexusBadge>
              </div>
              <div className="text-[11px] text-zinc-500">
                Thread inbox is scoped to this operation. Open a thread to mark replies as read and keep decision context anchored.
              </div>
              <div className="space-y-1 max-h-24 overflow-hidden pr-1">
                {pagedThreadSummaries.visibleItems.map((summaryEntry) => (
                  <button
                    key={summaryEntry.root.id}
                    type="button"
                    onClick={() => {
                      setSelectedThreadRootId(summaryEntry.root.id);
                      setDecisionCommentId(summaryEntry.root.id);
                      markThreadRead(selectedOp.id, actorId, summaryEntry.root.id);
                    }}
                    className={`w-full text-left rounded border px-2 py-1 text-[11px] ${activeThreadSummary?.root.id === summaryEntry.root.id ? 'border-sky-600/60 bg-zinc-900/75' : 'border-zinc-800 bg-zinc-950/55'}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-200 truncate">{summaryEntry.root.body}</span>
                      <NexusBadge tone={summaryEntry.unreadReplies > 0 ? 'warning' : 'neutral'}>
                        {summaryEntry.replyCount}R/{summaryEntry.unreadReplies}U
                      </NexusBadge>
                    </div>
                    <div className="mt-0.5 text-zinc-500 truncate">
                      {summaryEntry.participants.join(', ')}
                    </div>
                  </button>
                ))}
                {threadSummaries.length === 0 ? <div className="text-xs text-zinc-500">No scoped comments yet.</div> : null}
              </div>
              <PaginationControls page={pagedThreadSummaries.page} pageCount={pagedThreadSummaries.pageCount} setPage={pagedThreadSummaries.setPage} />
              {threadParentId ? (
                <div className="rounded border border-sky-900/50 bg-sky-950/25 px-2 py-1 text-[11px] text-sky-200 flex items-center justify-between gap-2">
                  <span>Replying in thread: {threadParentId}</span>
                  <NexusButton size="sm" intent="subtle" onClick={() => setThreadParentId('')}>Clear</NexusButton>
                </div>
              ) : null}
              <textarea value={threadBody} disabled={commsLocked} onChange={(e) => setThreadBody(e.target.value)} className="h-16 w-full resize-none rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200" placeholder="Scoped op comment" />
              <NexusButton
                size="sm"
                intent="primary"
                disabled={commsLocked}
                onClick={() => runAction(() => {
                  if (!threadBody.trim()) return;
                  const posted = addComment({ opId: selectedOp.id, by: actorId, body: threadBody, parentCommentId: threadParentId || undefined });
                  const rootId = posted.parentCommentId || posted.id;
                  setSelectedThreadRootId(rootId);
                  markThreadRead(selectedOp.id, actorId, rootId);
                  setThreadBody('');
                  setThreadParentId('');
                })}
              >
                Post
              </NexusButton>
              <div className="space-y-1 max-h-40 overflow-hidden pr-1">
                {pagedThreadComments.visibleItems.map((entry) => {
                  const rootId = activeThreadSummary?.root.id || entry.parentCommentId || entry.id;
                  return (
                    <div key={entry.id} className={`rounded border px-2 py-1 text-[11px] ${entry.parentCommentId ? 'ml-3 border-sky-900/40 bg-zinc-950/45' : 'border-zinc-800 bg-zinc-950/55'} ${decisionCommentId === entry.id ? 'ring-1 ring-sky-500/50' : ''}`}>
                      <button type="button" onClick={() => setDecisionCommentId(entry.id)} className="w-full text-left">
                        <div className="text-zinc-200 truncate">{entry.body}</div>
                        <div className="text-zinc-500">{entry.by}{entry.parentCommentId ? ` · reply to ${entry.parentCommentId}` : ''}</div>
                      </button>
                      <div className="mt-1 flex items-center gap-1">
                        <NexusButton
                          size="sm"
                          intent="subtle"
                          disabled={commsLocked}
                          onClick={() => {
                            setSelectedThreadRootId(rootId);
                            setThreadParentId(entry.id);
                            markThreadRead(selectedOp.id, actorId, rootId);
                          }}
                        >
                          Reply
                        </NexusButton>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls page={pagedThreadComments.page} pageCount={pagedThreadComments.pageCount} setPage={pagedThreadComments.setPage} />
              <div className="flex gap-2"><input value={decisionTitle} disabled={commsLocked} onChange={(e) => setDecisionTitle(e.target.value)} className="h-8 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200" placeholder="Decision title" /><NexusButton size="sm" intent="subtle" disabled={commsLocked} onClick={() => runAction(() => { if (!decisionCommentId || !decisionTitle.trim()) return; promoteCommentToDecision({ opId: selectedOp.id, sourceCommentId: decisionCommentId, title: decisionTitle, createdBy: actorId }); setDecisionTitle(''); setDecisionCommentId(''); })}>Promote</NexusButton></div>
              <div className="space-y-1 max-h-24 overflow-hidden pr-1">
                {pagedDecisions.visibleItems.map((d) => (
                  <div key={d.id} className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-300">
                    {d.title}
                  </div>
                ))}
              </div>
              <PaginationControls page={pagedDecisions.page} pageCount={pagedDecisions.pageCount} setPage={pagedDecisions.setPage} />
            </section>
          </div>
        ) : null}

        {tabId === 'TIMELINE' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
            <section className="xl:col-span-2 rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2 nexus-terminal-panel">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Command Timeline</h4>
                <NexusBadge tone="neutral">{filteredTimelineEntries.length}/{timelineEntries.length} entries</NexusBadge>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {TIMELINE_FILTERS.map((filterId) => (
                  <NexusButton
                    key={filterId}
                    size="sm"
                    intent={timelineFilter === filterId ? 'primary' : 'subtle'}
                    onClick={() => setTimelineFilter(filterId)}
                  >
                    {filterId} {timelineCounts[filterId]}
                  </NexusButton>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[30rem] overflow-hidden pr-1 nexus-terminal-feed">
                {pagedTimelineEntries.visibleItems.map((entry) => (
                  <div key={entry.id} className={`rounded border px-2 py-1.5 text-[11px] ${classesForTimelineSeverity(entry.severity)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <NexusBadge tone={toneForTimelineSource(entry.source)}>{entry.source}</NexusBadge>
                        <NexusBadge tone={toneForTimelineSeverity(entry.severity)}>{entry.severity}</NexusBadge>
                        <span className="text-zinc-200 font-medium truncate">{entry.kind}</span>
                      </div>
                      <span className="text-zinc-500">{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-0.5 text-zinc-300 break-words">{entry.summary}</div>
                    <div className="mt-0.5 text-[10px] text-zinc-500">actor: {entry.actor || 'system'}</div>
                  </div>
                ))}
                {filteredTimelineEntries.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-2 text-[11px] text-zinc-500">
                    No timeline entries for this filter.
                  </div>
                ) : null}
              </div>
              <PaginationControls page={pagedTimelineEntries.page} pageCount={pagedTimelineEntries.pageCount} setPage={pagedTimelineEntries.setPage} />
            </section>

            <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">Telemetry Snapshot</h4>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-2 text-zinc-400">
                  <span>Audit events</span>
                  <span className="text-zinc-200">{auditEvents.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-zinc-400">
                  <span>Operation events</span>
                  <span className="text-zinc-200">{opEvents.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-zinc-400">
                  <span>Decisions</span>
                  <span className="text-zinc-200">{decisions.length}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-zinc-400">
                  <span>High severity</span>
                  <span className="text-red-200">{timelineHighSeverityCount}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-zinc-400">
                  <span>Active filter</span>
                  <span className="text-sky-200">{timelineFilter}</span>
                </div>
              </div>
              <div className="rounded border border-zinc-800 bg-zinc-950/55 p-2 text-[11px] text-zinc-500">
                Timeline entries are merged from mission decisions, command audit actions, and service-level operation events.
              </div>
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
