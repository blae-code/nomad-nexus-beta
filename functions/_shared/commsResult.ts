/**
 * Shared result helpers for comms functions
 * These return canonical JSON structures for the frontend to consume
 */

interface CommsResultOptions {
  ok: boolean;
  errorCode?: string;
  message?: string;
  data?: any;
}

export function createCommsResult(opts: CommsResultOptions) {
  return {
    ok: opts.ok,
    errorCode: opts.errorCode || null,
    message: opts.message || null,
    data: opts.data || null
  };
}

export function createTokenResult(token: string, roomName: string, identity: string) {
  return createCommsResult({
    ok: true,
    data: {
      token,
      roomName,
      identity,
      expiresAt: new Date(Date.now() + 3600000).toISOString()
    }
  });
}