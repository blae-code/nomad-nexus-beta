import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const withTimeout = (promise, ms = 3000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
]);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, timeWindowMinutes = 30 } = await req.json();

    // Fetch recent logs and activity
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60000).toISOString();
    
    const [logs, messages, incidents] = await Promise.all([
      withTimeout(base44.entities.EventLog.filter(
        eventId ? { event_id: eventId } : {},
        '-created_date',
        100
      ), 2000).catch(() => []),
      withTimeout(base44.entities.Message.filter({}, '-created_date', 50), 2000).catch(() => []),
      withTimeout(base44.entities.Incident.filter({ status: 'active' }), 2000).catch(() => [])
    ]);

    // Filter to time window
    const recentLogs = logs.filter(l => new Date(l.created_date) > new Date(cutoffTime));
    const recentMessages = messages.filter(m => new Date(m.created_date) > new Date(cutoffTime));

    // Build context for AI analysis
    const context = {
      logCount: recentLogs.length,
      messageCount: recentMessages.length,
      activeIncidents: incidents.length,
      logTypes: recentLogs.reduce((acc, l) => {
        acc[l.type] = (acc[l.type] || 0) + 1;
        return acc;
      }, {}),
      highSeverityLogs: recentLogs.filter(l => l.severity === 'HIGH').length,
      recentLogSample: recentLogs.slice(0, 10).map(l => ({
        type: l.type,
        severity: l.severity,
        summary: l.summary,
        time: l.created_date
      }))
    };

    // Invoke LLM for anomaly detection
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI operations analyst monitoring military-style communications and operations.

Analyze the following comms activity for anomalies, unusual patterns, or potential issues:

Time Window: Last ${timeWindowMinutes} minutes
Total Logs: ${context.logCount}
Messages: ${context.messageCount}
Active Incidents: ${context.activeIncidents}
High Severity Events: ${context.highSeverityLogs}

Log Types Distribution: ${JSON.stringify(context.logTypes)}

Recent Activity Sample:
${context.recentLogSample.map(l => `[${l.type}/${l.severity}] ${l.summary}`).join('\n')}

Identify:
1. Unusual patterns (sudden spikes, drops in activity, repeated failures)
2. Security concerns (unauthorized access attempts, unusual behavior)
3. Operational issues (communication breakdowns, mission drift)
4. Resource problems (overload, capacity issues)

Be concise and tactical. Focus on actionable intelligence.`,
      response_json_schema: {
        type: "object",
        properties: {
          anomalies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
                type: { type: "string" },
                description: { type: "string" },
                recommended_action: { type: "string" }
              }
            }
          },
          overall_status: { type: "string", enum: ["NOMINAL", "ELEVATED", "CRITICAL"] },
          summary: { type: "string" }
        }
      }
    });

    // Log the analysis
    await base44.asServiceRole.entities.EventLog.create({
      event_id: eventId || null,
      type: 'SYSTEM',
      severity: response.overall_status === 'CRITICAL' ? 'HIGH' : response.overall_status === 'ELEVATED' ? 'MEDIUM' : 'LOW',
      summary: `AI Anomaly Detection: ${response.overall_status}`,
      details: {
        anomaly_count: response.anomalies?.length || 0,
        summary: response.summary
      }
    });

    return Response.json({
      status: 'success',
      analysis: response,
      context: {
        timeWindowMinutes,
        logsAnalyzed: recentLogs.length,
        messagesAnalyzed: recentMessages.length
      }
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});