import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, payload);

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memberProfileIds = Array.isArray(payload?.memberProfileIds) ? payload.memberProfileIds : [];
    if (memberProfileIds.length === 0) {
      return Response.json({ presenceById: {} });
    }

    const presenceById: Record<string, any> = {};

    await Promise.all(
      memberProfileIds.map(async (id) => {
        if (!id) return;
        let records = [];
        try {
          records = await base44.entities.UserPresence.filter({ member_profile_id: id });
        } catch {
          records = [];
        }

        if (!records || records.length === 0) {
          try {
            records = await base44.entities.UserPresence.filter({ user_id: id });
          } catch {
            records = [];
          }
        }

        if (records && records.length > 0) {
          presenceById[id] = records[0];
        }
      })
    );

    return Response.json({ presenceById });
  } catch (error) {
    console.error('[PRESENCE] getPresenceSnapshot error:', error?.message);
    return Response.json({ error: error?.message, presenceById: {} }, { status: 500 });
  }
});
