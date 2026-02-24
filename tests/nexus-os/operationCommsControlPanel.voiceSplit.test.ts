import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendOrderDispatch, buildDeliveryStats, createOrderDispatch } from '../../src/components/nexus-os/ui/comms/commsOrderRuntime';

describe('operation comms control voice split', () => {
  it('removes voice-governance controls from operation comms panel surface', () => {
    const panelPath = resolve(process.cwd(), 'src/components/nexus-os/ui/ops/OperationCommsControlPanel.tsx');
    const source = readFileSync(panelPath, 'utf8');

    expect(source).toContain('Operational Signals Control');
    expect(source).toContain('Voice net controls are in the right-side Voice Comms panel.');
    expect(source).not.toContain('voiceNetGovernanceClient');
    expect(source).not.toContain('listManagedVoiceNets');
    expect(source).not.toContain('Net Control');
  });

  it('keeps non-voice directive delivery pipeline functional', () => {
    const dispatch = createOrderDispatch({
      channelId: 'ops-primary',
      laneId: 'lane:ops-primary',
      directive: 'REROUTE_TRAFFIC',
      eventType: 'MOVE_OUT',
      nowMs: Date.parse('2026-02-24T00:00:00.000Z'),
    });
    const state = appendOrderDispatch([], dispatch, 24);
    const stats = buildDeliveryStats(state);

    expect(stats.persisted).toBe(0);
    expect(stats.acked).toBe(0);
    expect(stats.queued).toBe(1);
  });
});
