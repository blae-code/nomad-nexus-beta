import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildRequest, cleanupDeno, loadHandler } from './helpers';

vi.mock('npm:@base44/sdk@0.8.6', () => ({
  createClient: () => ({}),
  createClientFromRequest: () => ({
    auth: {
      me: vi.fn().mockResolvedValue({ id: 'admin-test', role: 'admin' }),
    },
  }),
}));

vi.mock('npm:livekit@2.0.0', () => {
  class AccessToken {
    apiKey: string;
    apiSecret: string;
    identity?: string;
    name?: string;
    grants: Array<Record<string, unknown>> = [];

    constructor(apiKey: string, apiSecret: string) {
      this.apiKey = apiKey;
      this.apiSecret = apiSecret;
    }

    addGrant(grant: Record<string, unknown>) {
      this.grants.push(grant);
    }

    toJwt() {
      return 'mock-token';
    }
  }

  return { AccessToken };
});

afterEach(() => {
  cleanupDeno();
  vi.clearAllMocks();
});

describe('generateLiveKitToken', () => {
  it('returns token with secure URL normalized to wss', async () => {
    const handler = await loadHandler('../../functions/generateLiveKitToken.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      LIVEKIT_URL: 'https://livekit.example.com',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
      NODE_ENV: 'production'
    });

    const response = await handler(buildRequest({ roomName: 'room', userIdentity: 'user' }));
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: true,
      errorCode: null,
      message: null,
      data: {
        token: 'mock-token',
        roomName: 'room',
        identity: 'user',
        url: 'wss://livekit.example.com'
      }
    });
    expect(payload.data.expiresAt).toEqual(expect.any(String));
  });

  it('allows insecure URL in development mode', async () => {
    const handler = await loadHandler('../../functions/generateLiveKitToken.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      LIVEKIT_URL: 'http://livekit.dev',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
      NODE_ENV: 'development'
    });

    const response = await handler(buildRequest({ roomName: 'room', userIdentity: 'user' }));
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: true,
      errorCode: null,
      message: null,
      data: {
        token: 'mock-token',
        roomName: 'room',
        identity: 'user',
        url: 'ws://livekit.dev'
      }
    });
  });

  it('rejects insecure URL in production mode', async () => {
    const handler = await loadHandler('../../functions/generateLiveKitToken.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      LIVEKIT_URL: 'http://livekit.prod',
      LIVEKIT_API_KEY: 'key',
      LIVEKIT_API_SECRET: 'secret',
      NODE_ENV: 'production'
    });

    const response = await handler(buildRequest({ roomName: 'room', userIdentity: 'user' }));
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: false,
      errorCode: 'INSECURE_LIVEKIT_URL',
      message: 'Insecure LiveKit URL blocked',
      data: null
    });
  });

  it('returns error when LiveKit credentials are missing', async () => {
    const handler = await loadHandler('../../functions/generateLiveKitToken.ts', {
      BASE44_APP_ID: 'app',
      BASE44_SERVICE_ROLE_KEY: 'service-role',
      LIVEKIT_URL: 'https://livekit.example.com',
      LIVEKIT_API_SECRET: 'secret',
      NODE_ENV: 'production'
    });

    const response = await handler(buildRequest({ roomName: 'room', userIdentity: 'user' }));
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: false,
      errorCode: 'ENV_NOT_CONFIGURED',
      message: 'LiveKit credentials not configured',
      data: null
    });
  });
});
