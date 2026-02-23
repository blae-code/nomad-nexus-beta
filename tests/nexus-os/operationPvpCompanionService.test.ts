import { describe, expect, it } from 'vitest';
import type { Operation } from '../../src/components/nexus-os/schemas/opSchemas';
import { derivePvpExecutionSnapshot, isPvpOperation } from '../../src/components/nexus-os/services/operationPvpCompanionService';

function makePvpOperation(): Operation {
  return {
    id: 'op-pvp-1',
    name: 'Convoy Clash',
    posture: 'FOCUSED',
    status: 'PLANNING',
    domains: { fps: true, ground: true, airSpace: true, logistics: true },
    createdBy: 'cmd-1',
    createdAt: '2026-02-22T10:00:00.000Z',
    updatedAt: '2026-02-22T10:00:00.000Z',
    ao: { nodeId: 'system-pyro' },
    commsTemplateId: 'COMMAND_NET',
    ttlProfileId: 'TTL-OP-FOCUSED',
    permissions: {
      ownerIds: ['cmd-1'],
      commanderIds: ['cmd-1'],
      participantIds: ['cmd-1', 'lead-1', 'pilot-1'],
    },
    archetypeId: 'PVP_ORG_V_ORG',
    securityProjection: {
      redactedOpponentLabel: 'Opposing Org (redacted)',
      redactedStrengthBand: 'MEDIUM',
      notes: 'Restricted for command only.',
    },
    scenarioConfig: {
      pvp: {
        variantId: 'CONVOY_ESCORT',
        environment: 'SPACE',
        engagementProfile: 'CONVOY_ESCORT',
        objectiveType: 'Convoy Integrity',
        commandIntent: 'Protect convoy and deny interdiction lanes.',
        rulesOfEngagement: 'Defensive fire on lock-confirmed hostiles.',
        opsecLevel: 'RESTRICTED',
        rallyPoints: ['RP-A'],
        ingressPlan: 'Screen sweep before jump.',
        qrfPlan: 'Reserve flight staged one jump behind.',
        sustainmentPlan: 'Fuel checks every leg.',
        evacPlan: 'Damaged craft route to med waypoint.',
        deconflictionPlan: 'IFF gate and fire lanes established.',
        intelRefs: ['intel:pack-1'],
        forceProjection: {
          friendlyPlanned: 14,
          hostileEstimated: 18,
          qrfReserve: 4,
          medevacReserve: 2,
        },
        riskProfile: {
          threatBand: 'HIGH',
          cyberEwarRisk: 'MEDIUM',
          deceptionRisk: 'MEDIUM',
        },
        telemetryProjection: {
          objectiveControlTargetPct: 65,
          casualtyCap: 6,
          currentCasualties: 5,
          commsDisruptions: 4,
          reactionLatencySec: 16,
        },
        companionLink: {
          enabled: true,
          source: 'MANUAL',
          externalRefs: ['opsboard:lane-alpha'],
        },
        opposingForce: {
          orgName: 'Rival Task Force',
          doctrineSummary: 'Aggressive interdiction with feints.',
          estimatedStrength: 'heavy strike package',
          assetProfile: 'fighters + interdictor',
          intelConfidence: 'MEDIUM',
        },
      },
    },
  };
}

describe('operationPvpCompanionService', () => {
  it('builds command and participant snapshots with role-aware redaction', () => {
    const operation = makePvpOperation();
    const readiness = [
      { id: 'g1', label: 'ROE', ownerRole: 'Commander', required: true, status: 'READY', updatedAt: operation.updatedAt, updatedBy: 'cmd-1' },
      { id: 'g2', label: 'QRF', ownerRole: 'Support', required: true, status: 'PENDING', updatedAt: operation.updatedAt, updatedBy: 'cmd-1' },
    ];
    const commandView = derivePvpExecutionSnapshot(operation, readiness, 'COMMAND');
    const participantView = derivePvpExecutionSnapshot(operation, readiness, 'PARTICIPANT');

    expect(commandView).not.toBeNull();
    expect(commandView?.redacted).toBe(false);
    expect(commandView?.opponentLabel).toBe('Rival Task Force');
    expect(participantView?.redacted).toBe(true);
    expect(participantView?.opponentLabel).toContain('redacted');
    expect(participantView?.commandIntent).toMatch(/restricted/i);
  });

  it('emits warnings for force deficit and telemetry risk', () => {
    const operation = makePvpOperation();
    const readiness = [
      { id: 'g1', label: 'ROE', ownerRole: 'Commander', required: true, status: 'PENDING', updatedAt: operation.updatedAt, updatedBy: 'cmd-1' },
    ];
    const snapshot = derivePvpExecutionSnapshot(operation, readiness, 'COMMAND');

    expect(snapshot).not.toBeNull();
    expect(snapshot?.warnings.length).toBeGreaterThan(0);
    expect(snapshot?.warnings.some((entry) => entry.includes('Friendly strength projection'))).toBe(true);
    expect(snapshot?.warnings.some((entry) => entry.includes('Comms disruption'))).toBe(true);
  });

  it('detects pvp operation by archetype/scenario', () => {
    const operation = makePvpOperation();
    expect(isPvpOperation(operation)).toBe(true);
  });
});
