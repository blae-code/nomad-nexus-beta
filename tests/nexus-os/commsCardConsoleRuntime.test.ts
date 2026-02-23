import { describe, expect, it } from 'vitest';
import {
  buildBridgeLifecycleRows,
  buildEscalationSuggestions,
  buildSquadSlaSnapshots,
  sortSquadCardsDeterministic,
} from '../../src/components/nexus-os/ui/comms/commsCardConsoleRuntime';
import { normalizeCommsCardConsoleState } from '../../src/components/nexus-os/ui/comms/commsCardConsoleState';

describe('commsCardConsoleRuntime', () => {
  it('orders squads deterministically by wing + label', () => {
    const ordered = sortSquadCardsDeterministic([
      {
        id: 'gce:bravo',
        wingId: 'GCE',
        wingLabel: 'Ground Wing',
        squadLabel: 'Squad Bravo',
        primaryChannelId: 'bravo',
        operators: [],
      },
      {
        id: 'ace:alpha',
        wingId: 'ACE',
        wingLabel: 'Aerospace Wing',
        squadLabel: 'Squad Alpha',
        primaryChannelId: 'alpha',
        operators: [],
      },
    ]);

    expect(ordered.map((entry) => entry.id)).toEqual(['ace:alpha', 'gce:bravo']);
  });

  it('computes SLA snapshots and produces fleet escalation when wing has multiple red squads', () => {
    const nowMs = 1_700_000_600_000;
    const policy = normalizeCommsCardConsoleState({}).slaPolicy;
    const snapshots = buildSquadSlaSnapshots({
      squadCards: [
        {
          id: 'wing-a:squad-1',
          wingId: 'wing-a',
          wingLabel: 'Wing A',
          squadLabel: 'Squad 1',
          primaryChannelId: 'alpha',
          operators: [{ id: 'pilot-1', status: 'OFF-NET' }],
        },
        {
          id: 'wing-a:squad-2',
          wingId: 'wing-a',
          wingLabel: 'Wing A',
          squadLabel: 'Squad 2',
          primaryChannelId: 'bravo',
          operators: [{ id: 'pilot-2', status: 'OFF-NET' }],
        },
      ],
      events: [],
      nowMs,
      slaPolicy: policy,
      offNetSinceByOperatorId: {
        'pilot-1': nowMs - 310_000,
        'pilot-2': nowMs - 320_000,
      },
    });

    expect(snapshots).toHaveLength(2);
    expect(snapshots[0].overallStatus).toBe('red');
    expect(snapshots[0].off_net_duration_s).toBeGreaterThanOrEqual(300);

    const suggestions = buildEscalationSuggestions({ snapshots });
    expect(suggestions).toHaveLength(2);
    expect(suggestions.every((entry) => entry.target === 'fleet')).toBe(true);
    expect(suggestions[0].directive).toBe('ESCALATE_TO_FLEET');
  });

  it('marks TTL-expired bridges with split suggestion', () => {
    const nowMs = 1_700_000_300_000;
    const rows = buildBridgeLifecycleRows({
      nowMs,
      sessions: [
        { id: 'manual', squadIds: ['a', 'b'], createdAtMs: nowMs - 200_000, ttlSec: 0 },
        { id: 'expired', squadIds: ['a', 'c'], createdAtMs: nowMs - 130_000, ttlSec: 120 },
        { id: 'active', squadIds: ['a', 'd'], createdAtMs: nowMs - 30_000, ttlSec: 120 },
      ],
    });

    const expired = rows.find((entry) => entry.id === 'expired');
    const active = rows.find((entry) => entry.id === 'active');
    const manual = rows.find((entry) => entry.id === 'manual');

    expect(expired?.splitSuggested).toBe(true);
    expect(expired?.ttlLabel).toBe('TTL elapsed');
    expect(active?.splitSuggested).toBe(false);
    expect(active?.remainingSec).toBeGreaterThan(0);
    expect(manual?.remainingSec).toBeNull();
    expect(manual?.ttlLabel).toBe('Manual');
  });
});
