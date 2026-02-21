import { describe, expect, it } from 'vitest';
import {
  buildCommsDirectiveThreads,
  buildCommsDisciplineAlerts,
  createDirectiveDispatchRecord,
  reconcileDirectiveDispatches,
} from '../../src/components/nexus-os/services/commsFocusDirectiveService';

describe('commsFocusDirectiveService', () => {
  it('builds mission thread lanes with deterministic priority ordering', () => {
    const lanes = buildCommsDirectiveThreads({
      nowMs: Date.parse('2026-02-21T12:00:00.000Z'),
      channelHealth: [
        {
          channelId: 'alpha',
          label: 'Alpha Net',
          membershipCount: 6,
          intensity: 0.82,
          qualityPct: 51,
          latencyMs: 170,
          discipline: 'SATURATED',
          directive: 'REROUTE_MONITOR',
        },
        {
          channelId: 'bravo',
          label: 'Bravo Net',
          membershipCount: 3,
          intensity: 0.24,
          qualityPct: 83,
          latencyMs: 46,
          discipline: 'CLEAR',
          directive: 'NORMAL',
        },
      ] as any,
      incidents: [
        {
          id: 'inc-alpha',
          channelId: 'alpha',
          title: 'Alpha critical',
          detail: 'Signal collapse',
          priority: 'CRITICAL',
          status: 'NEW',
          recommendedAction: 'Ack immediately',
          createdAtMs: Date.parse('2026-02-21T11:59:00.000Z'),
        },
      ] as any,
      events: [
        {
          id: 'evt-1',
          variantId: 'CQB-01',
          authorId: 'lead',
          channelId: 'bravo',
          eventType: 'MOVE_OUT',
          payload: { directive: 'REROUTE_TRAFFIC' },
          confidence: 0.9,
          ttlSeconds: 120,
          createdAt: '2026-02-21T11:59:20.000Z',
        },
      ] as any,
    });

    expect(lanes.length).toBeGreaterThanOrEqual(2);
    expect(lanes[0]).toMatchObject({
      channelId: 'alpha',
      criticalCount: 1,
      unresolvedCount: 1,
      nextAction: 'ACK',
    });
    const bravoLane = lanes.find((lane) => lane.channelId === 'bravo');
    expect(bravoLane?.directiveVolume).toBe(1);
  });

  it('raises discipline alerts for duplicates, conflicts, and stale incidents', () => {
    const alerts = buildCommsDisciplineAlerts({
      nowMs: Date.parse('2026-02-21T12:00:00.000Z'),
      events: [
        {
          id: 'evt-a',
          variantId: 'CQB-01',
          authorId: 'lead',
          channelId: 'alpha',
          eventType: 'HOLD',
          payload: { directive: 'RESTRICT_NON_ESSENTIAL' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:57:00.000Z',
        },
        {
          id: 'evt-b',
          variantId: 'CQB-01',
          authorId: 'lead',
          channelId: 'alpha',
          eventType: 'HOLD',
          payload: { directive: 'RESTRICT_NON_ESSENTIAL' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:58:00.000Z',
        },
        {
          id: 'evt-c',
          variantId: 'CQB-01',
          authorId: 'lead',
          channelId: 'alpha',
          eventType: 'MOVE_OUT',
          payload: { directive: 'REROUTE_TRAFFIC' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:58:20.000Z',
        },
      ] as any,
      incidents: [
        {
          id: 'inc-1',
          channelId: 'alpha',
          title: 'Stale incident',
          detail: 'Awaiting response',
          priority: 'CRITICAL',
          status: 'NEW',
          recommendedAction: 'Acknowledge',
          createdAtMs: Date.parse('2026-02-21T11:40:00.000Z'),
        },
      ] as any,
      activeSpeakers: 4,
      degradedChannelCount: 2,
    });

    expect(alerts.some((alert) => alert.title === 'Duplicate Directive Pattern')).toBe(true);
    expect(alerts.some((alert) => alert.title === 'Conflicting Lane Orders')).toBe(true);
    expect(alerts.some((alert) => alert.title === 'Unacknowledged Incident Age')).toBe(true);
    expect(alerts.some((alert) => alert.title === 'Voice Collision Risk')).toBe(true);
  });

  it('reconciles delivery states using persisted events and incident progression', () => {
    const records = reconcileDirectiveDispatches({
      nowMs: Date.parse('2026-02-21T12:00:00.000Z'),
      dispatches: [
        {
          dispatchId: 'dispatch-1',
          channelId: 'alpha',
          laneId: 'lane:alpha',
          directive: 'INCIDENT_ACK',
          eventType: 'ROGER',
          incidentId: 'inc-alpha',
          issuedAtMs: Date.parse('2026-02-21T11:55:00.000Z'),
          status: 'QUEUED',
        },
        {
          dispatchId: 'dispatch-2',
          channelId: 'bravo',
          laneId: 'lane:bravo',
          directive: 'REROUTE_TRAFFIC',
          eventType: 'MOVE_OUT',
          incidentId: '',
          issuedAtMs: Date.parse('2026-02-21T11:56:00.000Z'),
          status: 'QUEUED',
        },
      ] as any,
      events: [
        {
          id: 'evt-1',
          variantId: 'CQB-01',
          authorId: 'lead',
          channelId: 'alpha',
          eventType: 'ROGER',
          payload: { dispatchId: 'dispatch-1' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:55:20.000Z',
        },
        {
          id: 'evt-2',
          variantId: 'CQB-01',
          authorId: 'lead',
          channelId: 'bravo',
          eventType: 'MOVE_OUT',
          payload: { dispatchId: 'dispatch-2' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:56:20.000Z',
        },
        {
          id: 'evt-3',
          variantId: 'CQB-01',
          authorId: 'command',
          channelId: 'bravo',
          eventType: 'ROGER',
          payload: { summary: 'Copy reroute' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:57:00.000Z',
        },
      ] as any,
      incidents: [
        {
          id: 'inc-alpha',
          channelId: 'alpha',
          title: 'Alpha incident',
          detail: 'Details',
          priority: 'HIGH',
          status: 'ACKED',
          recommendedAction: 'Assign',
          createdAtMs: Date.parse('2026-02-21T11:50:00.000Z'),
        },
      ] as any,
    });

    const incidentDispatch = records.find((record) => record.dispatchId === 'dispatch-1');
    const rerouteDispatch = records.find((record) => record.dispatchId === 'dispatch-2');
    expect(incidentDispatch?.status).toBe('ACKED');
    expect(rerouteDispatch?.status).toBe('ACKED');
  });

  it('creates directive dispatch records with stable defaults', () => {
    const record = createDirectiveDispatchRecord({
      channelId: 'alpha',
      directive: 'CHECK_IN_REQUEST',
      eventType: 'SELF_CHECK',
      nowMs: 123,
    });

    expect(record.dispatchId).toContain('dispatch:123:');
    expect(record.laneId).toBe('lane:alpha');
    expect(record.status).toBe('QUEUED');
  });
});
