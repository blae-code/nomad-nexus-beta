import { describe, expect, it } from 'vitest';
import { buildMapCommandSurface } from '../../src/nexus-os/services/mapCommandSurfaceService';
import { computeMapInference } from '../../src/nexus-os/services/mapInferenceService';
import { resolveTacticalMapShortcut } from '../../src/nexus-os/services/tacticalMapInteractionService';

describe('tactical map action tempo', () => {
  it('supports critical callout macro flow in two interactions', () => {
    const nowMs = Date.UTC(2026, 1, 13, 12, 0, 0);
    const commsOverlay = {
      generatedAt: new Date(nowMs).toISOString(),
      scopedOpId: 'op-tempo',
      nets: [
        {
          id: 'net-command',
          label: 'Command Net',
          code: 'CMD',
          eventId: 'op-tempo',
          nodeId: 'system-stanton',
          participants: 6,
          speaking: 3,
          muted: 1,
          trafficScore: 12,
          quality: 'DEGRADED' as const,
          discipline: 'FOCUSED' as const,
        },
      ],
      links: [],
      callouts: [
        {
          id: 'callout-1',
          eventId: 'op-tempo',
          netId: 'net-command',
          nodeId: 'system-stanton',
          lane: 'COMMAND',
          priority: 'CRITICAL' as const,
          message: 'Break break, collision risk north lane.',
          createdDate: new Date(nowMs - 5_000).toISOString(),
          ageSeconds: 5,
          stale: false,
        },
      ],
      discipline: null,
      speakRequests: [],
      commandBus: [],
    };

    const mapInference = computeMapInference({
      controlZones: [
        {
          id: 'zone-stanton',
          scope: 'body',
          geometryHint: { nodeId: 'system-stanton' },
          assertedControllers: [],
          contestationLevel: 0.52,
          signals: [],
          ttlProfileId: 'default',
          createdAt: new Date(nowMs - 60_000).toISOString(),
          updatedAt: new Date(nowMs - 10_000).toISOString(),
        },
      ],
      commsOverlay,
      intelObjects: [],
      operations: [],
      focusOperationId: 'op-tempo',
      nowMs,
    });

    const surface = buildMapCommandSurface({
      mapInference,
      commsOverlay,
      nowMs,
    });

    const openAction = resolveTacticalMapShortcut({
      key: '.',
      mode: 'COMMAND',
    });
    const criticalMacro = surface.recommendedMacros.find((entry) => entry.macroId === 'ISSUE_CRITICAL_CALLOUT');

    expect(openAction.type).toBe('OPEN_ACTIONS');
    expect(criticalMacro?.priority).toBe('NOW');
    expect(surface.alerts.some((entry) => entry.id === 'critical-callouts')).toBe(true);

    const interactions = Number(openAction.type === 'OPEN_ACTIONS') + Number(Boolean(criticalMacro));
    expect(interactions).toBe(2);
  });
});

