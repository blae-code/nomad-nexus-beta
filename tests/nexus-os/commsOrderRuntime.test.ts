import { describe, expect, it } from 'vitest';
import {
  appendOrderDispatch,
  buildDeliveryStats,
  buildDeliverySurface,
  buildPagedOrders,
  createOrderDispatch,
  deliveryTone,
  INCIDENT_EVENT_BY_STATUS,
  ORDER_LIST_PAGE_SIZE,
} from '../../src/components/nexus-os/ui/comms/commsOrderRuntime';

describe('commsOrderRuntime', () => {
  it('creates and caps dispatch history', () => {
    const first = createOrderDispatch({
      channelId: 'command',
      directive: 'REROUTE_TRAFFIC',
      eventType: 'MOVE_OUT',
      nowMs: 1700000000000,
    });

    const second = createOrderDispatch({
      channelId: 'alpha',
      directive: 'CHECK_IN_REQUEST',
      eventType: 'SELF_CHECK',
      nowMs: 1700000001000,
    });

    const capped = appendOrderDispatch([first], second, 1);
    expect(capped).toHaveLength(1);
    expect(capped[0].channelId).toBe('alpha');
  });

  it('reconciles dispatch state and computes paged feed stats', () => {
    const dispatch = createOrderDispatch({
      channelId: 'command',
      directive: 'REROUTE_TRAFFIC',
      eventType: 'MOVE_OUT',
      nowMs: 1700000000000,
    });

    const events = [
      {
        id: 'evt-1',
        createdAt: '2024-01-01T00:00:02.000Z',
        eventType: 'MOVE_OUT',
        channelId: 'command',
        payload: { dispatchId: dispatch.dispatchId, directive: 'REROUTE_TRAFFIC' },
      },
      {
        id: 'evt-2',
        createdAt: '2024-01-01T00:00:03.000Z',
        eventType: 'ROGER',
        channelId: 'command',
        payload: {},
      },
    ];

    const surface = buildDeliverySurface({ dispatches: [dispatch], events, incidents: [], nowMs: 1700000004000 });
    expect(surface).toHaveLength(1);
    expect(surface[0].status).toBe('ACKED');

    const stats = buildDeliveryStats(surface);
    expect(stats.total).toBe(1);
    expect(stats.acked).toBe(1);
    expect(stats.confidencePct).toBe(100);

    const paged = buildPagedOrders(surface, 0, ORDER_LIST_PAGE_SIZE);
    expect(paged.pageCount).toBe(1);
    expect(paged.visible).toHaveLength(1);
    expect(deliveryTone(surface[0].status)).toBe('ok');
  });

  it('keeps incident transition mapping stable', () => {
    expect(INCIDENT_EVENT_BY_STATUS.ACKED).toBe('ROGER');
    expect(INCIDENT_EVENT_BY_STATUS.ASSIGNED).toBe('WILCO');
    expect(INCIDENT_EVENT_BY_STATUS.RESOLVED).toBe('CLEAR_COMMS');
  });
});
