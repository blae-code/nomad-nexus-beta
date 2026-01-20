import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Missing eventId' }, { status: 400 });
    }

    // Fetch event details
    const event = await base44.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch event logs
    const logs = await base44.entities.EventLog.filter(
      { event_id: eventId },
      'created_date',
      200
    );

    // Fetch participants
    const participants = await base44.entities.EventParticipants?.filter({ event_id: eventId }) || [];

    // Build context for LLM
    const logSummary = logs
      .slice(-50)
      .map(log => `[${log.type}] ${log.summary} (${log.severity})`)
      .join('\n');

    const prompt = `Generate a professional After Action Report (AAR) for a military/gaming operation.

OPERATION DETAILS:
- Title: ${event.title}
- Type: ${event.event_type}
- Priority: ${event.priority}
- Duration: ${new Date(event.start_time).toISOString()} to ${event.end_time ? new Date(event.end_time).toISOString() : 'Ongoing'}
- Participants: ${participants.length} operators
- Location: ${event.location || 'Classified'}

MISSION BRIEFING:
${event.description}

OPERATIONAL LOG (last 50 entries):
${logSummary}

Generate a professional AAR including:
1. Executive Summary (2-3 sentences)
2. Mission Objectives & Status
3. Key Events & Timeline
4. Personnel Performance & Assignments
5. Equipment & Resource Status
6. Casualties/Losses (if any)
7. Lessons Learned
8. Recommendations

Format as Markdown. Keep it concise but comprehensive.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          executive_summary: { type: 'string' },
          content: { type: 'string' },
          key_findings: {
            type: 'array',
            items: { type: 'string' }
          },
          recommendations: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['title', 'content']
      }
    });

    // Create or update EventReport
    const existing = await base44.asServiceRole.entities.EventReport.filter(
      { event_id: eventId, report_type: 'AAR' },
      '-created_date',
      1
    );

    let report;
    if (existing?.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.EventReport.update(existing[0].id, {
        title: response.title || `AAR: ${event.title}`,
        content: response.content,
        generated_by: 'ai-aar-generator',
        key_findings: response.key_findings || [],
        log_count: logs.length
      });
      report = await base44.asServiceRole.entities.EventReport.get(existing[0].id);
    } else {
      // Create new
      report = await base44.asServiceRole.entities.EventReport.create({
        event_id: eventId,
        report_type: 'AAR',
        title: response.title || `AAR: ${event.title}`,
        content: response.content,
        generated_by: 'ai-aar-generator',
        key_findings: response.key_findings || [],
        log_count: logs.length
      });
    }

    return Response.json({
      success: true,
      report: report,
      message: 'AAR generated successfully'
    });

  } catch (error) {
    console.error('AAR generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});