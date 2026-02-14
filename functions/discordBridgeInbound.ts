import { createClient } from 'npm:@base44/sdk@0.8.6';
import { readJson } from './_shared/memberAuth.ts';
import { enforceJsonPost, verifyInternalAutomationRequest } from './_shared/security.ts';

const STATUS_SET = new Set(['active', 'away', 'idle', 'offline', 'in-call', 'transmitting']);

function text(value: unknown, maxLength = 200): string {
  return String(value || '').trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  try {
    const methodCheck = enforceJsonPost(req);
    if (!methodCheck.ok) {
      return Response.json({ error: methodCheck.error }, { status: methodCheck.status });
    }

    const payload = await readJson(req);
    const internalAuth = verifyInternalAutomationRequest(req, payload, { requiredWhenSecretMissing: true });
    if (!internalAuth.ok) {
      return Response.json({ error: internalAuth.error }, { status: internalAuth.status });
    }

    const base44 = createClient();
    const action = text(payload?.action, 40).toLowerCase();

    if (action === 'rsvp') {
      const eventId = text(payload?.eventId, 120);
      const memberProfileId = text(payload?.memberProfileId, 120);
      const status = text(payload?.status, 24).toLowerCase();
      if (!eventId || !memberProfileId || !status) {
        return Response.json({ error: 'Missing rsvp fields' }, { status: 400 });
      }
      if (!['going', 'maybe', 'declined'].includes(status)) {
        return Response.json({ error: 'Invalid rsvp status' }, { status: 400 });
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
      const memberProfileId = text(payload?.memberProfileId, 120);
      const status = text(payload?.status, 32).toLowerCase();
      const notes = text(payload?.notes, 500);
      if (!memberProfileId || !status) {
        return Response.json({ error: 'Missing status fields' }, { status: 400 });
      }
      if (!STATUS_SET.has(status)) {
        return Response.json({ error: 'Invalid status' }, { status: 400 });
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
    console.error('[discordBridgeInbound] Error:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Bridge inbound failed' }, { status: 500 });
  }
});
