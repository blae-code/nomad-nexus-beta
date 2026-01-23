import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, content, channelId } = await req.json();

    // Analyze message for routing and priority
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this message for operational context and priority:

Message: "${content}"

Determine:
1. Priority level (low, medium, high, critical)
2. Category (tactical, logistics, admin, social, emergency)
3. Should it be escalated to leadership? (yes/no)
4. Brief 1-sentence summary
5. Relevant action items (if any)

Respond in JSON format.`,
      response_json_schema: {
        type: "object",
        properties: {
          priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
          category: { type: "string" },
          escalate: { type: "boolean" },
          summary: { type: "string" },
          action_items: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Update message with AI analysis
    await base44.entities.Message.update(messageId, {
      ai_analysis: {
        ...analysis,
        analyzed_at: new Date().toISOString()
      }
    });

    // If critical, create notification
    if (analysis.priority === 'critical' && analysis.escalate) {
      const channel = await base44.entities.Channel.filter({ id: channelId });
      await base44.integrations.Core.InvokeLLM({
        prompt: `Create a priority alert notification about: ${analysis.summary}`
      });
    }

    return Response.json({ success: true, analysis });
  } catch (error) {
    console.error('Message analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});