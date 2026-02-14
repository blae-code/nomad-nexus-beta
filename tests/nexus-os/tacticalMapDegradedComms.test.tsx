import { describe, expect, it } from 'vitest';
import { TACTICAL_MAP_NODES } from '../../src/components/nexus-os/ui/map/mapBoard';
import {
  buildMapCommsOverlay,
  createEmptyMapCommsOverlay,
  extractCommsTopologySnapshot,
} from '../../src/components/nexus-os/services/mapCommsOverlayService';
import { getMapCommandSurfaceRetryDelayMs } from '../../src/components/nexus-os/services/tacticalMapFeatureFlagService';

describe('tactical map degraded comms handling', () => {
  it('parses malformed/404 payloads without breaking map overlays', () => {
    const payload404 = {
      status: 404,
      error: 'Not Found',
      data: {
        topology: {
          event_id: 'op-a',
        },
      },
    };

    const topology = extractCommsTopologySnapshot(payload404);
    expect(topology.nets).toEqual([]);
    expect(topology.callouts).toEqual([]);
    expect(topology.speakRequests).toEqual([]);
    expect(topology.commandBus).toEqual([]);

    const overlay = buildMapCommsOverlay({
      topology,
      mapNodes: TACTICAL_MAP_NODES,
      nowMs: Date.UTC(2026, 1, 13, 12, 0, 0),
    });

    expect(overlay.nets).toEqual([]);
    expect(overlay.callouts).toEqual([]);
    expect(overlay.links).toEqual([]);
    expect(overlay).toEqual(createEmptyMapCommsOverlay(''));
  });

  it('uses bounded retry backoff to avoid comms surface retry spam', () => {
    expect(getMapCommandSurfaceRetryDelayMs(20_000)).toBe(32_000);
    expect(getMapCommandSurfaceRetryDelayMs(32_000)).toBe(51_200);
    expect(getMapCommandSurfaceRetryDelayMs(80_000)).toBe(120_000);
    expect(getMapCommandSurfaceRetryDelayMs(120_000)).toBe(120_000);
    expect(getMapCommandSurfaceRetryDelayMs(NaN)).toBe(32_000);
  });
});


