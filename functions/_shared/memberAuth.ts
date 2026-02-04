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
    if (user && typeof user.role === 'string' && user.role.toLowerCase() === 'admin') {
      return user;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isAdminMember(memberProfile: any) {
  if (!memberProfile) return false;
  const rank = (memberProfile.rank || '').toString().toUpperCase();
  const roles = Array.isArray(memberProfile.roles)
    ? memberProfile.roles.map((r) => r.toString().toLowerCase())
    : [];
  return Boolean(memberProfile.is_admin) || rank === 'PIONEER' || rank === 'FOUNDER' || roles.includes('admin');
}

function decodeMemberToken(token: string | null | undefined) {
  if (!token) return null;
  try {
    const decoded = JSON.parse(atob(token));
    if (!decoded || typeof decoded !== 'object') return null;
    return {
      code: decoded.code,
      callsign: decoded.callsign,
      memberProfileId: decoded.memberProfileId || decoded.member_profile_id || null
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
    return { code, callsign, memberProfileId: payload.memberProfileId || payload.member_profile_id || null };
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
