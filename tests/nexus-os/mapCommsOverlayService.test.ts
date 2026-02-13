import { describe, expect, it } from 'vitest';
import {
  buildMapCommsOverlay,
  createEmptyMapCommsOverlay,
  extractCommsTopologySnapshot,
} from '../../src/nexus-os/services/mapCommsOverlayService';
import { TACTICAL_MAP_NODES } from '../../src/nexus-os/ui/map/mapBoard';

describe('mapCommsOverlayService', () => {
  it('extracts topology payload from member-function envelopes', () => {
    const snapshot = extractCommsTopologySnapshot({
      data: {
        topology: {
          generated_at: '2026-02-10T08:00:00.000Z',
          nets: [{ id: 'net-alpha', label: 'Alpha Command', code: 'ALPHA', event_id: 'op-1' }],
          memberships: [{ member_profile_id: 'm-1', net_id: 'net-alpha', speaking: true, muted: false }],
          bridges: [{ id: 'bridge-1', source_net_id: 'net-alpha', target_net_id: 'net-beta', status: 'degraded' }],
        callouts: [{ id: 'call-1', net_id: 'net-alpha', priority: 'HIGH', message: 'Lane degraded' }],
        netLoad: [{ net_id: 'net-alpha', participants: 3, traffic_score: 7 }],
        discipline: { mode: 'REQUEST_TO_SPEAK', net_id: 'net-alpha', event_id: 'op-1', updated_at: '2026-02-10T08:02:00.000Z' },
        speakRequests: [{ request_id: 'sr-1', event_id: 'op-1', net_id: 'net-alpha', requester_member_profile_id: 'm-2', status: 'PENDING' }],
        commandBus: [{ id: 'bus-1', event_id: 'op-1', net_id: 'net-alpha', action: 'PRIORITY_OVERRIDE', payload: { reason: 'load' } }],
      },
    },
  });

    expect(snapshot.nets[0]).toMatchObject({
      id: 'net-alpha',
      label: 'Alpha Command',
      eventId: 'op-1',
    });
    expect(snapshot.memberships[0]).toMatchObject({ memberProfileId: 'm-1', netId: 'net-alpha' });
    expect(snapshot.callouts[0].priority).toBe('HIGH');
    expect(snapshot.discipline?.mode).toBe('REQUEST_TO_SPEAK');
    expect(snapshot.speakRequests[0].requestId).toBe('sr-1');
    expect(snapshot.commandBus[0].action).toBe('PRIORITY_OVERRIDE');
  });

  it('keeps map comms data operation scoped when op context is provided', () => {
    const topology = extractCommsTopologySnapshot({
      topology: {
        nets: [
          { id: 'net-op-1', label: 'Focused Alpha', code: 'FOCUS-A', event_id: 'op-1' },
          { id: 'net-op-2', label: 'Focused Bravo', code: 'FOCUS-B', event_id: 'op-2' },
        ],
        memberships: [
          { member_profile_id: 'a', net_id: 'net-op-1', speaking: true, muted: false },
          { member_profile_id: 'b', net_id: 'net-op-2', speaking: false, muted: false },
        ],
        bridges: [{ id: 'bridge-a', source_net_id: 'net-op-1', target_net_id: 'net-op-2' }],
        callouts: [
          { id: 'call-a', net_id: 'net-op-1', priority: 'CRITICAL', message: 'Alpha check' },
          { id: 'call-b', net_id: 'net-op-2', priority: 'HIGH', message: 'Bravo check' },
        ],
      },
    });

    const overlay = buildMapCommsOverlay({
      topology,
      opId: 'op-1',
      operations: [
        { id: 'op-1', ao: { nodeId: 'body-hurston' } },
      ] as any,
      mapNodes: TACTICAL_MAP_NODES,
      nowMs: Date.parse('2026-02-10T08:10:00.000Z'),
    });

    expect(overlay.scopedOpId).toBe('op-1');
    expect(overlay.nets.map((entry) => entry.id)).toEqual(['net-op-1']);
    expect(overlay.callouts.map((entry) => entry.id)).toEqual(['call-a']);
    expect(overlay.links.length).toBe(0);
  });

  it('maps lane-based callouts onto scoped nets and marks stale callouts by age', () => {
    const topology = extractCommsTopologySnapshot({
      topology: {
        nets: [
          { id: 'net-command', label: 'Command Net', code: 'COMMAND', event_id: 'op-5' },
        ],
        callouts: [
          {
            id: 'call-lane',
            lane: 'command',
            priority: 'HIGH',
            message: 'Route reroute pending',
            created_date: '2026-02-10T07:55:00.000Z',
          },
        ],
      },
    });

    const overlay = buildMapCommsOverlay({
      topology,
      opId: 'op-5',
      operations: [{ id: 'op-5', ao: { nodeId: 'body-arccorp' } }] as any,
      mapNodes: TACTICAL_MAP_NODES,
      nowMs: Date.parse('2026-02-10T08:20:00.000Z'),
    });

    expect(overlay.callouts.length).toBe(1);
    expect(overlay.callouts[0]).toMatchObject({
      netId: 'net-command',
      nodeId: 'body-arccorp',
      stale: true,
    });
  });

  it('creates deterministic fallback node placement when no explicit AO is available', () => {
    const topology = extractCommsTopologySnapshot({
      topology: {
        nets: [
          { id: 'net-a', label: 'General One', code: 'GEN-1' },
          { id: 'net-b', label: 'General Two', code: 'GEN-2' },
        ],
      },
    });

    const first = buildMapCommsOverlay({ topology, mapNodes: TACTICAL_MAP_NODES });
    const second = buildMapCommsOverlay({ topology, mapNodes: TACTICAL_MAP_NODES });
    expect(first.nets.map((entry) => entry.nodeId)).toEqual(second.nets.map((entry) => entry.nodeId));
    expect(first.nets.length).toBe(2);
    expect(first.speakRequests).toEqual([]);
    expect(first.commandBus).toEqual([]);
    expect(first.discipline).toBeNull();
    expect(createEmptyMapCommsOverlay().nets.length).toBe(0);
  });
});

