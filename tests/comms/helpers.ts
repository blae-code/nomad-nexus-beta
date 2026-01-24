import { vi } from 'vitest';

type EnvMap = Record<string, string | undefined>;

export async function loadHandler(modulePath: string, env: EnvMap) {
  let handler: ((req: Request) => Promise<Response>) | undefined;

  (globalThis as typeof globalThis & { Deno?: unknown }).Deno = {
    env: {
      get: (key: string) => env[key]
    },
    serve: (fn: (req: Request) => Promise<Response>) => {
      handler = fn;
    }
  };

  vi.resetModules();
  await import(modulePath);

  if (!handler) {
    throw new Error(`Handler was not registered for ${modulePath}`);
  }

  return handler;
}

export function cleanupDeno() {
  delete (globalThis as typeof globalThis & { Deno?: unknown }).Deno;
}

export function buildRequest(body: unknown) {
  return new Request('http://localhost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}
