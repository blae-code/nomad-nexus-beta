import { describe, expect, it } from 'vitest';
import { buildMapAiPrompt, computeMapInference } from '../../src/components/nexus-os/services/mapInferenceService';

describe('mapInferenceService', () => {
  it('computes bounded risk/confidence metrics from scoped evidence', () => {
    const snapshot = computeMapInference({
      controlZones: [
        {
          id: 'zone-1',
          scope: 'region',
          geometryHint: { nodeId: 'body-hurston' },
          assertedControllers: [],
          contestationLevel: 0.62,
          signals: [
            {
              type: 'PRESENCE_DECLARED',
              sourceRef: { id: 'src-1', kind: 'presence' },
              weight: 0.7,
              confidence: 0.6,
              occurredAt: '2026-02-10T08:00:00.000Z',
              expiresAt: '2026-02-10T09:00:00.000Z',
            },
          ],
          ttlProfileId: 'TTL-CONTROL-ZONE-DEFAULT',
          createdAt: '2026-02-10T08:00:00.000Z',
          updatedAt: '2026-02-10T08:00:00.000Z',
        },
      ] as any,
      commsOverlay: {
        generatedAt: '2026-02-10T08:00:00.000Z',
        scopedOpId: 'op-1',
        nets: [
          {
            id: 'net-1',
            label: 'Alpha',
            code: 'ALPHA',
            eventId: 'op-1',
            nodeId: 'body-hurston',
            participants: 6,
            speaking: 2,
            muted: 1,
            trafficScore: 18,
            quality: 'CONTESTED',
            discipline: 'FOCUSED',
          },
        ],
        links: [],
        callouts: [
          {
            id: 'call-1',
            eventId: 'op-1',
            netId: 'net-1',
            nodeId: 'body-hurston',
            lane: 'COMMAND',
            priority: 'CRITICAL',
            message: 'Break contact.',
            createdDate: '2026-02-10T08:10:00.000Z',
            ageSeconds: 20,
            stale: false,
            captureMode: 'MANUAL_ONLY',
            evidenceSource: 'OPERATOR_FORM',
            commandSource: 'map_action',
            confirmed: true,
            confirmedAt: '2026-02-10T08:10:00.000Z',
            policyVersion: 'nexus-acquisition-v1',
          },
        ],
      },
      intelObjects: [
        {
          id: 'intel-1',
          ttl: { stale: true, remainingSeconds: 0, decayRatio: 0 },
        },
      ] as any,
      operations: [{ id: 'op-1', name: 'Focused Op' }] as any,
      focusOperationId: 'op-1',
      nowMs: Date.parse('2026-02-10T08:11:00.000Z'),
    });

    expect(snapshot.commandRiskScore).toBeGreaterThan(0);
    expect(snapshot.commandRiskScore).toBeLessThanOrEqual(100);
    expect(snapshot.confidenceScore).toBeGreaterThan(0);
    expect(snapshot.recommendations.length).toBeGreaterThan(0);
    expect(snapshot.factors.length).toBe(4);
    expect(snapshot.factors.map((factor) => factor.id)).toEqual(['zones', 'comms', 'intel', 'tempo']);
    expect(snapshot.prioritizedActions.length).toBeGreaterThan(0);
    expect(snapshot.prioritizedActions[0].priority).toBe('NOW');
    expect(snapshot.projectedLoadBand).toBe('LOW');
    expect(snapshot.complianceDiagnostics).toMatchObject({
      mode: 'MANUAL_ONLY',
      strictCompliance: true,
      includedCallouts: 1,
      droppedCallouts: 0,
    });
  });

  it('builds deterministic AI prompt from inference snapshot', () => {
    const inference = computeMapInference({
      controlZones: [],
      commsOverlay: { generatedAt: null, scopedOpId: '', nets: [], links: [], callouts: [] },
      intelObjects: [],
      operations: [],
      nowMs: Date.parse('2026-02-10T08:00:00.000Z'),
    });

    const promptA = buildMapAiPrompt(inference);
    const promptB = buildMapAiPrompt(inference);
    expect(promptA).toEqual(promptB);
    expect(promptA).toContain('Do not invent telemetry');
    expect(promptA).toContain('Risk score');
    expect(promptA).toContain('Prioritized actions');
  });

  it('drops untrusted/missing-metadata callouts in strict MANUAL_ONLY mode', () => {
    const snapshot = computeMapInference({
      controlZones: [],
      commsOverlay: {
        generatedAt: '2026-02-10T08:00:00.000Z',
        scopedOpId: 'op-2',
        nets: [
          {
            id: 'net-2',
            label: 'Bravo',
            code: 'BRV',
            eventId: 'op-2',
            nodeId: 'body-hurston',
            participants: 4,
            speaking: 1,
            muted: 0,
            trafficScore: 10,
            quality: 'DEGRADED',
            discipline: 'FOCUSED',
          },
        ],
        links: [],
        callouts: [
          {
            id: 'call-untrusted',
            eventId: 'op-2',
            netId: 'net-2',
            nodeId: 'body-hurston',
            lane: 'COMMAND',
            priority: 'CRITICAL',
            message: 'No provenance metadata',
            createdDate: '2026-02-10T08:09:00.000Z',
            ageSeconds: 10,
            stale: false,
          },
        ],
      } as any,
      intelObjects: [],
      operations: [{ id: 'op-2', name: 'Inference Filter Test' }] as any,
      focusOperationId: 'op-2',
      nowMs: Date.parse('2026-02-10T08:11:00.000Z'),
    });

    expect(snapshot.criticalCalloutCount).toBe(0);
    expect(snapshot.complianceDiagnostics).toMatchObject({
      totalCallouts: 1,
      includedCallouts: 0,
      droppedCallouts: 1,
      missingMetadataCallouts: 1,
    });
  });
});

