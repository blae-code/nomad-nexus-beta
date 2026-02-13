import { describe, expect, it } from 'vitest';
import { buildMapCommandSurface } from '../../src/nexus-os/services/mapCommandSurfaceService';
import { computeMapInference } from '../../src/nexus-os/services/mapInferenceService';

describe('mapCommandSurfaceService', () => {
  it('ranks alerts and recommended macros from comms + inference pressure', () => {
    const mapInference = computeMapInference({
      controlZones: [
        {
          id: 'zone-1',
          scope: 'region',
          geometryHint: { nodeId: 'body-hurston' },
          assertedControllers: [],
          contestationLevel: 0.64,
          signals: [],
          ttlProfileId: 'TTL-CONTROL',
          createdAt: '2026-02-11T11:00:00.000Z',
          updatedAt: '2026-02-11T11:00:00.000Z',
        },
      ] as any,
      commsOverlay: {
        generatedAt: '2026-02-11T11:01:00.000Z',
        scopedOpId: 'op-1',
        nets: [
          {
            id: 'net-a',
            label: 'Alpha',
            code: 'ALPHA',
            eventId: 'op-1',
            nodeId: 'body-hurston',
            participants: 8,
            speaking: 3,
            muted: 1,
            trafficScore: 20,
            quality: 'CONTESTED',
            discipline: 'FOCUSED',
          },
        ],
        links: [],
        callouts: [
          {
            id: 'call-1',
            eventId: 'op-1',
            netId: 'net-a',
            nodeId: 'body-hurston',
            lane: 'COMMAND',
            priority: 'CRITICAL',
            message: 'Lane unstable',
            createdDate: '2026-02-11T11:01:20.000Z',
            ageSeconds: 10,
            stale: false,
          },
        ],
      },
      intelObjects: [{ id: 'intel-a', ttl: { stale: true } }] as any,
      operations: [{ id: 'op-1' }] as any,
      focusOperationId: 'op-1',
      nowMs: Date.parse('2026-02-11T11:02:00.000Z'),
    });

    const surface = buildMapCommandSurface({
      mapInference,
      commsOverlay: {
        generatedAt: '2026-02-11T11:02:00.000Z',
        scopedOpId: 'op-1',
        nets: [
          {
            id: 'net-a',
            label: 'Alpha',
            code: 'ALPHA',
            eventId: 'op-1',
            nodeId: 'body-hurston',
            participants: 8,
            speaking: 3,
            muted: 1,
            trafficScore: 20,
            quality: 'CONTESTED',
            discipline: 'FOCUSED',
          },
        ],
        links: [],
        callouts: [
          {
            id: 'call-1',
            eventId: 'op-1',
            netId: 'net-a',
            nodeId: 'body-hurston',
            lane: 'COMMAND',
            priority: 'CRITICAL',
            message: 'Lane unstable',
            createdDate: '2026-02-11T11:01:20.000Z',
            ageSeconds: 10,
            stale: false,
          },
        ],
        discipline: { mode: 'REQUEST_TO_SPEAK', netId: 'net-a', eventId: 'op-1', updatedAt: '2026-02-11T11:01:00.000Z' },
        speakRequests: [
          {
            requestId: 'sr-1',
            eventId: 'op-1',
            netId: 'net-a',
            nodeId: 'body-hurston',
            requesterMemberProfileId: 'm-2',
            status: 'PENDING',
            reason: 'Need transmit',
            createdDate: '2026-02-11T11:01:30.000Z',
            resolvedAt: null,
            resolvedByMemberProfileId: '',
          },
        ],
        commandBus: [],
      },
      nowMs: Date.parse('2026-02-11T11:02:00.000Z'),
    });

    expect(surface.alerts.length).toBeGreaterThan(0);
    expect(surface.alerts[0].id).toBe('critical-callouts');
    expect(surface.recommendedMacros.some((entry) => entry.macroId === 'ISSUE_CRITICAL_CALLOUT')).toBe(true);
    expect(surface.pendingSpeakRequestCount).toBe(1);
    expect(surface.disciplineMode).toBe('REQUEST_TO_SPEAK');
  });
});
