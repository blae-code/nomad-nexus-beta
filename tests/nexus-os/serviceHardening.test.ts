import { beforeEach, describe, expect, it } from 'vitest';
import { computeControlZones } from '../../src/nexus-os/services/controlZoneService';
import {
  resetRsvpServiceState,
  updateRSVPPolicy,
  upsertRSVPEntry,
  validateRSVP,
  addAssetSlot,
  createCrewSeatRequests,
  joinCrewSeat,
  withdrawRSVPEntry,
  listAssetSlots,
  listRSVPEntries,
  listCrewSeatAssignments,
  computeRosterSummary,
  listOpenCrewSeats,
} from '../../src/nexus-os/services/rsvpService';
import {
  createOperation,
  appendOperationEvent,
  getOperationById,
  joinOperation,
  listLiveOperationEvents,
  listOperationEvents,
  listOperationsForUser,
  listSimulationOperationEvents,
  resetOperationServiceState,
  setFocusOperation,
  setPosture,
  updateStatus,
} from '../../src/nexus-os/services/operationService';
import {
  analyzeRoster,
} from '../../src/nexus-os/services/forceDesignService';
import {
  createObjective,
  createPhase,
  createTask,
  createAssumption,
  challengeAssumption,
  promoteCommentToDecision,
  resetPlanningServiceState,
} from '../../src/nexus-os/services/planningService';
import { addComment, resetOpThreadServiceState } from '../../src/nexus-os/services/opThreadService';
import {
  createIntelObject,
  retireIntelObject,
  resetIntelServiceState,
} from '../../src/nexus-os/services/intelService';
import {
  generateReport,
  generateReportPreview,
  deleteReport,
  getReportInputSnapshot,
  listReportInputSnapshots,
  validateReport,
  resetReportServiceState,
} from '../../src/nexus-os/services/reportService';
import {
  attachFitProfileToAssetSlot,
  createFitProfile,
  resetFitProfileServiceState,
} from '../../src/nexus-os/services/fitProfileService';
import {
  createDraft,
  confirmDraft,
  resetIntentDraftServiceState,
} from '../../src/nexus-os/services/intentDraftService';
import {
  createMissionBriefNarrative,
  createNarrativeEvent,
  createStorySoFarSummary,
  getCharacterProfileByMember,
  listNarrativeEvents,
  resetNarrativeServiceState,
  upsertCharacterProfile,
} from '../../src/nexus-os/services/narrativeService';
import {
  canAccessOperationContext,
  createAlliance,
  createEmergencyBroadcast,
  createPublicUpdate,
  getPublicUpdateBySlug,
  listEmergencyBroadcasts,
  listOperationInvites,
  registerOrganization,
  resetCrossOrgServiceState,
  respondAlliance,
  respondOperationInvite,
  sendOperationInvite,
} from '../../src/nexus-os/services/crossOrgService';
import {
  createTrainingScenario,
  injectSimulationEvent,
  markSimulationObjective,
  pauseSimulationSession,
  resetTrainingSimulationState,
  resumeSimulationSession,
  startSimulationSession,
  stopSimulationSession,
} from '../../src/nexus-os/services/trainingSimulationService';

