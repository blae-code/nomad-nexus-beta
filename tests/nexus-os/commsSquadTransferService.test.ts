import { beforeEach, describe, expect, it, vi } from 'vitest';

const { base44Mock } = vi.hoisted(() => ({
  base44Mock: { entities: {} as Record<string, any> },
}));

vi.mock('../../src/api/base44Client.js', () => ({
  base44: base44Mock,
}));

import { transferSquadMembers } from '../../src/components/nexus-os/services/commsSquadTransferService';

describe('commsSquadTransferService', () => {
  beforeEach(() => {
    base44Mock.entities = {};
  });

  it('moves members and syncs channel memberships when entities exist', async () => {
    const squadMembershipRows: any[] = [
      { id: 'sm-1', member_profile_id: 'u-1', squad_id: 'sq-a', status: 'active' },
    ];
    const channelMembershipRows: any[] = [
      { id: 'cm-1', member_profile_id: 'u-1', channel_id: 'alpha', status: 'active' },
    ];
    base44Mock.entities.Squad = {
      list: vi.fn().mockResolvedValue([
        { id: 'sq-a', name: 'Squad Alpha' },
        { id: 'sq-b', name: 'Squad Bravo' },
      ]),
    };
    base44Mock.entities.SquadMembership = {
      filter: vi.fn(async (query: any) =>
        squadMembershipRows.filter((row) => row.member_profile_id === query.member_profile_id)
      ),
      create: vi.fn(async (payload: any) => {
        const row = { id: `sm-${squadMembershipRows.length + 1}`, ...payload };
        squadMembershipRows.push(row);
        return row;
      }),
      update: vi.fn(async (id: string, patch: any) => {
        const row = squadMembershipRows.find((entry) => entry.id === id);
        if (row) Object.assign(row, patch);
      }),
      delete: vi.fn(async (id: string) => {
        const index = squadMembershipRows.findIndex((entry) => entry.id === id);
        if (index >= 0) squadMembershipRows.splice(index, 1);
      }),
    };
    base44Mock.entities.ChannelMembership = {
      list: vi.fn().mockResolvedValue(channelMembershipRows),
      create: vi.fn(async (payload: any) => {
        const row = { id: `cm-${channelMembershipRows.length + 1}`, ...payload };
        channelMembershipRows.push(row);
        return row;
      }),
      update: vi.fn(async (id: string, patch: any) => {
        const row = channelMembershipRows.find((entry) => entry.id === id);
        if (row) Object.assign(row, patch);
      }),
      delete: vi.fn(async (id: string) => {
        const index = channelMembershipRows.findIndex((entry) => entry.id === id);
        if (index >= 0) channelMembershipRows.splice(index, 1);
      }),
    };

    const result = await transferSquadMembers({
      memberIds: ['u-1'],
      sourceSquadId: 'sq-a',
      destinationSquadId: 'sq-b',
      sourceChannelId: 'alpha',
      destinationChannelId: 'bravo',
      actorId: 'commander-1',
    });

    expect(result.success).toBe(true);
    expect(result.movedMemberIds).toEqual(['u-1']);
    expect(squadMembershipRows.some((row) => row.squad_id === 'sq-b' && row.status === 'active')).toBe(true);
    expect(channelMembershipRows.some((row) => row.channel_id === 'bravo' && row.status === 'active')).toBe(true);
  });

  it('keeps transfer successful when channel membership entities are unavailable', async () => {
    const squadMembershipRows: any[] = [];
    base44Mock.entities.SquadMembership = {
      filter: vi.fn().mockResolvedValue([]),
      create: vi.fn(async (payload: any) => {
        const row = { id: `sm-${squadMembershipRows.length + 1}`, ...payload };
        squadMembershipRows.push(row);
        return row;
      }),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const result = await transferSquadMembers({
      memberIds: ['u-7'],
      sourceSquadId: 'sq-old',
      destinationSquadId: 'sq-new',
      sourceChannelId: 'net-old',
      destinationChannelId: 'net-new',
      actorId: 'commander-2',
    });

    expect(result.success).toBe(true);
    expect(result.warnings.some((entry) => entry.toLowerCase().includes('channel membership entity unavailable'))).toBe(true);
  });

  it('rolls back partial writes when squad mutation fails', async () => {
    const squadMembershipRows: any[] = [];
    base44Mock.entities.SquadMembership = {
      filter: vi.fn().mockResolvedValue([]),
      create: vi
        .fn()
        .mockResolvedValueOnce({ id: 'sm-1', member_profile_id: 'u-1', squad_id: 'sq-b', status: 'active' })
        .mockRejectedValueOnce(new Error('write failed')),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const result = await transferSquadMembers({
      memberIds: ['u-1', 'u-2'],
      sourceSquadId: 'sq-a',
      destinationSquadId: 'sq-b',
      sourceChannelId: 'alpha',
      destinationChannelId: 'bravo',
      actorId: 'commander-3',
    });

    expect(result.success).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.error).toContain('write failed');
  });
});
