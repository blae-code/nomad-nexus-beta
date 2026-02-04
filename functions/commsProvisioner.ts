import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';
import { COMMS_REGISTRY, getOrgChannelSlugs } from '@/components/comms/commsRegistry.js';

/**
 * Comms Provisioner: Ensures channels exist and remain consistent
 * Idempotent: safe to call repeatedly
 */

/**
 * Ensure all canonical ORG channels exist
 */
export const ensureCommsBaseline = async (base44) => {
  const results = { created: 0, updated: 0, verified: 0, errors: [] };

  for (const chDef of COMMS_REGISTRY.orgChannels) {
    try {
      // Check if channel exists
      const existing = await base44.entities.CommsChannel.filter(
        { canonical_key: chDef.slug },
        null,
        1
      );

      if (existing.length > 0) {
        // Verify metadata consistency
        const ch = existing[0];
        const needsUpdate = ch.name !== chDef.name || 
                           ch.type !== chDef.type || 
                           ch.scope !== chDef.scope;

        if (needsUpdate) {
          await base44.entities.CommsChannel.update(ch.id, {
            name: chDef.name,
            type: chDef.type,
            scope: chDef.scope,
            description: chDef.description
          });
          results.updated++;
        } else {
          results.verified++;
        }
      } else {
        // Create missing channel
        await base44.entities.CommsChannel.create({
          name: chDef.name,
          slug: chDef.slug,
          description: chDef.description,
          type: chDef.type,
          scope: 'ORG',
          is_canonical: true,
          canonical_key: chDef.slug,
          created_by: 'system',
          membership: [],
          post_policy: 'MEMBERS',
          reply_policy: 'ALL',
          is_locked: false,
          is_hidden: false,
          pinned_post_ids: [],
          moderated_by: []
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push(`${chDef.slug}: ${err.message}`);
    }
  }

  return results;
};

/**
 * Ensure dynamic channels exist for a role
 */
export const ensureDynamicChannelsForRole = async (base44, roleId, roleName, roleSlug) => {
  const results = { created: 0, skipped: 0, errors: [] };
  const roleTemplate = COMMS_REGISTRY.dynamicTemplates.find(t => t.kind === 'ROLE');

  if (!roleTemplate) {
    results.errors.push('No ROLE template found');
    return results;
  }

  try {
    const slug = roleTemplate.slugPattern.replace('{roleSlug}', roleSlug);
    const existing = await base44.entities.CommsChannel.filter({ slug }, null, 1);

    if (existing.length === 0) {
      await base44.entities.CommsChannel.create({
        name: roleTemplate.name.replace('{roleName}', roleName),
        slug,
        description: roleTemplate.description.replace('{roleName}', roleName),
        type: roleTemplate.type,
        scope: 'ROLE',
        scope_id: roleId,
        is_canonical: false,
        created_by: 'system',
        membership: [],
        post_policy: 'MEMBERS',
        reply_policy: 'ENABLED',
        is_locked: false,
        is_hidden: false,
        pinned_post_ids: [],
        moderated_by: []
      });
      results.created++;
    } else {
      results.skipped++;
    }
  } catch (err) {
    results.errors.push(`Role dispatch: ${err.message}`);
  }

  return results;
};

/**
 * Ensure dynamic channels exist for a squad
 */
export const ensureDynamicChannelsForSquad = async (base44, squadId, squadName, squadSlug) => {
  const results = { created: 0, skipped: 0, errors: [] };
  const squadTemplate = COMMS_REGISTRY.dynamicTemplates.find(t => t.kind === 'SQUAD');

  if (!squadTemplate) {
    results.errors.push('No SQUAD template found');
    return results;
  }

  try {
    const slug = squadTemplate.slugPattern
      .replace('{squadSlug}', squadSlug)
      .replace('{squadName}', squadName);
    const existing = await base44.entities.CommsChannel.filter({ slug }, null, 1);

    if (existing.length === 0) {
      await base44.entities.CommsChannel.create({
        name: squadTemplate.name.replace('{squadName}', squadName),
        slug,
        description: squadTemplate.description.replace('{squadName}', squadName),
        type: squadTemplate.type,
        scope: 'SQUAD',
        scope_id: squadId,
        is_canonical: false,
        created_by: 'system',
        membership: [],
        post_policy: 'MEMBERS',
        reply_policy: 'DISABLED',
        is_locked: false,
        is_hidden: false,
        pinned_post_ids: [],
        moderated_by: []
      });
      results.created++;
    } else {
      results.skipped++;
    }
  } catch (err) {
    results.errors.push(`Squad net: ${err.message}`);
  }

  return results;
};

/**
 * Ensure dynamic channels exist for an operation
 */
export const ensureDynamicChannelsForOperation = async (base44, opId, opTitle) => {
  const results = { created: 0, skipped: 0, errors: [] };
  const opTemplate = COMMS_REGISTRY.dynamicTemplates.find(t => t.kind === 'OP');

  if (!opTemplate) {
    results.errors.push('No OP template found');
    return results;
  }

  try {
    const slug = opTemplate.slugPattern.replace('{opId}', opId);
    const existing = await base44.entities.CommsChannel.filter({ slug }, null, 1);

    if (existing.length === 0) {
      await base44.entities.CommsChannel.create({
        name: opTemplate.name.replace('{opId}', opId),
        slug,
        description: opTemplate.description.replace('{opId}', opId),
        type: opTemplate.type,
        scope: 'OP',
        scope_id: opId,
        is_canonical: false,
        created_by: 'system',
        membership: [],
        post_policy: 'MEMBERS',
        reply_policy: 'DISABLED',
        is_locked: false,
        is_hidden: false,
        pinned_post_ids: [],
        moderated_by: []
      });
      results.created++;
    } else {
      results.skipped++;
    }
  } catch (err) {
    results.errors.push(`Op live: ${err.message}`);
  }

  return results;
};

/**
 * Deno endpoint: Initialize baseline comms (call on app init/seed)
 */
export const provisionCommsEndpoint = Deno.serve(async (req) => {
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

    const baselineResults = await ensureCommsBaseline(base44);

    return Response.json({
      message: 'Comms baseline provisioned',
      baseline: baselineResults
    });
  } catch (error) {
    console.error('Provisioning error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