describe('Nexus OS hardening services', () => {
  beforeEach(() => {
    resetOperationServiceState();
    resetPlanningServiceState();
    resetRsvpServiceState();
    resetOpThreadServiceState();
    resetIntelServiceState();
    resetReportServiceState();
    resetFitProfileServiceState();
    resetIntentDraftServiceState();
    resetNarrativeServiceState();
    resetCrossOrgServiceState();
    resetTrainingSimulationState();
  });

  it('computeControlZones is deterministic for identical inputs', () => {
    const nowMs = 1_735_689_600_000;
    const signals = [
      {
        type: 'PRESENCE_DECLARED' as const,
        sourceRef: { kind: 'presence', id: 'ce-1@body-daymar' },
        weight: 1,
        confidence: 0.8,
        occurredAt: new Date(nowMs - 20_000).toISOString(),
        expiresAt: new Date(nowMs + 120_000).toISOString(),
        orgId: 'ORG-A',
        scope: 'body' as const,
        geometryHint: { nodeId: 'body-daymar' },
      },
      {
        type: 'COMMAND_ENDORSEMENT' as const,
        sourceRef: { kind: 'command', id: 'decision-22@body-daymar' },
        weight: 0.9,
        confidence: 0.7,
        occurredAt: new Date(nowMs - 15_000).toISOString(),
        expiresAt: new Date(nowMs + 140_000).toISOString(),
        orgId: 'ORG-B',
        scope: 'body' as const,
        geometryHint: { nodeId: 'body-daymar' },
      },
    ];

    const first = computeControlZones(signals, nowMs);
    const second = computeControlZones(signals, nowMs);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first[0].contestationLevel).toBeGreaterThan(0);
  });

  it('validateRSVP enforces hard and soft rules correctly', () => {
    const opId = 'op-hardening-1';
    updateRSVPPolicy(opId, [
      {
        id: 'rule-hard-comms',
        enforcement: 'HARD',
        kind: 'COMMS',
        predicate: { commsRequired: true },
        message: 'Comms are mandatory.',
      },
      {
        id: 'rule-soft-role',
        enforcement: 'SOFT',
        kind: 'ROLE',
        predicate: { roleIn: ['Lead', 'Medic'] },
        message: 'Preferred role mismatch.',
      },
    ]);

    const compliance = validateRSVP(opId, {
      opId,
      userId: 'pilot-1',
      mode: 'INDIVIDUAL',
      rolePrimary: 'Breacher',
      notes: 'no mic',
    });
    expect(compliance.hardViolations.length).toBe(1);
    expect(compliance.softFlags.length).toBe(1);

    expect(() =>
      upsertRSVPEntry(opId, {
        opId,
        userId: 'pilot-1',
        mode: 'INDIVIDUAL',
        rolePrimary: 'Breacher',
        notes: 'no mic',
      })
    ).toThrow(/Hard requirement violations/);

    expect(() =>
      upsertRSVPEntry(opId, {
        opId,
        userId: 'pilot-2',
        mode: 'INDIVIDUAL',
        rolePrimary: 'Breacher',
        notes: 'comms-ok',
      })
    ).toThrow(/exception reason/i);

    const entry = upsertRSVPEntry(opId, {
      opId,
      userId: 'pilot-3',
      mode: 'INDIVIDUAL',
      rolePrimary: 'Breacher',
      notes: 'comms-ok',
      exceptionReason: 'Covering open breach lane.',
    });
    expect(entry.compliance.softFlags.length).toBe(1);
    expect(entry.compliance.exceptionReason).toContain('Covering open breach lane');
  });

  it('analyzeRoster produces stable coverage output for same roster snapshot', () => {
    const op = createOperation({
      name: 'Stability Check',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    }, 1_735_689_600_000);

    const entry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'ace-1',
      mode: 'ASSET',
      rolePrimary: 'Pilot',
      notes: 'comms-ok',
      exceptionReason: 'Temporary crew.',
    }, 1_735_689_601_000);

    addAssetSlot({
      opId: op.id,
      rsvpEntryId: entry.id,
      assetId: 'ship-cutlass-black',
      assetName: 'Cutlass Black',
      capabilitySnapshot: { tags: ['escort', 'transport', 'logistics'] },
      crewProvided: 2,
    }, 1_735_689_602_000);

    const nowMs = 1_735_689_610_000;
    const first = analyzeRoster(op.id, nowMs);
    const second = analyzeRoster(op.id, nowMs);

    expect(first.coverageMatrix).toEqual(second.coverageMatrix);
    expect(first.dependencyGraph).toEqual(second.dependencyGraph);
    expect(first.coverageMatrix.rows.length).toBeGreaterThan(0);
  });

  it('training simulation lifecycle stays deterministic and isolated from live event queries', () => {
    const nowMs = 1_735_689_660_000;
    const op = createOperation({
      name: 'Simulation Guardrail Op',
      createdBy: 'trainer-1',
      posture: 'FOCUSED',
      status: 'ACTIVE',
      ao: { nodeId: 'body-daymar' },
    }, nowMs - 10_000);

    const scenario = createTrainingScenario({
      title: 'Medical Extraction Drill',
      description: 'Stabilize casualty and secure extraction lane.',
      difficulty: 'STANDARD',
      tags: ['training', 'rescue'],
      createdBy: 'trainer-1',
      objectives: [
        { id: 'obj_rescue', title: 'Stabilize casualty', required: true, rescueWeighted: true },
        { id: 'obj_security', title: 'Secure perimeter', required: true, rescueWeighted: false },
      ],
      triggers: [],
    }, nowMs - 9_000);

    const session = startSimulationSession({
      scenarioId: scenario.id,
      opId: op.id,
      startedBy: 'trainer-1',
    }, nowMs - 8_000);

    injectSimulationEvent(session.id, {
      eventType: 'MANUAL_INJECT',
      title: 'Unexpected casualty',
      message: 'Secondary casualty reported on east lane.',
      severity: 'HIGH',
    }, nowMs - 7_000);

    pauseSimulationSession(session.id, nowMs - 6_500);
    resumeSimulationSession(session.id, nowMs - 6_000);

    markSimulationObjective({
      sessionId: session.id,
      objectiveId: 'obj_rescue',
      completed: true,
    }, nowMs - 5_000);
    markSimulationObjective({
      sessionId: session.id,
      objectiveId: 'obj_security',
      completed: true,
    }, nowMs - 4_500);

    const stopped = stopSimulationSession(session.id, { asCompleted: true }, nowMs - 4_000);
    expect(stopped.session.status).toBe('COMPLETED');
    expect(stopped.result.score).toBeGreaterThan(0);
    expect(stopped.result.recommendations.length).toBeGreaterThan(0);
    expect(stopped.result.objectiveSummary.filter((entry) => entry.completed).length).toBe(2);

    const simEvents = listSimulationOperationEvents(op.id, session.id);
    const liveEvents = listLiveOperationEvents(op.id);
    expect(simEvents.length).toBeGreaterThan(0);
    expect(liveEvents.length).toBe(0);

    const scenarioRepeat = createTrainingScenario({
      title: 'Medical Extraction Drill',
      description: 'Stabilize casualty and secure extraction lane.',
      difficulty: 'STANDARD',
      tags: ['training', 'rescue'],
      createdBy: 'trainer-1',
      objectives: [
        { id: 'obj_rescue', title: 'Stabilize casualty', required: true, rescueWeighted: true },
        { id: 'obj_security', title: 'Secure perimeter', required: true, rescueWeighted: false },
      ],
      triggers: [],
    }, nowMs - 3_900);
    const sessionRepeat = startSimulationSession({
      scenarioId: scenarioRepeat.id,
      startedBy: 'trainer-1',
    }, nowMs - 3_800);
    markSimulationObjective({
      sessionId: sessionRepeat.id,
      objectiveId: 'obj_rescue',
      completed: true,
    }, nowMs - 3_700);
    markSimulationObjective({
      sessionId: sessionRepeat.id,
      objectiveId: 'obj_security',
      completed: true,
    }, nowMs - 3_600);
    const stoppedRepeat = stopSimulationSession(sessionRepeat.id, { asCompleted: true }, nowMs - 3_500);

    expect(stoppedRepeat.result.score).toBe(stopped.result.score);
    expect(stoppedRepeat.result.rescueScore).toBe(stopped.result.rescueScore);
    expect(stoppedRepeat.result.outcome).toBe(stopped.result.outcome);
  });

  it('report generation stays deterministic and includes citations + snapshot refs', () => {
    const nowMs = 1_735_689_700_000;
    const actorId = 'ce-warden';
    const op = createOperation({
      name: 'Report Determinism Op',
      createdBy: actorId,
      posture: 'FOCUSED',
      status: 'ACTIVE',
      ao: { nodeId: 'body-daymar' },
    }, nowMs - 10_000);

    createObjective({
      opId: op.id,
      title: 'Secure corridor',
      priority: 'HIGH',
      status: 'OPEN',
      createdBy: actorId,
    }, nowMs - 8_000);
    createPhase({
      opId: op.id,
      title: 'Insertion',
      orderIndex: 0,
      status: 'OPEN',
    }, nowMs - 7_500);
    createTask({
      opId: op.id,
      domain: 'COMMAND',
      title: 'Stack on hatch',
      status: 'OPEN',
      createdBy: actorId,
    }, nowMs - 7_000);
    const assumption = createAssumption({
      opId: op.id,
      statement: 'Corridor remains uncontested.',
      confidence: 0.7,
      ttlProfileId: op.ttlProfileId,
      createdBy: actorId,
      status: 'ACTIVE',
    }, nowMs - 6_000);
    challengeAssumption(assumption.id, actorId, nowMs - 5_500);

    const rsvp = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: actorId,
      mode: 'ASSET',
      rolePrimary: 'Lead',
      notes: 'comms-ok',
    }, nowMs - 5_000);
    addAssetSlot({
      opId: op.id,
      rsvpEntryId: rsvp.id,
      assetId: 'asset-carrack',
      assetName: 'Carrack',
      capabilitySnapshot: { tags: ['medical', 'transport'] },
      crewProvided: 4,
    }, nowMs - 4_500);

    const comment = addComment({
      opId: op.id,
      by: actorId,
      body: 'Shift approach route due to contact.',
    }, nowMs - 4_000);
    promoteCommentToDecision({
      opId: op.id,
      sourceCommentId: comment.id,
      title: 'Adjust route',
      createdBy: actorId,
    }, nowMs - 3_500);

    const intel = createIntelObject({
      type: 'PIN',
      scope: { kind: 'OP', opIds: [op.id] },
      anchor: { nodeId: 'body-daymar' },
      title: 'Hostile checkpoint',
      body: 'Contact near outpost approach.',
      createdBy: actorId,
      confidence: 'MED',
    }, nowMs - 3_000);
    retireIntelObject(intel.id, actorId, 'Checkpoint neutralized.', nowMs - 2_500);

    appendOperationEvent({
      opId: op.id,
      kind: 'REPORT_CONTACT',
      payload: { nodeId: 'body-daymar' },
      createdBy: actorId,
    }, nowMs - 2_000);

    const previewA = generateReportPreview('OP_BRIEF', { kind: 'OP', opId: op.id }, { generatedBy: actorId, opId: op.id }, nowMs);
    const previewB = generateReportPreview('OP_BRIEF', { kind: 'OP', opId: op.id }, { generatedBy: actorId, opId: op.id }, nowMs);
    expect(previewA).toEqual(previewB);

    const brief = generateReport('OP_BRIEF', { kind: 'OP', opId: op.id }, { generatedBy: actorId, opId: op.id }, nowMs);
    const aar = generateReport('AAR', { kind: 'OP', opId: op.id }, { generatedBy: actorId, opId: op.id }, nowMs);

    expect(brief.evidence.length).toBeGreaterThan(0);
    expect(brief.evidence.some((block) => block.citations.length > 0)).toBe(true);
    expect(brief.inputs.snapshotRefs && brief.inputs.snapshotRefs.length).toBeGreaterThan(0);
    expect(aar.evidence.length).toBeGreaterThan(0);
    expect(aar.evidence.some((block) => block.citations.length > 0)).toBe(true);
  });

  it('enforces OP-scope report permissions and report deletion ownership', () => {
    const nowMs = 1_735_689_710_000;
    const owner = 'ce-owner';
    const outsider = 'gce-outsider';
    const op = createOperation({
      name: 'Report Access Guard',
      createdBy: owner,
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'body-daymar' },
    }, nowMs - 10_000);

    expect(() =>
      generateReport('OP_BRIEF', { kind: 'OP', opId: op.id }, { generatedBy: outsider, opId: op.id }, nowMs - 9_000)
    ).toThrow(/lacks OP scope access/i);

    joinOperation(op.id, outsider, nowMs - 8_000);
    const report = generateReport(
      'OP_BRIEF',
      { kind: 'OP', opId: op.id },
      { generatedBy: outsider, opId: op.id },
      nowMs - 7_000
    );

    expect(() => deleteReport(report.id, 'intruder-1')).toThrow(/Delete denied/i);
    expect(deleteReport(report.id, outsider)).toBe(true);
  });

  it('stores reproducible report input snapshots and validates unsafe markdown warnings', () => {
    const nowMs = 1_735_689_720_000;
    const actorId = 'ce-warden';
    const op = createOperation({
      name: 'Snapshot Guard',
      createdBy: actorId,
      posture: 'FOCUSED',
      status: 'ACTIVE',
      ao: { nodeId: 'body-daymar' },
    }, nowMs - 10_000);

    const report = generateReport(
      'OP_BRIEF',
      { kind: 'OP', opId: op.id },
      { generatedBy: actorId, opId: op.id },
      nowMs - 9_000
    );

    const snapshot = getReportInputSnapshot(report.id);
    expect(snapshot?.reportId).toBe(report.id);
    expect(snapshot?.inputs.snapshotRefs.length).toBeGreaterThanOrEqual(report.inputs.snapshotRefs?.length || 0);
    expect(listReportInputSnapshots().some((entry) => entry.reportId === report.id)).toBe(true);

    const validation = validateReport({
      ...report,
      title: '<script>alert(1)</script>',
      narrative: report.narrative.map((section, index) =>
        index === 0 ? { ...section, body: `${section.body}\n[x](javascript:alert(1))` } : section
      ),
    });
    expect(validation.warnings.some((warning) => /unsafe markdown\/html/i.test(warning))).toBe(true);
  });

  it('enforces fit attachment permissions and emits citation metadata', () => {
    const nowMs = 1_735_689_730_000;
    const op = createOperation({
      name: 'Fit Attachment Guard',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    }, nowMs - 10_000);
    const entry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'pilot-attach',
      mode: 'ASSET',
      rolePrimary: 'Pilot',
      notes: 'comms-ok',
      exceptionReason: 'attachment-test',
    }, nowMs - 9_000);
    const slot = addAssetSlot({
      opId: op.id,
      rsvpEntryId: entry.id,
      assetId: 'asset-cutlass',
      assetName: 'Cutlass',
      capabilitySnapshot: { tags: ['escort'] },
      crewProvided: 1,
    }, nowMs - 8_000);
    const fit = createFitProfile({
      scope: 'INDIVIDUAL',
      name: 'Escort Fit',
      createdBy: 'pilot-attach',
      gameVersion: '4.1.0-live',
      platforms: [{ id: 'p-1', shipNameSnapshot: 'Cutlass Black', components: [] }],
      roleTags: ['Pilot'],
      capabilityTags: ['escort'],
    }, nowMs - 7_000);

    expect(() =>
      attachFitProfileToAssetSlot(op.id, slot.id, fit.id, 'intruder-1', nowMs - 6_000)
    ).toThrow(/denied/i);

    const attached = attachFitProfileToAssetSlot(op.id, slot.id, fit.id, 'pilot-attach', nowMs - 5_000);
    expect(attached.updatedSlots.length).toBeGreaterThan(0);
    expect(attached.citations.some((entryRef) => entryRef.kind === 'fit_profile' && entryRef.id === fit.id)).toBe(true);
    expect(attached.citations.some((entryRef) => entryRef.kind === 'asset_slot' && entryRef.id === slot.id)).toBe(true);
  });

  it('adds source refs and trace diagnostics to roster coverage rows', () => {
    const nowMs = 1_735_689_740_000;
    const op = createOperation({
      name: 'Force Trace',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    }, nowMs - 20_000);

    const entry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'pilot-trace',
      mode: 'ASSET',
      rolePrimary: 'Lead',
      notes: 'comms-ok',
      exceptionReason: 'trace',
    }, nowMs - 19_000);
    addAssetSlot({
      opId: op.id,
      rsvpEntryId: entry.id,
      assetId: 'asset-trace',
      assetName: 'Tracebird',
      capabilitySnapshot: { tags: ['transport', 'logistics'] },
      crewProvided: 2,
    }, nowMs - 18_000);

    const analysis = analyzeRoster(op.id, nowMs - 17_000);
    expect(analysis.coverageMatrix.rows.length).toBeGreaterThan(0);
    expect(analysis.coverageMatrix.rows[0].ruleTrace?.targetId).toBeTruthy();
    expect(analysis.coverageMatrix.rows.some((row) => (row.sourceRefs || []).length > 0)).toBe(true);

    const largeOp = createOperation({
      name: 'Large Trace',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    }, nowMs - 16_000);
    for (let index = 0; index < 40; index += 1) {
      upsertRSVPEntry(largeOp.id, {
        opId: largeOp.id,
        userId: `member-${index}`,
        mode: 'INDIVIDUAL',
        rolePrimary: 'Lead',
        notes: 'comms-ok',
        exceptionReason: `bulk-${index}`,
      }, nowMs - 15_000 + index);
    }

    const largeAnalysis = analyzeRoster(largeOp.id, nowMs - 14_000);
    expect(
      largeAnalysis.gaps.some((gap) =>
        gap.kind === 'SUSTAINMENT' && /Large roster/i.test(gap.message)
      )
    ).toBe(true);
  });

  it('requires actorId for operation mutators and keeps joiners non-commander', () => {
    const owner = 'ce-warden';
    const op = createOperation({
      name: 'Auth Guardrails',
      createdBy: owner,
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    expect(() => updateStatus(op.id, 'ACTIVE')).toThrow(/requires actorId/i);
    expect(() => setPosture(op.id, 'CASUAL')).toThrow(/requires actorId/i);

    const joined = joinOperation(op.id, 'gce-rifleman');
    expect(joined.permissions.participantIds?.includes('gce-rifleman')).toBe(true);
    expect(joined.permissions.commanderIds?.includes('gce-rifleman')).toBe(false);

    const persisted = getOperationById(op.id);
    expect(persisted?.permissions.participantIds?.includes('gce-rifleman')).toBe(true);

    expect(() => updateStatus(op.id, 'ACTIVE', 'gce-rifleman')).toThrow(/owners\/commanders/i);
    expect(() => setFocusOperation('intruder', op.id)).toThrow(/membership/i);

    const visibleToJoiner = listOperationsForUser({ userId: 'gce-rifleman' });
    expect(visibleToJoiner.some((entry) => entry.id === op.id)).toBe(true);
  });

  it('seat counts treat declined/withdrawn assignments as open capacity', () => {
    const op = createOperation({
      name: 'Seat Accounting',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });
    const entry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'pilot-77',
      mode: 'ASSET',
      rolePrimary: 'Pilot',
      notes: 'comms-ok',
      exceptionReason: 'Seat test',
    });
    const slot = addAssetSlot({
      opId: op.id,
      rsvpEntryId: entry.id,
      assetId: 'asset-valk',
      assetName: 'Valkyrie',
      capabilitySnapshot: { tags: ['transport'] },
      crewProvided: 1,
    });
    createCrewSeatRequests(slot.id, [{ roleNeeded: 'Gunner', qty: 1 }]);
    joinCrewSeat(slot.id, 'gunner-1', 'Gunner');

    const assignments = listCrewSeatAssignments(op.id);
    expect(assignments.length).toBe(1);

    // Service exposes references; simulate external state transition for accounting guardrail test.
    assignments[0].status = 'DECLINED';

    const summary = computeRosterSummary(op.id);
    const openSeats = listOpenCrewSeats(op.id);
    expect(summary.openSeats[0].openQty).toBe(1);
    expect(openSeats[0].openQty).toBe(1);
  });

  it('withdrawRSVPEntry cascades asset slot and seat cleanup for asset owners', () => {
    const op = createOperation({
      name: 'RSVP Withdrawal Cascade',
      createdBy: 'ce-warden',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    const ownerEntry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'pilot-owner',
      mode: 'ASSET',
      rolePrimary: 'Pilot',
      notes: 'comms-ok',
      exceptionReason: 'Asset owner',
    });
    upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'crew-1',
      mode: 'INDIVIDUAL',
      rolePrimary: 'Gunner',
      notes: 'comms-ok',
      exceptionReason: 'Seat join',
    });
    const slot = addAssetSlot({
      opId: op.id,
      rsvpEntryId: ownerEntry.id,
      assetId: 'asset-c2',
      assetName: 'C2',
      capabilitySnapshot: { tags: ['transport'] },
      crewProvided: 1,
    });
    createCrewSeatRequests(slot.id, [{ roleNeeded: 'Gunner', qty: 1 }]);
    const assignment = joinCrewSeat(slot.id, 'crew-1', 'Gunner');

    const result = withdrawRSVPEntry(op.id, 'pilot-owner', 'pilot-owner');
    expect(result.removedAssetSlotIds).toEqual([slot.id]);
    expect(result.removedSeatAssignmentIds).toContain(assignment.id);
    expect(listOpenCrewSeats(op.id).length).toBe(0);
    expect(listCrewSeatAssignments(op.id).length).toBe(0);

    const ownerRecord = listRSVPEntries(op.id).find((entry) => entry.userId === 'pilot-owner');
    expect(ownerRecord?.status).toBe('WITHDRAWN');

    const opEvents = listOperationEvents(op.id).map((event) => event.kind);
    expect(opEvents).toContain('RSVP_WITHDRAWN');
    expect(opEvents).toContain('RSVP_ASSET_SLOT_REMOVED');
    expect(opEvents).toContain('RSVP_CREW_ASSIGNMENT_WITHDRAWN');
  });

  it('withdrawRSVPEntry removes the withdrawing user from crew seats without deleting the asset slot', () => {
    const op = createOperation({
      name: 'RSVP Withdrawal Seat Exit',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    const ownerEntry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'pilot-owner',
      mode: 'ASSET',
      rolePrimary: 'Pilot',
      notes: 'comms-ok',
      exceptionReason: 'Owner',
    });
    upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'crew-2',
      mode: 'INDIVIDUAL',
      rolePrimary: 'Support',
      notes: 'comms-ok',
      exceptionReason: 'Crew seat',
    });

    const slot = addAssetSlot({
      opId: op.id,
      rsvpEntryId: ownerEntry.id,
      assetId: 'asset-m2',
      assetName: 'M2',
      capabilitySnapshot: { tags: ['logistics'] },
      crewProvided: 2,
    });
    createCrewSeatRequests(slot.id, [{ roleNeeded: 'Loader', qty: 1 }]);
    joinCrewSeat(slot.id, 'crew-2', 'Loader');

    const result = withdrawRSVPEntry(op.id, 'crew-2', 'crew-2');
    expect(result.removedAssetSlotIds.length).toBe(0);
    expect(result.removedSeatAssignmentIds.length).toBe(1);
    expect(listAssetSlots(op.id).length).toBe(1);
    expect(listCrewSeatAssignments(op.id).length).toBe(0);
  });

  it('appends operation audit events for RSVP, asset slots, and seat joins', () => {
    const op = createOperation({
      name: 'RSVP Audit Trail',
      createdBy: 'ce-warden',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    const entry = upsertRSVPEntry(op.id, {
      opId: op.id,
      userId: 'pilot-77',
      mode: 'ASSET',
      rolePrimary: 'Pilot',
      notes: 'comms-ok',
      exceptionReason: 'Audit coverage',
    });
    const slot = addAssetSlot({
      opId: op.id,
      rsvpEntryId: entry.id,
      assetId: 'asset-retaliator',
      assetName: 'Retaliator',
      capabilitySnapshot: { tags: ['combat'] },
      crewProvided: 1,
    });
    createCrewSeatRequests(slot.id, [{ roleNeeded: 'Gunner', qty: 1 }]);
    joinCrewSeat(slot.id, 'gunner-1', 'Gunner');

    const opEvents = listOperationEvents(op.id).map((event) => event.kind);
    expect(opEvents).toContain('RSVP_SUBMITTED');
    expect(opEvents).toContain('RSVP_ASSET_SLOT_ADDED');
    expect(opEvents).toContain('RSVP_CREW_SEAT_REQUESTED');
    expect(opEvents).toContain('RSVP_CREW_SEAT_JOINED');
  });

  it('draft-confirmed events persist explicit scopeKind metadata', () => {
    const op = createOperation({
      name: 'Scope Metadata',
      createdBy: 'ce-warden',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });

    appendOperationEvent({
      opId: op.id,
      kind: 'DECLARE_HOLD',
      createdBy: 'ce-warden',
      payload: {},
    });
    appendOperationEvent({
      kind: 'REQUEST_SITREP',
      createdBy: 'ce-warden',
      payload: {},
    });

    const opScoped = createDraft({
      kind: 'DECLARE_DEPARTURE',
      target: { nodeId: 'body-daymar' },
      payload: { opId: op.id },
      createdBy: 'ce-warden',
    });
    const personalScoped = createDraft({
      kind: 'REQUEST_SITREP',
      target: { nodeId: 'body-daymar' },
      payload: {},
      createdBy: 'ce-warden',
    });

    const opResult = confirmDraft(opScoped.id);
    const personalResult = confirmDraft(personalScoped.id);
    expect(opResult.createdEventStub?.scopeKind).toBe('OP');
    expect(personalResult.createdEventStub?.scopeKind).toBe('PERSONAL');

    const allEvents = listOperationEvents();
    expect(allEvents.some((entry) => entry.scopeKind === 'OP' && entry.opId === op.id)).toBe(true);
    expect(allEvents.some((entry) => entry.scopeKind === 'PERSONAL' && !entry.opId)).toBe(true);
  });

  it('narrative service supports personas, IC/OOC entries, and report bridge artifacts', () => {
    const nowMs = 1_735_689_880_000;
    const actorId = 'gce-doc';
    const op = createOperation({
      name: 'Narrative Readiness',
      createdBy: actorId,
      posture: 'FOCUSED',
      status: 'ACTIVE',
      ao: { nodeId: 'body-daymar' },
    }, nowMs - 10_000);

    upsertCharacterProfile({
      memberProfileId: actorId,
      characterName: 'Doc',
      biography: 'Frontline medic',
      affiliation: 'Redscar',
      inCharacterByDefault: true,
    }, nowMs - 9_000);

    const profile = getCharacterProfileByMember(actorId);
    expect(profile?.characterName).toBe('Doc');
    expect(profile?.inCharacterByDefault).toBe(true);

    createNarrativeEvent({
      opId: op.id,
      authorId: actorId,
      authorLabel: 'Doc',
      type: 'COMMENTARY',
      tone: 'IC_COMMS',
      title: 'Medical Channel',
      body: 'IC: triage lane established near breach corridor.',
      inCharacter: true,
      visibility: 'OP',
      sourceKind: 'USER',
      tags: ['medical'],
    }, nowMs - 8_000);

    createNarrativeEvent({
      opId: op.id,
      authorId: actorId,
      type: 'TIMELINE_BEAT',
      tone: 'OOC',
      title: 'OOC Coordination',
      body: 'Need one additional escort on medevac route.',
      inCharacter: false,
      visibility: 'OP',
      sourceKind: 'USER',
      tags: ['coordination'],
    }, nowMs - 7_000);

    appendOperationEvent({
      opId: op.id,
      kind: 'DECLARE_HOLD',
      payload: { lane: 'north' },
      createdBy: actorId,
    }, nowMs - 6_000);

    const brief = createMissionBriefNarrative(op.id, actorId, {}, nowMs - 5_000);
    const story = createStorySoFarSummary(op.id, actorId, nowMs - 4_000);
    expect(brief.type).toBe('MISSION_BRIEF');
    expect(story.type).toBe('SYSTEM_SUMMARY');

    const icEntries = listNarrativeEvents({ opId: op.id, inCharacter: true });
    const oocEntries = listNarrativeEvents({ opId: op.id, inCharacter: false });
    expect(icEntries.length).toBeGreaterThan(0);
    expect(oocEntries.length).toBeGreaterThan(0);

    const report = generateReport('OP_BRIEF', { kind: 'OP', opId: op.id }, { generatedBy: actorId, opId: op.id }, nowMs);
    expect(report.kind).toBe('OP_BRIEF');

    const bridged = listNarrativeEvents({ opId: op.id, types: ['MISSION_BRIEF'] });
    expect(bridged.length).toBeGreaterThan(0);
  });

  it('cross-org flow enforces alliance before invite, scopes access, and exposes public outreach safely', () => {
    const nowMs = 1_735_690_000_000;
    const actorId = 'ce-warden';
    const hostOrg = registerOrganization({
      name: 'Redscar Nomads',
      shortTag: 'RSC',
      kind: 'PRIMARY',
      visibilityDefault: 'INTERNAL',
    }, nowMs - 20_000);
    const allyOrg = registerOrganization({
      name: 'Aegis Relief',
      shortTag: 'AGR',
      kind: 'ALLY',
      visibilityDefault: 'ALLIED',
    }, nowMs - 19_000);

    const op = createOperation({
      name: 'Joint Rescue Net',
      createdBy: actorId,
      hostOrgId: hostOrg.id,
      posture: 'FOCUSED',
      status: 'ACTIVE',
      classification: 'ALLIED',
      ao: { nodeId: 'body-daymar' },
    }, nowMs - 18_000);

    expect(() =>
      sendOperationInvite({
        opId: op.id,
        hostOrgId: hostOrg.id,
        targetOrgId: allyOrg.id,
        createdBy: actorId,
      }, nowMs - 17_000)
    ).toThrow(/No active alliance/i);

    const alliance = createAlliance({
      requesterOrgId: hostOrg.id,
      partnerOrgId: allyOrg.id,
      allianceName: 'Rescue Mutual Aid',
      createdBy: actorId,
    }, nowMs - 16_000);
    respondAlliance(alliance.id, hostOrg.id, 'ACCEPT', nowMs - 15_000);

    const invite = sendOperationInvite({
      opId: op.id,
      hostOrgId: hostOrg.id,
      targetOrgId: allyOrg.id,
      classification: 'ALLIED',
      createdBy: actorId,
    }, nowMs - 14_000);
    expect(invite.status).toBe('PENDING');
    respondOperationInvite(invite.id, allyOrg.id, 'ACCEPT', 'ally-admin', nowMs - 13_000);

    const invites = listOperationInvites({ opId: op.id });
    expect(invites.some((entry) => entry.status === 'ACCEPTED')).toBe(true);

    const hostAccess = canAccessOperationContext({
      opId: op.id,
      requesterOrgId: hostOrg.id,
      requesterUserId: actorId,
      requiredClassification: 'ALLIED',
    });
    const allyAccess = canAccessOperationContext({
      opId: op.id,
      requesterOrgId: allyOrg.id,
      requesterUserId: 'ally-user-1',
      requiredClassification: 'ALLIED',
    });
    const outsider = registerOrganization({
      name: 'Outer Ring',
      shortTag: 'OUT',
      kind: 'ALLY',
      visibilityDefault: 'ALLIED',
    }, nowMs - 12_000);
    const outsiderAccess = canAccessOperationContext({
      opId: op.id,
      requesterOrgId: outsider.id,
      requesterUserId: 'outsider-1',
      requiredClassification: 'ALLIED',
    });

    expect(hostAccess.allowed).toBe(true);
    expect(allyAccess.allowed).toBe(true);
    expect(outsiderAccess.allowed).toBe(false);

    const update = createPublicUpdate({
      orgId: hostOrg.id,
      opId: op.id,
      title: 'Joint Rescue Complete',
      body: 'Five civilians recovered. Last known point 12.3456, -44.9876.',
      audience: 'PUBLIC',
      classification: 'PUBLIC',
      createdBy: actorId,
      sourceRefs: [{ kind: 'operation', id: op.id }],
    }, nowMs - 11_000);
    expect(update.publishStatus).toBe('PUBLISHED');
    expect(update.body).toContain('[REDACTED_COORDINATES]');
    const publicView = getPublicUpdateBySlug(update.slug);
    expect(publicView?.id).toBe(update.id);

    createEmergencyBroadcast({
      originOrgId: hostOrg.id,
      opId: op.id,
      title: 'Emergency Medevac Support',
      message: 'Need additional ACE medevac lane support.',
      createdBy: actorId,
    }, nowMs - 10_000);
    const broadcasts = listEmergencyBroadcasts(hostOrg.id);
    expect(broadcasts.length).toBeGreaterThan(0);
  });
});
