import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const body = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, body);

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { eventId, milestoneType, change, severity = 'INFO', emailRecipients = [] } = body;
    
    // Create in-app notification
    const notification = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Create a brief, professional notification message for: ${change}`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          message: { type: "string" }
        }
      }
    });
    
    // Send email alerts if recipients provided
    if (emailRecipients && emailRecipients.length > 0) {
      const emailPromises = emailRecipients.map(email =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `Nomad Nexus Roadmap Update: ${notification.title}`,
          body: `
Roadmap Update: ${notification.title}

${notification.message}

Milestone: ${milestoneType}
Change: ${change}
Priority: ${severity}

Visit the Hub to view the full roadmap.
          `.trim()
        })
      );
      
      await Promise.all(emailPromises);
    }
    
    return Response.json({
      success: true,
      notification: notification,
      emailsSent: emailRecipients.length
    });
  } catch (error) {
    console.error('Roadmap notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
