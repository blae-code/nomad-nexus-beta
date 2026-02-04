/**
 * AI-powered message moderation
 * Analyzes message content for policy violations
 */

import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);

    if (!actorType || !isAdmin) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message_id, content, channel_id } = payload;

    if (!content || !message_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use AI to analyze message content
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this message for policy violations. Check for: harassment, hate speech, spam, explicit content, threats, or inappropriate behavior.

Message: "${content}"

Respond with a JSON object indicating if the message violates policies.`,
      response_json_schema: {
        type: 'object',
        properties: {
          is_violation: { type: 'boolean' },
          violation_type: { type: 'string' },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          reason: { type: 'string' },
          should_auto_delete: { type: 'boolean' },
          should_timeout_user: { type: 'boolean' },
          suggested_action: { type: 'string' }
        }
      }
    });

    // If violation detected, take action
    if (analysis.is_violation && analysis.should_auto_delete) {
      await base44.entities.Message.update(message_id, {
        is_deleted: true,
        deleted_by_member_profile_id: memberProfile?.id || null,
        deleted_at: new Date().toISOString(),
        deleted_reason: `Auto-moderation: ${analysis.reason}`
      });
    }

    // Create moderation log
    await base44.entities.AdminAuditLog.create({
      action: 'AI_MODERATION',
      actor_member_profile_id: memberProfile?.id || null,
      target_type: 'Message',
      target_id: message_id,
      details: {
        channel_id,
        analysis,
        content: content.substring(0, 100)
      }
    });

    return Response.json({
      success: true,
      analysis,
      action_taken: analysis.should_auto_delete ? 'deleted' : 'flagged'
    });

  } catch (error) {
    console.error('Moderation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
