import { getAuthContext, readJson } from './_shared/memberAuth.ts';

const DEFAULT_RECENCY_MS = 90_000;
const DEFAULT_LIMIT = 200;

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, payload);

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recencyWindowMs = Number(payload?.recencyWindowMs) || DEFAULT_RECENCY_MS;
    const limit = Number(payload?.limit) || DEFAULT_LIMIT;

    const records = await base44.entities.UserPresence.list('-last_activity', limit);
    const now = Date.now();
    const presence = (records || []).filter((record) => {
      if (!record?.last_activity) return false;
      const lastSeen = new Date(record.last_activity).getTime();
      return now - lastSeen <= recencyWindowMs;
    });

    return Response.json({ presence });
  } catch (error) {
    console.error('[PRESENCE] getOnlinePresence error:', error?.message);
    return Response.json({ error: error?.message, presence: [] }, { status: 500 });
  }
});
