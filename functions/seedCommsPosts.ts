import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { CONTENT_TEMPLATES, generateSeedPost } from '@/components/comms/seedContentStyleGuide.js';

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

    const results = { created: 0, skipped: 0, errors: [] };

    // Fetch all canonical channels
    const channels = await base44.entities.CommsChannel.filter(
      { is_canonical: true },
      null,
      100
    );

    // Seed posts per channel type
    for (const channel of channels) {
      try {
        let contentToSeed = [];

        switch (channel.canonical_key) {
          case 'org-announcements':
            contentToSeed = CONTENT_TEMPLATES.org_announcement.slice(0, 2);
            break;
          case 'org-ops-briefings':
            contentToSeed = CONTENT_TEMPLATES.ops_brief.map(b => b.template);
            break;
          case 'org-ops-sitrep':
            contentToSeed = CONTENT_TEMPLATES.sitrep_update.slice(0, 3);
            break;
          case 'org-distress-dispatch':
            contentToSeed = CONTENT_TEMPLATES.distress_ticket.map(t => t.template);
            break;
          case 'org-general-comms':
            contentToSeed = CONTENT_TEMPLATES.general_post.slice(0, 3);
            break;
          case 'org-intel-ledger':
            contentToSeed = CONTENT_TEMPLATES.intel_sighting.map(i => i.template);
            break;
          case 'org-market-logistics':
            contentToSeed = CONTENT_TEMPLATES.logistics_note.slice(0, 3);
            break;
          default:
            continue;
        }

        // Create posts
        for (const content of contentToSeed) {
          await base44.entities.CommsPost.create({
            channel_id: channel.id,
            author_id: memberProfile?.id || null,
            content: content,
            template_type: 'FREEFORM'
          });
          results.created++;
        }
      } catch (err) {
        results.errors.push(`${channel.canonical_key}: ${err.message}`);
      }
    }

    return Response.json({
      message: 'Comms posts seeded',
      ...results
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
