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
  listCrewSeatAssignments,
  computeRosterSummary,
  listOpenCrewSeats,
} from '../../src/nexus-os/services/rsvpService';
import {
  createOperation,
  appendOperationEvent,
  getOperationById,
  joinOperation,
  listOperationEvents,
  listOperationsForUser,
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
  resetReportServiceState,
} from '../../src/nexus-os/services/reportService';
import { resetFitProfileServiceState } from '../../src/nexus-os/services/fitProfileService';
import {
  createDraft,
  confirmDraft,
  resetIntentDraftServiceState,
} from '../../src/nexus-os/services/intentDraftService';

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
});
