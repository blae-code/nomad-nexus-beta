import { describe, expect, it } from 'vitest';
import type { Operation } from '../../src/components/nexus-os/schemas/opSchemas';
import {
  deriveSalvageExecutionSnapshot,
  isSalvageOperation,
  summarizeSalvageEconomics,
} from '../../src/components/nexus-os/services/operationSalvageCompanionService';

function makeSalvageOperation(): Operation {
  return {
    id: 'op-salvage-1',
    name: 'Derelict Sweep',
    posture: 'CASUAL',
    status: 'PLANNING',
    domains: { fps: false, ground: true, airSpace: true, logistics: true },
    createdBy: 'lead-1',
    createdAt: '2026-02-23T00:00:00.000Z',
    updatedAt: '2026-02-23T00:00:00.000Z',
    ao: { nodeId: 'system-stanton' },
    commsTemplateId: 'SQUAD_NETS',
    ttlProfileId: 'TTL-OP-CASUAL',
    permissions: {
      ownerIds: ['lead-1'],
      commanderIds: ['lead-1'],
      participantIds: ['lead-1', 'crew-1'],
    },
    archetypeId: 'INDUSTRIAL_SALVAGE',
    scenarioConfig: {
      salvage: {
        variantId: 'SALVAGE_HULL_STRIP',
        mode: 'HULL_STRIP',
        environment: 'SPACE_DERELICT',
        extractionMethod: 'SCRAPER',
        objectiveType: 'RMC Yield',
        targetWreckType: 'Large hull',
        claimJurisdiction: 'Contracted claim',
        routePlan: 'Alpha salvage route',
        processingPlan: 'RMC priority processing',
        escortPolicy: 'Escort lane cover',
        inventoryPolicy: 'RMC-first manifest',
        hazardTags: ['debris'],
        riskProfile: {
          threatBand: 'MEDIUM',
          legalExposure: 'MEDIUM',
          interdictionRisk: 'MEDIUM',
          hazardTags: ['debris'],
        },
        telemetryProjection: {
          hullRecoveredPct: 75,
          componentsRecovered: 10,
          cargoRecoveredScu: 95,
          cycleTimeMinutes: 22,
          contaminationIncidents: 1,
        },
        economics: {
          projectedRmcScu: 300,
          projectedCmScu: 120,
          projectedCargoScu: 90,
          projectedGrossAuec: 1_900_000,
          projectedFuelCostAuec: 150_000,
          projectedProcessingCostAuec: 120_000,
          projectedRiskReserveAuec: 80_000,
          evidenceRefs: ['market:rmc'],
        },
        companionLink: {
          enabled: true,
          source: 'MANUAL',
          externalRefs: ['salvage-board:lane-a'],
        },
      },
    },
  };
}

describe('operationSalvageCompanionService', () => {
  it('builds salvage execution snapshot with projections and warnings', () => {
    const operation = makeSalvageOperation();
    const snapshot = deriveSalvageExecutionSnapshot(operation, [
      { id: 'g1', label: 'Claim', ownerRole: 'Lead', required: true, status: 'READY', updatedAt: operation.updatedAt, updatedBy: 'lead-1' },
      { id: 'g2', label: 'Escort', ownerRole: 'Escort', required: true, status: 'PENDING', updatedAt: operation.updatedAt, updatedBy: 'lead-1' },
    ]);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.variantLabel).toContain('Hull');
    expect(snapshot?.projectedGrossAuec).toBe(1_900_000);
    expect(snapshot?.projectedNetAuec).toBe(1_550_000);
    expect(snapshot?.warnings.length).toBeGreaterThan(0);
  });

  it('computes salvage economics summary deterministically', () => {
    const operation = makeSalvageOperation();
    const economics = summarizeSalvageEconomics(operation.scenarioConfig!.salvage!.economics);

    expect(economics.projectedGrossAuec).toBe(1_900_000);
    expect(economics.projectedNetAuec).toBe(1_550_000);
  });

  it('detects salvage operation context', () => {
    const operation = makeSalvageOperation();
    expect(isSalvageOperation(operation)).toBe(true);
  });
});
