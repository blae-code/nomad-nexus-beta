const INTERNAL_SECRET_ENV_KEYS = [
  'NEXUS_INTERNAL_AUTOMATION_SECRET',
  'BASE44_AUTOMATION_SECRET',
  'DISCORD_BRIDGE_SECRET',
];

function text(value: unknown): string {
  return String(value || '').trim();
}

function readConfiguredInternalSecret(): string {
  for (const key of INTERNAL_SECRET_ENV_KEYS) {
    const candidate = text(Deno.env.get(key));
    if (candidate) return candidate;
  }
  return '';
}

function readBearerToken(req: Request): string {
  const auth = text(req.headers.get('authorization'));
  if (!auth) return '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return text(match?.[1] || '');
}

function readRequestSecret(req: Request, payload: any): string {
  const headerCandidates = [
    req.headers.get('x-nexus-internal-secret'),
    req.headers.get('x-base44-automation-secret'),
    req.headers.get('x-automation-secret'),
    readBearerToken(req),
  ];
  for (const entry of headerCandidates) {
    const candidate = text(entry);
    if (candidate) return candidate;
  }

  const payloadCandidates = [
    payload?.internalSecret,
    payload?.internal_secret,
    payload?.automationSecret,
    payload?.automation_secret,
    payload?.secret,
  ];
  for (const entry of payloadCandidates) {
    const candidate = text(entry);
    if (candidate) return candidate;
  }
  return '';
}

function secureEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyInternalAutomationRequest(
  req: Request,
  payload: any,
  options: { requiredWhenSecretMissing?: boolean } = {}
): { ok: true } | { ok: false; status: number; error: string } {
  const configuredSecret = readConfiguredInternalSecret();
  if (!configuredSecret) {
    if (options.requiredWhenSecretMissing !== true) return { ok: true };
    return {
      ok: false,
      status: 503,
      error: 'Internal automation secret is not configured.',
    };
  }

  const providedSecret = readRequestSecret(req, payload);
  if (!providedSecret || !secureEquals(configuredSecret, providedSecret)) {
    return {
      ok: false,
      status: 403,
      error: 'Unauthorized internal automation request.',
    };
  }

  return { ok: true };
}

export function enforceJsonPost(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  if (req.method !== 'POST') {
    return { ok: false, status: 405, error: 'Method not allowed' };
  }
  return { ok: true };
}

export function enforceContentLength(
  req: Request,
  maxBytes: number
): { ok: true } | { ok: false; status: number; error: string } {
  const declared = Number.parseInt(String(req.headers.get('content-length') || ''), 10);
  if (!Number.isFinite(declared) || declared <= 0) return { ok: true };
  if (declared > maxBytes) {
    return { ok: false, status: 413, error: 'Payload too large' };
  }
  return { ok: true };
}
