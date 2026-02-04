import { getAuthContext, readJson, isAdminMember } from './_shared/memberAuth.ts';

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
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { message, webhookUrl } = payload;
    if (!message) {
      return Response.json({ error: 'message required' }, { status: 400 });
    }

    let url = webhookUrl || null;
    if (!url) {
      try {
        const configs = await base44.entities.IntegrationConfig.filter({ provider: 'DISCORD' });
        if (configs?.[0]?.webhook_url) url = configs[0].webhook_url;
      } catch {
        url = null;
      }
    }

    if (!url) {
      return Response.json({ error: 'Discord webhook not configured' }, { status: 400 });
    }

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });

    return Response.json({ success: resp.ok, status: resp.status });
  } catch (error) {
    console.error('[discordBridgeSync] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
