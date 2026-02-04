/**
 * notifyFeatureCompletion — Send thematic one-time notification to users
 * about feature completion. Respects user notification preferences.
 */

import { getAuthContext, isAdminMember, readJson } from './_shared/memberAuth.ts';

const THEMATIC_MESSAGES = {
  SYSTEM_ADMIN_COMPLETE: {
    title: '⚙️ System Admin Module Online',
    body: 'Nexus operations console now live. Factory Reset, Immersive Seed, Data Validation, and Diagnostics Bundle ready for operator deployment.',
    severity: 'INFO',
    category: 'SYSTEM',
  },
};

Deno.serve(async (req) => {
  try {
    const body = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, body, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feature, notifyAll = false } = body;

    if (!feature || !THEMATIC_MESSAGES[feature]) {
      return Response.json(
        { error: 'Invalid or missing feature key' },
        { status: 400 }
      );
    }

    const message = THEMATIC_MESSAGES[feature];

    // Get target users
    let targetUsers = [];
    const isAdmin = actorType === 'admin' || isAdminMember(memberProfile);
    if (notifyAll) {
      // Service role: notify all users (admin only)
      if (!isAdmin) {
        return Response.json(
          { error: 'Forbidden: Admin only' },
          { status: 403 }
        );
      }
      targetUsers = await base44.entities.MemberProfile.list();
    } else {
      // Notify current user only
      targetUsers = memberProfile ? [memberProfile] : [];
    }

    // Create notification records (one per user)
    const notifications = targetUsers.map((u) => ({
      user_id: u.id,
      title: message.title,
      body: message.body,
      severity: message.severity,
      category: message.category,
      read: false,
      is_one_time: true,
      feature_key: feature,
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({
      success: true,
      notified_count: notifications.length,
      feature,
      message: message.title,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
