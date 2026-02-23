import { beforeEach, describe, expect, it } from 'vitest';
import { getOperationArchetype } from '../../src/components/nexus-os/registries/operationArchetypeRegistry';
import {
  createOperation,
  resetOperationServiceState,
  updateStatus,
} from '../../src/components/nexus-os/services/operationService';
import {
  createObjective,
  createPhase,
  createTask,
  listObjectives,
  listPhases,
  listTasks,
  resetPlanningServiceState,
} from '../../src/components/nexus-os/services/planningService';
import {
  getOrCreateRSVPPolicy,
  listRSVPPolicies,
  updateRSVPPolicy,
  resetRsvpServiceState,
} from '../../src/components/nexus-os/services/rsvpService';
import {
  initializeOperationEnhancements,
  getOperationMandateProfile,
  resetOperationEnhancementServiceState,
  upsertAssetMandate,
  upsertLoadoutMandate,
  upsertRoleMandate,
} from '../../src/components/nexus-os/services/operationEnhancementService';

function applySeed(opId: string, archetypeId: 'INDUSTRIAL_MINING' | 'INDUSTRIAL_SALVAGE' | 'PVP_ORG_V_ORG', actorId = 'owner-1') {
  const archetype = getOperationArchetype(archetypeId);
  archetype.seedBundle.objectives.forEach((objective) =>
    createObjective({
      opId,
      title: objective.title,
      priority: objective.priority,
      status: 'OPEN',
      createdBy: actorId,
    })
  );
  archetype.seedBundle.phases.forEach((phase, index) =>
    createPhase({
      opId,
      title: phase.title,
      timeHint: phase.timeHint,
      orderIndex: index,
      status: 'OPEN',
    })
  );
  archetype.seedBundle.tasks.forEach((task) =>
    createTask({
      opId,
      domain: task.domain,
      title: task.title,
      status: 'OPEN',
      createdBy: actorId,
    })
  );
  getOrCreateRSVPPolicy(opId, archetype.defaults.posture);
  updateRSVPPolicy(
    opId,
    archetype.seedBundle.requirementRules.map((rule, index) => ({
      id: `${archetype.id.toLowerCase()}_rule_${index + 1}`,
      enforcement: rule.enforcement,
      kind: rule.kind,
      predicate: rule.predicate,
      message: rule.message,
    }))
  );
  initializeOperationEnhancements(opId, archetype.defaults.posture, actorId);
  archetype.seedBundle.roleMandates.forEach((mandate) => upsertRoleMandate(opId, mandate, actorId));
  archetype.seedBundle.loadoutMandates.forEach((mandate) => upsertLoadoutMandate(opId, mandate, actorId));
  archetype.seedBundle.assetMandates.forEach((mandate) => upsertAssetMandate(opId, mandate, actorId));
}

