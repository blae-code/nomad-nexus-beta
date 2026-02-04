import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { CANONICAL_CHANNELS } from '@/components/comms/channelTaxonomy.js';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    const isFounder = (memberProfile?.rank || '').toUpperCase() === 'FOUNDER';

    if (!isAdmin && !isFounder) {
      return Response.json({ error: 'Founders only' }, { status: 403 });
    }

    const results = { created: 0, skipped: 0 };

    // Seed ORG channels
    for (const [canonicalKey, config] of Object.entries(CANONICAL_CHANNELS.ORG)) {
      const existing = await base44.entities.CommsChannel.filter({
        canonical_key: canonicalKey
      });

      if (existing.length > 0) {
        results.skipped++;
        continue;
      }

      await base44.entities.CommsChannel.create({
        name: config.name,
        slug: canonicalKey,
        description: config.description,
        type: config.type,
        scope: 'ORG',
        is_canonical: true,
        canonical_key: canonicalKey,
        post_policy: config.post_policy,
        reply_policy: config.reply_policy,
        created_by_member_profile_id: memberProfile?.id || null,
        membership: [] // All members can access ORG channels
      });

      results.created++;
    }

    return Response.json({
      message: 'Canonical channels seeded',
      ...results
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
