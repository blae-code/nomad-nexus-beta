import { beforeEach, describe, expect, it } from 'vitest';
import {
  createOperation,
  resetOperationServiceState,
} from '../../src/components/nexus-os/services/operationService';

describe('operation alias normalization', () => {
  beforeEach(() => {
    resetOperationServiceState();
  });

  it('normalizes mining variant aliases to canonical ids', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Mining Alias',
      ao: { nodeId: 'system-stanton' },
      scenarioConfig: {
        mining: {
          variantId: 'MINING_GROUND',
          oreTargets: ['Quantanium'],
          routePlan: 'A',
          refineryPlan: 'B',
          escortPolicy: 'C',
          economics: {
            estimatedYieldScu: 1,
            estimatedUnitValueAuec: 1,
            estimatedFuelCostAuec: 0,
            estimatedRiskReserveAuec: 0,
            evidenceRefs: [],
          },
        },
      } as any,
    });

    expect(op.scenarioConfig?.mining?.variantId).toBe('MINING_GEO');
  });

  it('normalizes salvage variant and extraction aliases', () => {
    const op = createOperation({
      createdBy: 'owner-1',
      name: 'Salvage Alias',
      ao: { nodeId: 'system-stanton' },
      scenarioConfig: {
        salvage: {
          variantId: 'SALVAGE_SURFACE_RECOVERY',
          extractionMethod: 'DRONE',
          objectiveType: 'Recovery',
          targetWreckType: 'Wreck',
          claimJurisdiction: 'Claim',
          routePlan: 'Route',
          processingPlan: 'Process',
          escortPolicy: 'Escort',
          inventoryPolicy: 'Inventory',
          hazardTags: [],
          riskProfile: {
            threatBand: 'MEDIUM',
            legalExposure: 'MEDIUM',
            interdictionRisk: 'MEDIUM',
            hazardTags: [],
          },
          telemetryProjection: {
            hullRecoveredPct: 0,
            componentsRecovered: 0,
            cargoRecoveredScu: 0,
            cycleTimeMinutes: 0,
            contaminationIncidents: 0,
          },
          economics: {
            projectedRmcScu: 0,
            projectedCmScu: 0,
            projectedCargoScu: 0,
            projectedGrossAuec: 0,
            projectedFuelCostAuec: 0,
            projectedProcessingCostAuec: 0,
            projectedRiskReserveAuec: 0,
            evidenceRefs: [],
          },
          companionLink: { enabled: false, source: 'NONE', externalRefs: [] },
        },
      } as any,
    });

    expect(op.scenarioConfig?.salvage?.variantId).toBe('SALVAGE_SURFACE_WRECK_RECOVERY');
    expect(op.scenarioConfig?.salvage?.extractionMethod).toBe('SALVAGE_DRONE');
  });

  it('normalizes pvp variant aliases while preserving unknown legacy ids', () => {
    const pvp = createOperation({
      createdBy: 'owner-1',
      name: 'PvP Alias',
      ao: { nodeId: 'system-pyro' },
      scenarioConfig: {
        pvp: {
          variantId: 'PVP_BOARDING',
          objectiveType: 'Board',
          commandIntent: 'Capture',
          rulesOfEngagement: 'Weapons free',
          opsecLevel: 'RESTRICTED',
          rallyPoints: [],
          ingressPlan: '',
          qrfPlan: '',
          sustainmentPlan: '',
          evacPlan: '',
          deconflictionPlan: '',
          intelRefs: [],
          forceProjection: { friendlyPlanned: 1, hostileEstimated: 1, qrfReserve: 0, medevacReserve: 0 },
          riskProfile: { threatBand: 'MEDIUM', cyberEwarRisk: 'MEDIUM', deceptionRisk: 'MEDIUM' },
          telemetryProjection: { objectiveControlTargetPct: 0, casualtyCap: 0, currentCasualties: 0, commsDisruptions: 0, reactionLatencySec: 0 },
          companionLink: { enabled: false, source: 'NONE', externalRefs: [] },
          opposingForce: {
            orgName: 'Opposing Org',
            doctrineSummary: '',
            estimatedStrength: 'unknown',
            assetProfile: '',
            intelConfidence: 'MEDIUM',
          },
        },
      } as any,
    });

    expect(pvp.scenarioConfig?.pvp?.variantId).toBe('PVP_CQB_BOARDING');

    const legacy = createOperation({
      createdBy: 'owner-1',
      name: 'Legacy Variant',
      ao: { nodeId: 'system-stanton' },
      scenarioConfig: {
        salvage: {
          variantId: 'LEGACY_SALVAGE_ALPHA',
          extractionMethod: 'HULL_SCRAPER',
          objectiveType: 'Legacy',
          targetWreckType: '',
          claimJurisdiction: '',
          routePlan: '',
          processingPlan: '',
          escortPolicy: '',
          inventoryPolicy: '',
          hazardTags: [],
          riskProfile: {
            threatBand: 'MEDIUM',
            legalExposure: 'MEDIUM',
            interdictionRisk: 'MEDIUM',
            hazardTags: [],
          },
          telemetryProjection: {
            hullRecoveredPct: 0,
            componentsRecovered: 0,
            cargoRecoveredScu: 0,
            cycleTimeMinutes: 0,
            contaminationIncidents: 0,
          },
          economics: {
            projectedRmcScu: 0,
            projectedCmScu: 0,
            projectedCargoScu: 0,
            projectedGrossAuec: 0,
            projectedFuelCostAuec: 0,
            projectedProcessingCostAuec: 0,
            projectedRiskReserveAuec: 0,
            evidenceRefs: [],
          },
          companionLink: { enabled: false, source: 'NONE', externalRefs: [] },
        },
      } as any,
    });

    expect(legacy.scenarioConfig?.salvage?.variantId).toBe('LEGACY_SALVAGE_ALPHA');
    expect(legacy.scenarioConfig?.salvage?.extractionMethod).toBe('SCRAPER');
  });
});