describe('operation wizard seed baselines', () => {
  beforeEach(() => {
    resetOperationServiceState();
    resetPlanningServiceState();
    resetRsvpServiceState();
    resetOperationEnhancementServiceState();
  });

  it('seeds mining archetype with planning artifacts, policy, and mandates', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Mining Seed',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      archetypeId: 'INDUSTRIAL_MINING',
      readinessGates: getOperationArchetype('INDUSTRIAL_MINING').seedBundle.readinessGates.map((gate, index) => ({
        id: `gate_${index + 1}`,
        label: gate.label,
        ownerRole: gate.ownerRole,
        required: gate.required,
        status: 'PENDING',
        note: '',
        updatedAt: new Date().toISOString(),
        updatedBy: 'owner-1',
      })),
    });
    applySeed(op.id, 'INDUSTRIAL_MINING');

    expect(listObjectives(op.id).length).toBeGreaterThanOrEqual(2);
    expect(listPhases(op.id).length).toBeGreaterThanOrEqual(5);
    expect(listTasks(op.id).length).toBeGreaterThan(0);
    expect(listRSVPPolicies().find((entry) => entry.opId === op.id)?.rules.length).toBeGreaterThan(0);
    const mandates = getOperationMandateProfile(op.id);
    expect(mandates?.roleMandates.length || 0).toBeGreaterThan(0);
    expect(mandates?.assetMandates.length || 0).toBeGreaterThan(0);
  });

  it('seeds pvp archetype with expected baseline shape', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'PvP Seed',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-pyro' },
      archetypeId: 'PVP_ORG_V_ORG',
      readinessGates: getOperationArchetype('PVP_ORG_V_ORG').seedBundle.readinessGates.map((gate, index) => ({
        id: `gate_${index + 1}`,
        label: gate.label,
        ownerRole: gate.ownerRole,
        required: gate.required,
        status: 'PENDING',
        note: '',
        updatedAt: new Date().toISOString(),
        updatedBy: 'owner-1',
      })),
    });
    applySeed(op.id, 'PVP_ORG_V_ORG');

    expect(listPhases(op.id).length).toBeGreaterThanOrEqual(6);
    const mandates = getOperationMandateProfile(op.id);
    expect(mandates?.roleMandates.some((entry) => entry.role.toLowerCase().includes('commander'))).toBe(true);
  });

  it('seeds salvage archetype with expected baseline shape', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Salvage Seed',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      archetypeId: 'INDUSTRIAL_SALVAGE',
      readinessGates: getOperationArchetype('INDUSTRIAL_SALVAGE').seedBundle.readinessGates.map((gate, index) => ({
        id: `gate_${index + 1}`,
        label: gate.label,
        ownerRole: gate.ownerRole,
        required: gate.required,
        status: 'PENDING',
        note: '',
        updatedAt: new Date().toISOString(),
        updatedBy: 'owner-1',
      })),
    });
    applySeed(op.id, 'INDUSTRIAL_SALVAGE');

    expect(listPhases(op.id).length).toBeGreaterThanOrEqual(6);
    const mandates = getOperationMandateProfile(op.id);
    expect(mandates?.roleMandates.some((entry) => entry.role.toLowerCase().includes('salvage'))).toBe(true);
  });

  it('defaults operation release track to live 4.6 when not specified', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Release Track Default',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
    });
    expect(op.releaseTrack).toBe('LIVE_4_6');
  });

  it('requires override reason when activating with pending required readiness gates', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Gate Override',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      readinessGates: [
        {
          id: 'gate_1',
          label: 'ROE Acknowledged',
          ownerRole: 'Commander',
          required: true,
          status: 'PENDING',
          note: '',
          updatedAt: new Date().toISOString(),
          updatedBy: 'owner-1',
        },
      ],
    });

    expect(() => updateStatus(op.id, 'ACTIVE', 'owner-1')).toThrow(/override reason/i);
    expect(() =>
      updateStatus(op.id, 'ACTIVE', 'owner-1', Date.now(), { overrideReason: 'Training lane force activation.' })
    ).not.toThrow();
  });

  it('hydrates legacy mining scenario fields into tier-aware defaults', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Legacy Mining',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      archetypeId: 'INDUSTRIAL_MINING',
      scenarioConfig: {
        mining: {
          variantId: 'MINING_ASTEROID_0G',
          oreTargets: ['Quantanium'],
          routePlan: 'Legacy route',
          refineryPlan: 'Legacy refine',
          escortPolicy: 'Legacy escort',
          economics: {
            estimatedYieldScu: 100,
            estimatedUnitValueAuec: 6000,
            estimatedFuelCostAuec: 50000,
            estimatedRiskReserveAuec: 20000,
            evidenceRefs: [],
          },
        },
      } as any,
    });

    expect(op.scenarioConfig?.mining?.tier).toBe('SHIP_SPACE');
    expect(op.scenarioConfig?.mining?.environment).toBe('SPACE_BELT');
    expect(op.scenarioConfig?.mining?.extractionMethod).toBe('SHIP_LASER');
  });

  it('hydrates legacy pvp scenario fields into profile-aware defaults', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Legacy PvP',
      posture: 'FOCUSED',
      status: 'PLANNING',
      ao: { nodeId: 'system-pyro' },
      archetypeId: 'PVP_ORG_V_ORG',
      scenarioConfig: {
        pvp: {
          variantId: 'CONVOY_ESCORT',
          objectiveType: 'Convoy Integrity',
          rulesOfEngagement: 'Defensive fire only.',
          rallyPoints: ['RP-A'],
          qrfPlan: 'Legacy qrf',
          evacPlan: 'Legacy evac',
          opposingForce: {
            orgName: 'Rival Org',
            doctrineSummary: '',
            estimatedStrength: 'unknown',
            assetProfile: '',
          },
        },
      } as any,
    });

    expect(op.scenarioConfig?.pvp?.environment).toBe('SPACE');
    expect(op.scenarioConfig?.pvp?.engagementProfile).toBe('CONVOY_ESCORT');
    expect(op.scenarioConfig?.pvp?.opsecLevel).toBe('RESTRICTED');
    expect(op.scenarioConfig?.pvp?.opposingForce.intelConfidence).toBe('MEDIUM');
  });

  it('hydrates legacy salvage scenario fields into profile-aware defaults', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Legacy Salvage',
      posture: 'CASUAL',
      status: 'PLANNING',
      ao: { nodeId: 'system-stanton' },
      archetypeId: 'INDUSTRIAL_SALVAGE',
      scenarioConfig: {
        salvage: {
          variantId: 'SALVAGE_RECOVERY_HOT_ZONE',
          objectiveType: 'Rapid Recovery',
          targetWreckType: 'Medium wreck',
          claimJurisdiction: 'Local authority',
          routePlan: 'Legacy salvage route',
          processingPlan: 'Legacy processing',
          escortPolicy: 'Legacy escort',
          inventoryPolicy: 'Legacy inventory',
          hazardTags: ['debris'],
          economics: {
            projectedRmcScu: 100,
            projectedCmScu: 50,
            projectedCargoScu: 40,
            projectedGrossAuec: 600000,
            projectedFuelCostAuec: 50000,
            projectedProcessingCostAuec: 40000,
            projectedRiskReserveAuec: 20000,
            evidenceRefs: [],
          },
          telemetryProjection: {
            hullRecoveredPct: 65,
            componentsRecovered: 8,
            cargoRecoveredScu: 40,
            cycleTimeMinutes: 18,
            contaminationIncidents: 0,
          },
          riskProfile: {
            threatBand: 'MEDIUM',
            legalExposure: 'MEDIUM',
            interdictionRisk: 'MEDIUM',
            hazardTags: ['debris'],
          },
        },
      } as any,
    });

    expect(op.scenarioConfig?.salvage?.mode).toBe('CONTESTED_RECOVERY');
    expect(op.scenarioConfig?.salvage?.environment).toBe('CONTESTED_ZONE');
    expect(op.scenarioConfig?.salvage?.extractionMethod).toBe('MULTI_TOOL');
  });
});
