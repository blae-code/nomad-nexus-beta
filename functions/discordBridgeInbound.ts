import { createClient } from 'npm:@base44/sdk@0.8.6';

const getSecret = () => Deno.env.get('DISCORD_BRIDGE_SECRET') || '';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const secret = getSecret();
    if (!secret || payload.bridgeSecret !== secret) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const base44 = createClient();
    const { action } = payload;

    if (action === 'rsvp') {
      const { eventId, memberProfileId, status } = payload;
      if (!eventId || !memberProfileId || !status) {
        return Response.json({ error: 'Missing rsvp fields' }, { status: 400 });
      }
      const event = await base44.entities.Event.get(eventId);
      const going = new Set(event.rsvp_going_ids || []);
      const maybe = new Set(event.rsvp_maybe_ids || []);
      const declined = new Set(event.rsvp_declined_ids || []);

      going.delete(memberProfileId);
      maybe.delete(memberProfileId);
      declined.delete(memberProfileId);

      if (status === 'going') going.add(memberProfileId);
      if (status === 'maybe') maybe.add(memberProfileId);
      if (status === 'declined') declined.add(memberProfileId);

      await base44.entities.Event.update(eventId, {
        rsvp_going_ids: Array.from(going),
        rsvp_maybe_ids: Array.from(maybe),
        rsvp_declined_ids: Array.from(declined),
      });

      return Response.json({ success: true });
    }

    if (action === 'status') {
      const { memberProfileId, status, notes } = payload;
      if (!memberProfileId || !status) {
        return Response.json({ error: 'Missing status fields' }, { status: 400 });
      }
      const existing = await base44.entities.PlayerStatus.filter({ member_profile_id: memberProfileId });
      const data = {
        member_profile_id: memberProfileId,
        status,
        notes,
      };
      if (existing?.[0]) {
        await base44.entities.PlayerStatus.update(existing[0].id, data);
      } else {
        await base44.entities.PlayerStatus.create(data);
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[discordBridgeInbound] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
