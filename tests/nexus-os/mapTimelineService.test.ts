import { describe, expect, it } from 'vitest';
import { buildMapTimelineSnapshot } from '../../src/nexus-os/services/mapTimelineService';

describe('mapTimelineService', () => {
  it('builds deterministic replay windows with mixed-source entries', () => {
    const nowMs = Date.parse('2026-02-11T12:00:00.000Z');
    const snapshot = buildMapTimelineSnapshot({
      opId: 'op-1',
      nowMs,
      windowMinutes: 30,
      offsetMinutes: 5,
      events: [
        {
          id: 'evt-1',
          opId: 'op-1',
          kind: 'DECLARE_DEPARTURE',
          payload: { notes: 'Departing Hurston', priority: 'HIGH' },
          createdBy: 'ce-warden',
          createdAt: '2026-02-11T11:48:00.000Z',
        },
        {
          id: 'evt-2',
          opId: 'op-2',
          kind: 'DECLARE_DEPARTURE',
          payload: { notes: 'Different op' },
          createdBy: 'ce-warden',
          createdAt: '2026-02-11T11:55:00.000Z',
        },
      ] as any,
      commsOverlay: {
        callouts: [
          {
            id: 'call-1',
            eventId: 'op-1',
            netId: 'net-a',
            nodeId: 'body-hurston',
            lane: 'COMMAND',
            priority: 'CRITICAL',
            message: 'Priority lane',
            createdDate: '2026-02-11T11:47:00.000Z',
            ageSeconds: 10,
            stale: false,
          },
        ],
        commandBus: [
          {
            id: 'bus-1',
            eventId: 'op-1',
            netId: 'net-a',
            nodeId: 'body-hurston',
            action: 'PRIORITY_OVERRIDE',
            payload: { level: 'HIGH' },
            actorMemberProfileId: 'ce-warden',
            createdDate: '2026-02-11T11:42:00.000Z',
          },
        ],
        speakRequests: [
          {
            requestId: 'sr-1',
            eventId: 'op-1',
            netId: 'net-a',
            nodeId: 'body-hurston',
            requesterMemberProfileId: 'member-2',
            status: 'PENDING',
            reason: 'Request tx',
            createdDate: '2026-02-11T11:58:30.000Z',
            resolvedAt: null,
            resolvedByMemberProfileId: '',
          },
        ],
      },
    });

    expect(snapshot.entries.some((entry) => entry.id === 'op:evt-1')).toBe(true);
    expect(snapshot.entries.some((entry) => entry.id === 'op:evt-2')).toBe(false);
    expect(snapshot.entries.some((entry) => entry.source === 'COMMS_CALLOUT')).toBe(true);
    expect(snapshot.visibleEntries.length).toBeGreaterThan(0);
    expect(snapshot.replayCursorMs).toBe(nowMs - 5 * 60_000);
  });
});
