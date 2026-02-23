import { describe, expect, it } from 'vitest';
import { buildLatestDispatchByChannelId } from '../../src/components/nexus-os/ui/comms/commsTokenSemantics';

describe('commsNetworkCardConsole', () => {
  it('maps latest dispatch by channel deterministically', () => {
    const rows = [
      { dispatchId: 'a-1', channelId: 'alpha', status: 'QUEUED', issuedAtMs: 1000 },
      { dispatchId: 'a-2', channelId: 'alpha', status: 'ACKED', issuedAtMs: 1200 },
      { dispatchId: 'b-1', channelId: 'bravo', status: 'QUEUED', issuedAtMs: 900 },
      { dispatchId: 'b-3', channelId: 'bravo', status: 'PERSISTED', issuedAtMs: 900 },
      { dispatchId: 'ignored', channelId: '', status: 'ACKED', issuedAtMs: 3000 },
    ];

    const latest = buildLatestDispatchByChannelId(rows);
    expect(Object.keys(latest).sort()).toEqual(['alpha', 'bravo']);
    expect(latest.alpha.dispatchId).toBe('a-2');
    expect(latest.bravo.dispatchId).toBe('b-3');
  });
});
