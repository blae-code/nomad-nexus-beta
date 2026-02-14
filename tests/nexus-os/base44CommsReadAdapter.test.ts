import { beforeEach, describe, expect, it, vi } from 'vitest';

const { base44Mock } = vi.hoisted(() => ({
  base44Mock: { entities: {} as Record<string, any> },
}));

vi.mock('../../src/api/base44Client.js', () => ({
  base44: base44Mock,
}));

import {
  listBase44ChannelMemberships,
  listBase44CommsChannels,
} from '../../src/components/nexus-os/services/base44CommsReadAdapter';

describe('base44CommsReadAdapter', () => {
  beforeEach(() => {
    base44Mock.entities = {};
  });

  it('normalizes comms channel rows from the Channel entity', async () => {
    base44Mock.entities.Channel = {
      list: vi.fn().mockResolvedValue([
        { id: 'ops-primary', name: 'Ops Primary', slug: 'ops-primary' },
        { id: 'ops-primary', name: 'Ops Primary Duplicate', slug: 'ops-primary' },
      ]),
    };

    const rows = await listBase44CommsChannels(25);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('ops-primary');
    expect(rows[0].label).toBe('Ops Primary');
    expect(rows[0].matchKeys).toContain('ops-primary');
  });

  it('falls back to CommsChannel when Channel is unavailable', async () => {
    base44Mock.entities.CommsChannel = {
      list: vi.fn().mockResolvedValue([
        { channel_id: 'relay-1', label: 'Relay One' },
      ]),
    };

    const rows = await listBase44CommsChannels();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('relay-1');
    expect(rows[0].label).toBe('Relay One');
  });

  it('normalizes membership records across membership entity variants', async () => {
    base44Mock.entities.ChannelMember = {
      list: vi.fn().mockResolvedValue([
        { comms_channel_id: 'ops-primary', user_id: 'ce-1' },
        { comms_channel_id: 'ops-primary', user_id: 'ce-1' },
      ]),
    };

    const rows = await listBase44ChannelMemberships(25);
    expect(rows).toEqual([
      { channelId: 'ops-primary', memberId: 'ce-1' },
    ]);
  });
});

