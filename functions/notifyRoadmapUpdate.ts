import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
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