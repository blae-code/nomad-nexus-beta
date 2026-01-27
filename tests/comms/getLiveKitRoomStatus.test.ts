import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

const authMeMock = vi.fn();
const listParticipantsMock = vi.fn();

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClientFromRequest: () => ({
    auth: {
      me: authMeMock
    }
  })
}));

vi.mock('npm:livekit-server-sdk@2.0.0', () => ({
  RoomServiceClient: class {
    listParticipants(roomName: string) {
      return listParticipantsMock(roomName);
    }
  }
}));

beforeEach(() => {
  authMeMock.mockReset();
  listParticipantsMock.mockReset();
});

afterEach(() => {
  cleanupDeno();
  vi.clearAllMocks();
});

describe('getLiveKitRoomStatus', () => {
  it('returns participant counts for rooms and handles missing rooms', async () => {
    authMeMock.mockResolvedValue({ id: 'user-1' });
    listParticipantsMock.mockImplementation((roomName: string) => {
      if (roomName === 'alpha') {
        return Promise.resolve([{ id: 'p1' }, { id: 'p2' }]);
      }
      return Promise.reject(new Error('Not found'));
    });

    const handler = await loadHandler('../../functions/getLiveKitRoomStatus.ts', {
      LIVEKIT_URL: 'https://livekit.example.com',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret'
    });

    const response = await handler(buildRequest({ rooms: ['alpha', 'beta'] }));
    const payload = await response.json();

    expect(payload).toEqual({
      ok: true,
      data: {
        alpha: { participantCount: 2, isActive: true },
        beta: { participantCount: 0, isActive: false }
      }
    });
  });

  it('returns error response when LiveKit is not configured', async () => {
    authMeMock.mockResolvedValue({ id: 'user-1' });

    const handler = await loadHandler('../../functions/getLiveKitRoomStatus.ts', {});

    const response = await handler(buildRequest({ rooms: ['alpha'] }));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: 'LiveKit not configured' });
  });

  it('returns unauthorized when user is missing', async () => {
    authMeMock.mockResolvedValue(null);

    const handler = await loadHandler('../../functions/getLiveKitRoomStatus.ts', {
      LIVEKIT_URL: 'https://livekit.example.com',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret'
    });

    const response = await handler(buildRequest({ rooms: ['alpha'] }));
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Unauthorized' });
  });
});
