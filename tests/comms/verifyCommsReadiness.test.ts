import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClientFromRequest: () => ({})
}));

afterEach(() => {
  cleanupDeno();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('verifyCommsReadiness', () => {
  it('returns ready when env is configured and LiveKit is reachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const handler = await loadHandler('../../functions/verifyCommsReadiness.ts', {
      LIVEKIT_URL: 'https://livekit.example.com',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret'
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(payload).toMatchObject({
      isReady: true,
      reason: null
    });
    expect(payload.timestamp).toEqual(expect.any(String));
  });

  it('returns not ready when environment variables are missing', async () => {
    const handler = await loadHandler('../../functions/verifyCommsReadiness.ts', {
      LIVEKIT_URL: 'https://livekit.example.com'
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(payload).toMatchObject({
      isReady: false,
      reason: 'LiveKit environment not configured'
    });
  });

  it('returns not ready when LiveKit health check fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    const handler = await loadHandler('../../functions/verifyCommsReadiness.ts', {
      LIVEKIT_URL: 'https://livekit.example.com',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret'
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(payload).toMatchObject({
      isReady: false,
      reason: 'LiveKit server unreachable'
    });
  });

  it('returns not ready when LiveKit URL format is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

    const handler = await loadHandler('../../functions/verifyCommsReadiness.ts', {
      LIVEKIT_URL: 'ws://livekit.example.com',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret'
    });

    const response = await handler(buildRequest({}));
    const payload = await response.json();

    expect(payload).toMatchObject({
      isReady: false,
      reason: 'Invalid LiveKit URL format'
    });
  });
});
