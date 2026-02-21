import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

type MemberSession = {
  code: string;
  callsign: string;
  memberProfileId?: string | null;
};

type AuthContext = {
  base44: ReturnType<typeof createClient>;
  actorType: 'admin' | 'member' | null;
  adminUser: any | null;
  memberProfile: any | null;
};

type AuthOptions = {
  allowAdmin?: boolean;
  allowMember?: boolean;
  requireAdmin?: boolean;
  requireMember?: boolean;
};

const MAX_MEMBER_TOKEN_LENGTH = 4096;
const MEMBER_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 90; // 90 days
const DEFAULT_SYSTEM_ADMIN_IDENTIFIERS = ['blae@katrasoluta.com'];

function normalizeIdentifier(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function getSystemAdminIdentifierSet() {
  const configured = String(Deno.env.get('SYSTEM_ADMIN_IDENTIFIERS') || '');
  const configuredList = configured
    .split(',')
    .map((entry) => normalizeIdentifier(entry))
    .filter(Boolean);
  return new Set([
    ...DEFAULT_SYSTEM_ADMIN_IDENTIFIERS.map((entry) => normalizeIdentifier(entry)),
    ...configuredList,
  ]);
}

function collectActorIdentifiers(actor: any): string[] {
  if (!actor) return [];
  const identifiers = [
    actor?.email,
    actor?.full_name,
    actor?.callsign,
    actor?.display_callsign,
    actor?.login_callsign,
    actor?.username,
  ]
    .map((entry) => normalizeIdentifier(entry))
    .filter(Boolean);
  return Array.from(new Set(identifiers));
}

function hasSystemAdminIdentity(actor: any): boolean {
  if (!actor) return false;
  const allowlist = getSystemAdminIdentifierSet();
  const identifiers = collectActorIdentifiers(actor);
  return identifiers.some((entry) => allowlist.has(entry));
}

function normalizeSessionTokenField(value: unknown, maxLength: number, casing: 'upper' | 'lower' | 'none' = 'none'): string {
  const raw = String(value || '').trim().slice(0, maxLength);
  if (!raw) return '';
  if (casing === 'upper') return raw.toUpperCase();
  if (casing === 'lower') return raw.toLowerCase();
  return raw;
}

export function createServiceClient() {
  const appId = Deno.env.get('BASE44_APP_ID');
  const serviceRoleKey = Deno.env.get('BASE44_SERVICE_ROLE_KEY');

  if (!appId || !serviceRoleKey) {
    throw new Error('Service role not configured');
  }

  return createClient({ appId, serviceRoleKey });
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function getAdminUser(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return null;
    if (typeof user.role === 'string' && user.role.toLowerCase() === 'admin') {
      return user;
    }
    if (hasSystemAdminIdentity(user)) {
      return user;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isAdminMember(memberProfile: any) {
  if (!memberProfile) return false;
  if (hasSystemAdminIdentity(memberProfile)) return true;
  const rank = (memberProfile.rank || '').toString().toUpperCase();
  const roles = Array.isArray(memberProfile.roles)
    ? memberProfile.roles.map((r) => r.toString().toLowerCase())
    : [];
  return Boolean(memberProfile.is_admin) || rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
}

export function isAiFeaturesEnabled(memberProfile: any) {
  const raw = memberProfile?.ai_consent;
  if (raw === null || raw === undefined || raw === '') return true;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw !== 0;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'disabled' || normalized === 'no') {
    return false;
  }
  return true;
}

function decodeMemberToken(token: string | null | undefined) {
  if (!token) return null;
  if (token.length > MAX_MEMBER_TOKEN_LENGTH) return null;
  try {
    const decoded = JSON.parse(atob(token));
    if (!decoded || typeof decoded !== 'object') return null;
    const code = normalizeSessionTokenField(decoded.code, 64, 'upper');
    const callsign = normalizeSessionTokenField(decoded.callsign, 64, 'none');
    const memberProfileId = normalizeSessionTokenField(decoded.memberProfileId || decoded.member_profile_id, 120, 'none') || null;
    if (!code || !callsign) return null;
    const timestamp = Number(decoded.timestamp);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      const ageMs = Date.now() - timestamp;
      if (ageMs < 0 || ageMs > MEMBER_TOKEN_MAX_AGE_MS) return null;
    }
    return {
      code,
      callsign,
      memberProfileId,
    } as MemberSession;
  } catch {
    return null;
  }
}

function getMemberSessionFromPayload(payload: any) {
  if (!payload || typeof payload !== 'object') return null;
  const token = payload.memberToken || payload.member_token || payload.memberSession || payload.sessionToken || null;
  const decoded = decodeMemberToken(token);
  if (decoded?.code && decoded?.callsign) return decoded;

  const code = payload.code;
  const callsign = payload.callsign;
  if (typeof code === 'string' && typeof callsign === 'string') {
    return {
      code: normalizeSessionTokenField(code, 64, 'upper'),
      callsign: normalizeSessionTokenField(callsign, 64, 'none'),
      memberProfileId: normalizeSessionTokenField(payload.memberProfileId || payload.member_profile_id, 120, 'none') || null,
    };
  }
  return null;
}

async function fetchMemberProfile(base44: ReturnType<typeof createClient>, session: MemberSession) {
  let profile = null;

  if (session.memberProfileId) {
    try {
      profile = await base44.entities.MemberProfile.get(session.memberProfileId);
    } catch {
      try {
        const byId = await base44.entities.MemberProfile.filter({ id: session.memberProfileId });
        profile = byId?.[0] ?? null;
      } catch {
        // ignore
      }
    }
  }

  if (!profile) {
    try {
      const byCallsign = await base44.entities.MemberProfile.filter({ callsign: session.callsign.trim() });
      profile = byCallsign?.[0] ?? null;
    } catch {
      // ignore
    }
  }

  if (!profile) {
    try {
      const byDisplay = await base44.entities.MemberProfile.filter({ display_callsign: session.callsign.trim() });
      profile = byDisplay?.[0] ?? null;
    } catch {
      // ignore
    }
  }

  return profile;
}

export async function verifyMemberSession(base44: ReturnType<typeof createClient>, session: MemberSession) {
  if (!session?.code || !session?.callsign) return null;

  const keys = await base44.entities.AccessKey.filter({ code: session.code });
  if (!keys || keys.length === 0) return null;

  const key = keys[0];

  if (key.status === 'REVOKED') return null;

  if (key.status === 'EXPIRED' || (key.expires_at && new Date(key.expires_at) < new Date())) {
    return null;
  }

  const profile = await fetchMemberProfile(base44, session);
  if (!profile) return null;

  const trimmedCallsign = session.callsign.trim();
  const matchesCallsign = profile.callsign === trimmedCallsign || profile.display_callsign === trimmedCallsign;
  if (!matchesCallsign) return null;

  const redeemedIds = key.redeemed_by_member_profile_ids || [];
  const wasRedeemedByProfile = redeemedIds.includes(profile.id);
  const isKeyActive = key.status === 'ACTIVE';
  const canAssociateRedeemed = key.status === 'REDEEMED' && redeemedIds.length === 0;

  if (!wasRedeemedByProfile && !isKeyActive && !canAssociateRedeemed) {
    return null;
  }

  if (!wasRedeemedByProfile && (isKeyActive || canAssociateRedeemed)) {
    try {
      await base44.entities.AccessKey.update(key.id, {
        redeemed_by_member_profile_ids: [...redeemedIds, profile.id],
      });
    } catch {
      // ignore association errors
    }
  }

  return profile;
}

export async function getAuthContext(req: Request, payload: any, options: AuthOptions = {}): Promise<AuthContext> {
  const base44 = createServiceClient();
  const allowAdmin = options.allowAdmin !== false;
  const allowMember = options.allowMember !== false;
  const requireAdmin = options.requireAdmin === true;
  const requireMember = options.requireMember === true;

  let adminUser = null;
  if (allowAdmin) {
    adminUser = await getAdminUser(req);
  }

  let memberProfile = null;
  if (allowMember) {
    const session = getMemberSessionFromPayload(payload);
    if (session) {
      try {
        memberProfile = await verifyMemberSession(base44, session);
      } catch {
        memberProfile = null;
      }
    }
  }

  let actorType: 'admin' | 'member' | null = null;
  if (adminUser) actorType = 'admin';
  else if (memberProfile) actorType = 'member';

  if (requireAdmin && !adminUser) actorType = null;
  if (requireMember && !memberProfile) actorType = null;

  return { base44, actorType, adminUser, memberProfile };
}
