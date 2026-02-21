import { describe, expect, it } from 'vitest';
import {
  buildCommsChannelHealth,
  buildCommsIncidentCandidates,
  canTransitionIncidentStatus,
  normalizeIncidentStatusById,
  sortCommsIncidents,
} from '../../src/components/nexus-os/services/commsIncidentService';

describe('commsIncidentService', () => {
  it('builds deterministic channel health from graph channels', () => {
    const health = buildCommsChannelHealth({
      channels: [
        { id: 'alpha', label: 'Alpha', membershipCount: 6, intensity: 0.82 },
        { id: 'bravo', label: 'Bravo', membershipCount: 2, intensity: 0.21 },
      ],
    } as any);

    expect(health).toHaveLength(2);
    expect(health[0]).toMatchObject({
      channelId: 'alpha',
      discipline: 'SATURATED',
      directive: 'REROUTE_MONITOR',
    });
    expect(health[1]).toMatchObject({
      channelId: 'bravo',
      discipline: 'CLEAR',
      directive: 'NORMAL',
    });
  });

  it('derives incident candidates from degraded health and scoped events', () => {
    const incidents = buildCommsIncidentCandidates({
      nowMs: Date.parse('2026-02-21T12:00:00.000Z'),
      channelHealth: [
        {
          channelId: 'alpha',
          label: 'Alpha',
          membershipCount: 8,
          intensity: 0.79,
          qualityPct: 54,
          latencyMs: 161,
          discipline: 'SATURATED',
          directive: 'REROUTE_MONITOR',
        },
      ] as any,
      events: [
        {
          id: 'evt-1',
          variantId: 'CQB-01',
          authorId: 'lead-1',
          channelId: 'alpha',
          eventType: 'DOWNED',
          payload: { summary: 'Medic requested' },
          confidence: 0.9,
          ttlSeconds: 60,
          createdAt: '2026-02-21T11:59:30.000Z',
        },
      ] as any,
    });

    expect(incidents.length).toBeGreaterThanOrEqual(2);
    expect(incidents[0].id).toContain('event:');
    expect(incidents[0].priority).toBe('CRITICAL');
    expect(incidents.some((entry) => entry.id === 'health:alpha')).toBe(true);
  });

  it('normalizes and sorts incident status deterministically', () => {
    const candidates = [
      {
        id: 'inc-a',
        channelId: 'alpha',
        title: 'Alpha degraded',
        detail: 'Q 61%',
        priority: 'HIGH',
        recommendedAction: 'Reroute',
        createdAtMs: 100,
      },
      {
        id: 'inc-b',
        channelId: 'bravo',
        title: 'Bravo check',
        detail: 'Contact',
        priority: 'MED',
        recommendedAction: 'Acknowledge',
        createdAtMs: 200,
      },
    ] as any;

    const normalized = normalizeIncidentStatusById(candidates, { 'inc-a': 'ASSIGNED' });
    expect(normalized).toEqual({
      'inc-a': 'ASSIGNED',
      'inc-b': 'NEW',
    });

    const sorted = sortCommsIncidents(candidates, normalized);
    expect(sorted[0].id).toBe('inc-b');
    expect(sorted[0].status).toBe('NEW');
  });

  it('allows only deterministic incident transitions', () => {
    expect(canTransitionIncidentStatus('NEW', 'ACKED')).toBe(true);
    expect(canTransitionIncidentStatus('ACKED', 'ASSIGNED')).toBe(true);
    expect(canTransitionIncidentStatus('ASSIGNED', 'RESOLVED')).toBe(true);
    expect(canTransitionIncidentStatus('NEW', 'RESOLVED')).toBe(false);
    expect(canTransitionIncidentStatus('RESOLVED', 'ACKED')).toBe(false);
  });
});
