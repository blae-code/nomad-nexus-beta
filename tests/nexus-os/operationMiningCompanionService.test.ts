import { describe, expect, it } from 'vitest';
import type { Operation } from '../../src/components/nexus-os/schemas/opSchemas';
import {
  buildRegolithDraft,
  buildRegolithLinks,
  deriveMiningExecutionSnapshot,
  isMiningOperation,
  summarizeMiningEconomics,
} from '../../src/components/nexus-os/services/operationMiningCompanionService';

function makeMiningOperation(): Operation {
  return {
    id: 'op-mining-1',
    name: 'Ring Sweep Prime',
    posture: 'FOCUSED',
    status: 'PLANNING',
    domains: { fps: false, ground: true, airSpace: true, logistics: true },
    createdBy: 'cmd-1',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    ao: { nodeId: 'planet-hurston' },
    commsTemplateId: 'SQUAD_NETS',
    ttlProfileId: 'TTL-OP-FOCUSED',
    permissions: {
      ownerIds: ['cmd-1'],
      commanderIds: ['cmd-1'],
      participantIds: ['cmd-1', 'miner-1'],
    },
    archetypeId: 'INDUSTRIAL_MINING',
    scenarioConfig: {
      mining: {
        variantId: 'MINING_PLANETARY_RING',
        tier: 'RING_SWEEP',
        environment: 'PLANETARY_RING',
        extractionMethod: 'SHIP_LASER',
        oreTargets: ['Quantanium', 'Bexalite'],
        routePlan: 'Ring arc alpha',
        refineryPlan: 'Refine top-tier ore first',
        escortPolicy: 'Dual escort lanes',
        stagingNodeId: 'station-eic',
        hazardTags: ['piracy'],
        riskProfile: {
          threatBand: 'HIGH',
          hazardTags: ['piracy'],
          rescueCoverage: 'Medevac standby',
        },
        regolithLink: {
          enabled: true,
          source: 'REGOLITH',
          sessionId: 'session-22',
          workOrderId: 'work-44',
          scoutingFindRefs: ['find-a'],
        },
        telemetryProjection: {
          fractureSuccessRatePct: 81,
          overchargeIncidents: 2,
          recoveredScu: 140,
          idleHaulMinutes: 24,
          refineryQueueMinutes: 18,
        },
        economics: {
          estimatedYieldScu: 160,
          estimatedUnitValueAuec: 7200,
          estimatedFuelCostAuec: 100000,
          estimatedRiskReserveAuec: 45000,
          evidenceRefs: ['market:orison'],
        },
      },
    },
  };
}

describe('operationMiningCompanionService', () => {
  it('derives execution snapshot and warnings from mining scenario', () => {
    const operation = makeMiningOperation();
    const snapshot = deriveMiningExecutionSnapshot(operation, [
      { id: 'g1', label: 'Escort ready', ownerRole: 'Escort', required: true, status: 'PENDING', updatedAt: operation.updatedAt, updatedBy: 'cmd-1' },
      { id: 'g2', label: 'Route ready', ownerRole: 'Logistics', required: true, status: 'READY', updatedAt: operation.updatedAt, updatedBy: 'cmd-1' },
    ]);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.tier).toBe('RING_SWEEP');
    expect(snapshot?.environment).toBe('PLANETARY_RING');
    expect(snapshot?.regolithStatus).toBe('LINKED');
    expect(snapshot?.grossAuec).toBe(1_152_000);
    expect(snapshot?.netAuec).toBe(1_007_000);
    expect(snapshot?.warnings.length).toBeGreaterThan(0);
  });

  it('builds regolith links and draft payload', () => {
    const operation = makeMiningOperation();
    const links = buildRegolithLinks(operation);
    const draft = buildRegolithDraft(operation);

    expect(links.length).toBe(2);
    expect(links[0].url).toContain('app.regolith.rocks');
    expect(draft?.variantId).toBe('MINING_PLANETARY_RING');
    expect(draft?.oreTargets.length).toBe(2);
  });

  it('detects mining operation context and computes economics summary', () => {
    const operation = makeMiningOperation();
    const economics = summarizeMiningEconomics(operation.scenarioConfig!.mining!.economics);

    expect(isMiningOperation(operation)).toBe(true);
    expect(economics.grossAuec).toBe(1_152_000);
    expect(economics.netAuec).toBe(1_007_000);
  });
});
