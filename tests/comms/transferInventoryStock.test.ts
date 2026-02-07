import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

const mockState: { base44: any; adminUser: any } = {
  base44: null,
  adminUser: null,
};

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClient: () => mockState.base44,
  createClientFromRequest: () => ({
    auth: {
      me: vi.fn().mockResolvedValue(mockState.adminUser),
    },
  }),
}));

const createMemberProfileFilter = (actorProfile: any) =>
  vi.fn(async (query: Record<string, unknown>) => {
    if (query?.id && query.id === actorProfile.id) return [actorProfile];
    if (query?.callsign && query.callsign === actorProfile.callsign) return [actorProfile];
    if (query?.display_callsign && query.display_callsign === actorProfile.display_callsign) return [actorProfile];
    return [];
  });

const createBase44Mock = ({
  actorProfile,
  sourceItem,
  destinationItem = null,
  keyStatus = 'ACTIVE',
}: {
  actorProfile: any;
  sourceItem: any;
  destinationItem?: any | null;
  keyStatus?: string;
}) => {
  const itemStore = new Map<string, any>();
  if (sourceItem?.id) itemStore.set(sourceItem.id, sourceItem);
  if (destinationItem?.id) itemStore.set(destinationItem.id, destinationItem);

  const updateMock = vi.fn(async (id: string, payload: Record<string, unknown>) => {
    const current = itemStore.get(id) || {};
    const updated = { ...current, ...payload, id };
    itemStore.set(id, updated);
    return updated;
  });

  const createMock = vi.fn(async (payload: Record<string, unknown>) => {
    const created = { id: `dest-${itemStore.size + 1}`, ...payload };
    itemStore.set(created.id, created);
    return created;
  });

  const filterMock = vi.fn(async (query: Record<string, unknown>) => {
    if (!destinationItem) return [];
    if (
      query?.name === destinationItem.name &&
      query?.category === destinationItem.category &&
      query?.location === destinationItem.location
    ) {
      return [destinationItem];
    }
    return [];
  });

  const base44 = {
    entities: {
      AccessKey: {
        filter: vi.fn().mockResolvedValue([
          {
            id: 'key-1',
            code: 'ACCESS-01',
            status: keyStatus,
            redeemed_by_member_profile_ids: [actorProfile.id],
          },
        ]),
        update: vi.fn(),
      },
      MemberProfile: {
        filter: createMemberProfileFilter(actorProfile),
      },
      InventoryItem: {
        get: vi.fn(async (id: string) => itemStore.get(id) || null),
        update: updateMock,
        create: createMock,
        filter: filterMock,
        list: vi.fn().mockResolvedValue(Array.from(itemStore.values())),
      },
      EventLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
      Notification: {
        create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
      },
    },
  };

  return { base44, updateMock, createMock };
};

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  mockState.base44 = null;
  mockState.adminUser = null;
});

describe('transferInventoryStock', () => {
  it('returns unauthorized when no actor context is resolved', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const sourceItem = { id: 'item-1', name: 'Medpens', category: 'supplies', quantity: 10, location: 'Port Tressler' };
    const { base44 } = createBase44Mock({ actorProfile, sourceItem, keyStatus: 'REVOKED' });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/transferInventoryStock.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        sourceItemId: 'item-1',
        quantity: 2,
        destinationLocation: 'MIC-L1',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toMatchObject({ error: 'Unauthorized' });
  });

  it('rejects members without logistics permissions', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: [] };
    const sourceItem = { id: 'item-1', name: 'Medpens', category: 'supplies', quantity: 10, location: 'Port Tressler' };
    const { base44, updateMock } = createBase44Mock({ actorProfile, sourceItem });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/transferInventoryStock.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        sourceItemId: 'item-1',
        quantity: 2,
        destinationLocation: 'MIC-L1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: 'Insufficient privileges' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('rejects transfer when quantity exceeds available stock', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'COMMANDER', roles: [] };
    const sourceItem = { id: 'item-1', name: 'Medpens', category: 'supplies', quantity: 3, location: 'Port Tressler' };
    const { base44, updateMock } = createBase44Mock({ actorProfile, sourceItem });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/transferInventoryStock.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        sourceItemId: 'item-1',
        quantity: 6,
        destinationLocation: 'MIC-L1',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({ error: 'Insufficient source quantity' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('transfers stock to existing destination inventory item', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: ['logistics'] };
    const sourceItem = {
      id: 'item-1',
      name: 'Medpens',
      category: 'supplies',
      quantity: 10,
      location: 'Port Tressler',
      status: 'available',
      managed_by_member_profile_id: 'member-9',
    };
    const destinationItem = {
      id: 'item-2',
      name: 'Medpens',
      category: 'supplies',
      quantity: 5,
      location: 'MIC-L1',
      status: 'available',
    };
    const { base44, updateMock, createMock } = createBase44Mock({
      actorProfile,
      sourceItem,
      destinationItem,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/transferInventoryStock.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        sourceItemId: 'item-1',
        quantity: 4,
        destinationLocation: 'MIC-L1',
        reason: 'Operation resupply',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      transferredQuantity: 4,
    });
    expect(updateMock).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        quantity: 6,
      })
    );
    expect(updateMock).toHaveBeenCalledWith(
      'item-2',
      expect.objectContaining({
        quantity: 9,
      })
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates destination inventory record when none exists', async () => {
    const actorProfile = { id: 'member-1', callsign: 'Nomad', rank: 'MEMBER', roles: ['quartermaster'] };
    const sourceItem = {
      id: 'item-1',
      name: 'Repair Tool',
      category: 'equipment',
      quantity: 2,
      location: 'Everus Harbor',
      status: 'available',
    };
    const { base44, updateMock, createMock } = createBase44Mock({
      actorProfile,
      sourceItem,
      destinationItem: null,
    });
    mockState.base44 = base44;

    const handler = await loadHandler('../../functions/transferInventoryStock.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-key',
    });

    const response = await handler(
      buildRequest({
        sourceItemId: 'item-1',
        quantity: 1,
        destinationLocation: 'ARC-L2',
        code: 'ACCESS-01',
        callsign: 'Nomad',
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      transferredQuantity: 1,
    });
    expect(updateMock).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        quantity: 1,
      })
    );
    expect(createMock).toHaveBeenCalledTimes(1);
  });
});
