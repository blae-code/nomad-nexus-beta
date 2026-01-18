import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, eventId, messageIds, timeWindow } = await req.json();

        if (!action) {
            return Response.json({ error: 'Missing action' }, { status: 400 });
        }

        // Fetch recent comms traffic
        const messages = await base44.entities.Message.list({
            filter: {},
            sort: { created_date: -1 },
            limit: timeWindow || 50
        });

        // Filter comms logs
        const commsLogs = messages.filter(m => 
            m.content.includes('[COMMS LOG]') && 
            (!eventId || m.content.includes(eventId))
        );

        // Analyze for threats and keywords
        if (action === 'analyze_threats') {
            const prompt = `You are a tactical comms analyst monitoring live communications.

RECENT COMMS TRAFFIC (${commsLogs.length} messages):
${commsLogs.slice(0, 30).map(m => {
    const timestamp = new Date(m.created_date).toISOString();
    return `[${timestamp}] ${m.content}`;
}).join('\n')}

TASK: Analyze this traffic for:
1. CRITICAL THREATS (distress signals, enemy contact, immediate danger)
2. HIGH-PRIORITY COMMANDS (regroup orders, abort missions, urgent requests)
3. TACTICAL KEYWORDS (ambush, hostile, casualties, mayday, emergency, retreat)
4. SUSPICIOUS PATTERNS (repeated failed comms, unusual frequencies)

Return JSON with findings:
{
  "critical_alerts": [
    {
      "severity": "critical|high|medium",
      "type": "distress|enemy_contact|equipment_failure|other",
      "message": "brief alert message",
      "net_code": "affected net code",
      "timestamp": "ISO timestamp",
      "recommended_action": "immediate action needed"
    }
  ],
  "keywords_detected": [
    {
      "keyword": "detected word/phrase",
      "context": "surrounding message context",
      "threat_level": "high|medium|low",
      "net_code": "net code"
    }
  ],
  "threat_level": "critical|elevated|normal"
}`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        critical_alerts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    severity: { type: "string" },
                                    type: { type: "string" },
                                    message: { type: "string" },
                                    net_code: { type: "string" },
                                    timestamp: { type: "string" },
                                    recommended_action: { type: "string" }
                                }
                            }
                        },
                        keywords_detected: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    keyword: { type: "string" },
                                    context: { type: "string" },
                                    threat_level: { type: "string" },
                                    net_code: { type: "string" }
                                }
                            }
                        },
                        threat_level: { type: "string" }
                    }
                }
            });

            // Store critical alerts as AIAgentLog entries
            if (result.critical_alerts?.length > 0 && eventId) {
                for (const alert of result.critical_alerts.slice(0, 3)) {
                    await base44.asServiceRole.entities.AIAgentLog.create({
                        agent_slug: 'comms_monitor',
                        event_id: eventId,
                        type: 'ALERT',
                        severity: alert.severity.toUpperCase(),
                        summary: alert.message,
                        details: `${alert.type}: ${alert.recommended_action}`
                    });
                }
            }

            return Response.json(result);
        }

        // Generate traffic summary
        if (action === 'summarize_traffic') {
            const prompt = `Provide a concise tactical summary of recent communications traffic.

COMMS TRAFFIC (${commsLogs.length} messages):
${commsLogs.slice(0, 40).map(m => {
    const timestamp = new Date(m.created_date).toLocaleTimeString();
    return `[${timestamp}] ${m.content}`;
}).join('\n')}

Generate a brief executive summary (2-3 sentences) covering:
- Overall activity level
- Key events or patterns
- Notable tactical movements
- Any concerns

Return JSON:
{
  "summary": "executive summary text",
  "activity_level": "high|moderate|low",
  "key_events": ["event 1", "event 2", "event 3"],
  "nets_active": ["NET1", "NET2"],
  "concerns": ["concern 1"] or []
}`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        activity_level: { type: "string" },
                        key_events: {
                            type: "array",
                            items: { type: "string" }
                        },
                        nets_active: {
                            type: "array",
                            items: { type: "string" }
                        },
                        concerns: {
                            type: "array",
                            items: { type: "string" }
                        }
                    }
                }
            });

            return Response.json(result);
        }

        return Response.json({ error: 'Unknown action' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});