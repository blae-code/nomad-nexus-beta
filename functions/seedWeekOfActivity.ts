import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { CONTENT_TEMPLATES } from '@/components/comms/seedContentStyleGuide.js';
import { ensureCommsBaseline } from './commsProvisioner.js';

/**
 * Seed a week of realistic, ops-first comms activity
 * Generates posts across all canonical channels with proper author ranks/roles
 * Calls provisioner first to ensure baseline channels exist
 */

const SEED_SCENARIOS = [
  {
    day: 'MON',
    posts: [
      { channel: 'org-announcements', authorRank: 'Founder', templateKey: 'org_announcement', count: 1 },
      { channel: 'org-ops-briefings', authorRank: 'Scout', templateKey: 'ops_brief', count: 2 },
      { channel: 'org-general-comms', authorRank: 'Vagrant', templateKey: 'general_post', count: 3 }
    ]
  },
  {
    day: 'TUE',
    posts: [
      { channel: 'org-ops-sitrep', authorRank: 'Scout', templateKey: 'sitrep_update', count: 4 },
      { channel: 'org-intel-ledger', authorRank: 'Scout', templateKey: 'intel_sighting', count: 2 },
      { channel: 'org-general-comms', authorRank: 'Vagrant', templateKey: 'general_post', count: 2 }
    ]
  },
  {
    day: 'WED',
    posts: [
      { channel: 'org-distress-dispatch', authorRank: 'Scout', templateKey: 'distress_ticket', count: 1 },
      { channel: 'org-market-logistics', authorRank: 'Scout', templateKey: 'logistics_note', count: 3 },
      { channel: 'org-ops-briefings', authorRank: 'Voyager', templateKey: 'ops_brief', count: 1 }
    ]
  },
  {
    day: 'THU',
    posts: [
      { channel: 'org-ops-sitrep', authorRank: 'Pioneer', templateKey: 'sitrep_update', count: 3 },
      { channel: 'org-intel-ledger', authorRank: 'Scout', templateKey: 'intel_sighting', count: 2 },
      { channel: 'org-general-comms', authorRank: 'Vagrant', templateKey: 'general_post', count: 2 }
    ]
  },
  {
    day: 'FRI',
    posts: [
      { channel: 'org-distress-dispatch', authorRank: 'Scout', templateKey: 'distress_ticket', count: 2 },
      { channel: 'org-general-comms', authorRank: 'Vagrant', templateKey: 'general_post', count: 4 },
      { channel: 'org-announcements', authorRank: 'Founder', templateKey: 'org_announcement', count: 1 }
    ]
  },
  {
    day: 'SAT',
    posts: [
      { channel: 'org-ops-briefings', authorRank: 'Voyager', templateKey: 'ops_brief', count: 2 },
      { channel: 'org-market-logistics', authorRank: 'Scout', templateKey: 'logistics_note', count: 2 },
      { channel: 'org-general-comms', authorRank: 'Vagrant', templateKey: 'general_post', count: 3 }
    ]
  },
  {
    day: 'SUN',
    posts: [
      { channel: 'org-ops-sitrep', authorRank: 'Scout', templateKey: 'sitrep_update', count: 2 },
      { channel: 'org-intel-ledger', authorRank: 'Scout', templateKey: 'intel_sighting', count: 1 },
      { channel: 'org-general-comms', authorRank: 'Vagrant', templateKey: 'general_post', count: 5 }
    ]
  }
];

/**
 * Get random user with matching rank
 */
const getUserByRank = async (base44, rank) => {
  const members = await base44.entities.MemberProfile.filter({ rank }, null, 100);
  if (members.length === 0) {
    const allMembers = await base44.entities.MemberProfile.list(null, 1);
    return allMembers[0];
  }
  return members[Math.floor(Math.random() * members.length)];
};

/**
 * Get template content by key
 */
const getTemplateContent = (templateKey) => {
  const templates = CONTENT_TEMPLATES[templateKey];
  if (!templates) return null;

  if (Array.isArray(templates)) {
    const item = templates[Math.floor(Math.random() * templates.length)];
    return typeof item === 'string' ? item : item.template || item.title;
  }

  return typeof templates === 'string' ? templates : templates.template || templates.title;
};

/**
 * Main seed function
 */
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

    const results = {
      baseline: {},
      postsCreated: 0,
      channelsProcessed: 0,
      errors: []
    };

    // FIRST: Ensure baseline channels exist (idempotent)
    results.baseline = await ensureCommsBaseline(base44);

    // Fetch all canonical channels
    const channels = await base44.entities.CommsChannel.filter(
      { is_canonical: true },
      null,
      100
    );
    results.channelsProcessed = channels.length;

    // Generate posts per day
    for (const dayScenario of SEED_SCENARIOS) {
      for (const postConfig of dayScenario.posts) {
        const channel = channels.find(ch => ch.slug === postConfig.channel);
        if (!channel) {
          results.errors.push(`Channel ${postConfig.channel} not found`);
          continue;
        }

        // Get author with matching rank
        let author;
        try {
          author = await getUserByRank(base44, postConfig.authorRank);
        } catch (err) {
          results.errors.push(`No user found with rank ${postConfig.authorRank}`);
          continue;
        }

        // Generate N posts of this type
        for (let i = 0; i < postConfig.count; i++) {
          try {
            const content = getTemplateContent(postConfig.templateKey);
            if (!content) {
              results.errors.push(`Template ${postConfig.templateKey} not found`);
              continue;
            }

            await base44.entities.CommsPost.create({
              channel_id: channel.id,
              author_id: author.id,
              content: content,
              template_type: 'FREEFORM',
              created_date: new Date().toISOString()
            });

            results.postsCreated++;
          } catch (err) {
            results.errors.push(`Post creation failed: ${err.message}`);
          }
        }
      }
    }

    return Response.json({
      message: 'Week of activity seeded',
      ...results
    });
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
