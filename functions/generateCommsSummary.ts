import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, channelIds, startTime, endTime } = await req.json();

    // Fetch event details
    const event = await base44.entities.Event.filter({ id: eventId });
    if (!event[0]) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Gather all messages from specified channels during operation
    let allMessages = [];
    for (const channelId of channelIds) {
      const messages = await base44.entities.Message.filter({ channel_id: channelId });
      const filteredMessages = messages.filter(m => {
        const msgTime = new Date(m.created_date);
        return msgTime >= new Date(startTime) && msgTime <= new Date(endTime);
      });
      allMessages = allMessages.concat(filteredMessages);
    }

    // Sort by timestamp
    allMessages.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    // Prepare message content for AI analysis
    const messageLog = allMessages.map(m => 
      `[${new Date(m.created_date).toLocaleTimeString()}] ${m.created_by}: ${m.content}`
    ).join('\n');

    // Generate comprehensive summary
    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these operational communications and generate a comprehensive post-operation communication summary:

Event: ${event[0].title}
Message Count: ${allMessages.length}

Communications Log:
${messageLog.substring(0, 15000)}

Generate a structured summary including:
1. Executive Summary (2-3 sentences)
2. Key Communications Timeline (major events/decisions)
3. Critical Information Exchanged
4. Action Items and Assignments
5. Issues or Concerns Raised
6. Recommendations for Future Operations
7. Communication Effectiveness Assessment`,
      response_json_schema: {
        type: "object",
        properties: {
          executive_summary: { type: "string" },
          timeline: {
            type: "array",
            items: {
              type: "object",
              properties: {
                time: { type: "string" },
                event: { type: "string" },
                importance: { type: "string", enum: ["low", "medium", "high", "critical"] }
              }
            }
          },
          critical_information: { type: "array", items: { type: "string" } },
          action_items: { type: "array", items: { type: "string" } },
          issues: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          effectiveness_score: { type: "number" },
          effectiveness_notes: { type: "string" }
        }
      }
    });

    // Create event log entry with summary
    await base44.entities.EventLog.create({
      event_id: eventId,
      type: 'SYSTEM',
      severity: 'LOW',
      summary: 'Communications summary generated',
      details: {
        message_count: allMessages.length,
        channels_analyzed: channelIds.length,
        ...summary
      }
    });

    return Response.json({ 
      success: true, 
      summary,
      messages_analyzed: allMessages.length 
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});