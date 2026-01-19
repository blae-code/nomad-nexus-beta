import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, eventId, status, location, notes, callsign } = await req.json();

    // Build analysis prompt
    const prompt = `Analyze this tactical status update for critical operational information:

**Operator:** ${callsign}
**Status:** ${status}
**Location:** ${location || 'Unknown'}
**Notes:** ${notes || 'None'}

Determine:
1. Is this a distress signal or emergency? (YES/NO)
2. Severity level: LOW, MEDIUM, HIGH, CRITICAL
3. Key information extracted (location, threat, needs)
4. Recommended action (if any)
5. Brief summary for operational feed

Respond in JSON format.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          is_distress: { type: "boolean" },
          severity: { type: "string" },
          key_info: { type: "string" },
          recommended_action: { type: "string" },
          summary: { type: "string" }
        }
      }
    });

    // Create AI Agent Log if significant
    if (analysis.severity === 'HIGH' || analysis.severity === 'CRITICAL' || analysis.is_distress) {
      await base44.asServiceRole.entities.AIAgentLog.create({
        agent_slug: 'status_monitor',
        event_id: eventId,
        type: analysis.is_distress ? 'ALERT' : 'INFO',
        severity: analysis.severity,
        summary: analysis.summary,
        details: JSON.stringify({
          operator: callsign,
          status,
          location,
          notes,
          key_info: analysis.key_info,
          recommended_action: analysis.recommended_action
        })
      });
    }

    return Response.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error("Status analysis error:", error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});