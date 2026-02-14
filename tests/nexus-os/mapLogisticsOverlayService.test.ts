import { describe, expect, it } from 'vitest';
import {
  buildMapLogisticsOverlay,
  createEmptyMapLogisticsOverlay,
} from '../../src/components/nexus-os/services/mapLogisticsOverlayService';
import { TACTICAL_MAP_NODES } from '../../src/components/nexus-os/ui/map/mapBoard';

describe('mapLogisticsOverlayService', () => {
  it('builds scoped logistics lanes from operation events', () => {
    const overlay = buildMapLogisticsOverlay({
      opId: 'op-1',
      mapNodes: TACTICAL_MAP_NODES,
      nowMs: Date.parse('2026-02-11T12:10:00.000Z'),
      events: [
        {
          id: 'evt-1',
          opId: 'op-1',
          kind: 'DECLARE_DEPARTURE',
          createdBy: 'ce-warden',
          createdAt: '2026-02-11T12:00:00.000Z',
          payload: {
            route: 'Hurston -> Daymar',
            confidence: 0.8,
            ttlSeconds: 1200,
          },
        },
        {
          id: 'evt-2',
          opId: 'op-2',
          kind: 'DECLARE_DEPARTURE',
          createdBy: 'ce-warden',
          createdAt: '2026-02-11T12:00:00.000Z',
          payload: { route: 'ArcCorp -> Wala' },
        },
      ] as any,
    });

    expect(overlay.scopedOpId).toBe('op-1');
    expect(overlay.lanes.length).toBe(1);
    expect(overlay.lanes[0]).toMatchObject({
      sourceKind: 'operation_event',
      laneKind: 'MOVE',
      fromNodeId: 'body-hurston',
      toNodeId: 'body-daymar',
    });
  });

  it('adds route hypotheses when node ids are valid', () => {
    const overlay = buildMapLogisticsOverlay({
      mapNodes: TACTICAL_MAP_NODES,
      events: [],
      routeHypotheses: [
        {
          fromNodeId: 'body-arccorp',
          toNodeId: 'body-microtech',
          notes: 'Industrial transfer lane',
          derivedFrom: [{ kind: 'other', id: 'sample-1' }],
        },
      ],
    });

    expect(overlay.lanes.length).toBe(1);
    expect(overlay.lanes[0]).toMatchObject({
      sourceKind: 'route_hypothesis',
      laneKind: 'ROUTE_HYPOTHESIS',
      fromNodeId: 'body-arccorp',
      toNodeId: 'body-microtech',
    });
  });

  it('marks logistics lanes stale when ttl has elapsed', () => {
    const overlay = buildMapLogisticsOverlay({
      opId: 'op-1',
      mapNodes: TACTICAL_MAP_NODES,
      nowMs: Date.parse('2026-02-11T12:20:00.000Z'),
      events: [
        {
          id: 'evt-3',
          opId: 'op-1',
          kind: 'DECLARE_HOLD',
          createdBy: 'ce-warden',
          createdAt: '2026-02-11T12:00:00.000Z',
          payload: {
            fromNodeId: 'body-hurston',
            toNodeId: 'body-daymar',
            ttlSeconds: 60,
          },
        },
      ] as any,
    });

    expect(overlay.lanes.length).toBe(1);
    expect(overlay.lanes[0].stale).toBe(true);
    expect(createEmptyMapLogisticsOverlay().lanes.length).toBe(0);
  });
});


