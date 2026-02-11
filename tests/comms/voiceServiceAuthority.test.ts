import { describe, it, expect, beforeEach } from 'vitest';
import * as voiceService from '../../src/components/services/voiceService.jsx';

describe('voiceService authority controls', () => {
  beforeEach(async () => {
    await voiceService.clearAllSessions();
  });

  it('claims and releases transmit authority per net', async () => {
    const claimed = await voiceService.claimTransmitAuthority('net-ops', 'member-1', 'client-a');
    expect(claimed.granted).toBe(true);
    expect(claimed.authority?.userId).toBe('member-1');

    const blocked = await voiceService.claimTransmitAuthority('net-ops', 'member-2', 'client-b');
    expect(blocked.granted).toBe(false);
    expect(blocked.authority?.userId).toBe('member-1');

    await voiceService.releaseTransmitAuthority('net-ops', 'client-a');
    const released = await voiceService.getTransmitAuthority('net-ops');
    expect(released).toBeNull();
  });

  it('stores command-bus snapshots for cross-client sync', async () => {
    await voiceService.setCommandBusSnapshot([
      { type: 'PRIORITY_OVERRIDE', netId: 'net-command' },
      { type: 'SILENCE_UNTIL_CLEARED', netId: 'net-command' },
    ]);
    const snapshot = await voiceService.getCommandBusSnapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0].type).toBe('PRIORITY_OVERRIDE');
  });
});
