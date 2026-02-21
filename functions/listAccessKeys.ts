import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 1000;

function normalizeLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  const rounded = Math.trunc(parsed);
  if (rounded < 1) return DEFAULT_LIMIT;
  return Math.min(rounded, MAX_LIMIT);
}

function isRevoked(status: unknown) {
  return String(status || '').trim().toUpperCase() === 'REVOKED';
}

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true,
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (!isAdmin) {
      return Response.json({ error: 'Insufficient privileges' }, { status: 403 });
    }

    const limit = normalizeLimit(payload?.limit);
    const includeRevoked = payload?.includeRevoked === true;

    const keys = await base44.entities.AccessKey.list('-created_date', limit).catch(() => []);
    const normalized = Array.isArray(keys) ? keys : [];
    const filtered = includeRevoked ? normalized : normalized.filter((entry) => !isRevoked(entry?.status));

    return Response.json({
      success: true,
      keys: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('[listAccessKeys] Error:', error?.message || error);
    return Response.json({ error: 'Failed to list access keys' }, { status: 500 });
  }
});
