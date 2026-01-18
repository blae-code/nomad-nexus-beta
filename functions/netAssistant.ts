import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { action, eventId, netIds } = await req.json();

        if (!action) {
            return Response.json({ error: 'Missing action' }, { status: 400 });
        }

        // Fetch event and nets context
        const event = eventId ? await base44.entities.Event.get(eventId) : null;
        const nets = netIds?.length ? await Promise.all(netIds.map(id => base44.entities.VoiceNet.get(id))) : [];
        const allNets = eventId ? await base44.entities.VoiceNet.filter({ event_id: eventId }) : [];
        const statuses = eventId ? await base44.entities.PlayerStatus.filter({ event_id: eventId }) : [];
        const squads = await base44.entities.Squad.list();

        // Suggest net configurations
        if (action === 'suggest_config') {
            const prompt = `You are a tactical communications expert for military-style operations.

EVENT DETAILS:
- Title: ${event?.title || 'Unknown'}
- Type: ${event?.event_type || 'casual'}
- Priority: ${event?.priority || 'STANDARD'}
- Objectives: ${event?.objectives?.length || 0} primary objectives
- Tags: ${event?.tags?.join(', ') || 'None'}

SQUADS AVAILABLE:
${squads.map(s => `- ${s.name}: ${s.description || 'N/A'}`).join('\n')}

TASK: Suggest an optimal voice net configuration for this event. Consider:
1. Event type (focused = stricter, casual = open)
2. Squad specializations
3. Command/tactical hierarchy
4. Support roles

Provide 3-5 net configurations in this JSON format:
{
  "nets": [
    {
      "code": "COMMAND",
      "label": "Command Net",
      "type": "command|squad|support|general",
      "priority": 1-3,
      "min_rank_to_tx": "rank or null",
      "min_rank_to_rx": "rank or null",
      "linked_squad_id": "squad_id or null",
      "reasoning": "why this net is needed"
    }
  ]
}`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        nets: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    code: { type: "string" },
                                    label: { type: "string" },
                                    type: { type: "string" },
                                    priority: { type: "integer" },
                                    min_rank_to_tx: { type: "string" },
                                    min_rank_to_rx: { type: "string" },
                                    linked_squad_id: { type: "string" },
                                    reasoning: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            return Response.json(result);
        }

        // Detect conflicts
        if (action === 'detect_conflicts') {
            const prompt = `You are analyzing a tactical communications network for potential issues.

CURRENT NETS:
${allNets.map(n => `- ${n.code} (${n.label}): Priority ${n.priority}, Type: ${n.type}, TX: ${n.min_rank_to_tx || 'Open'}, Squad: ${n.linked_squad_id || 'None'}`).join('\n')}

PERSONNEL STATUS:
- Total: ${statuses.length}
- Ready: ${statuses.filter(s => s.status === 'READY').length}
- Engaged: ${statuses.filter(s => s.status === 'ENGAGED').length}
- Down/Distress: ${statuses.filter(s => ['DOWN', 'DISTRESS'].includes(s.status)).length}

TASK: Identify potential communication conflicts or issues:
1. Overlapping coverage (multiple nets for same purpose)
2. Priority conflicts (too many P1 nets)
3. Access issues (overly restrictive permissions)
4. Missing coverage (no net for specific roles)
5. Squad assignment gaps

Return JSON:
{
  "conflicts": [
    {
      "severity": "high|medium|low",
      "type": "overlap|access|missing|priority",
      "description": "brief issue description",
      "recommendation": "suggested fix"
    }
  ]
}`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        conflicts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    severity: { type: "string" },
                                    type: { type: "string" },
                                    description: { type: "string" },
                                    recommendation: { type: "string" }
                                }
                            }
                        }
                    }
                }
            });

            return Response.json(result);
        }

        // Generate status report
        if (action === 'status_report') {
            // Group participants by net
            const netParticipation = {};
            allNets.forEach(net => {
                netParticipation[net.code] = {
                    net,
                    participants: statuses.filter(s => s.assigned_squad_id === net.linked_squad_id || !net.linked_squad_id)
                };
            });

            const prompt = `Generate a concise tactical communications status report.

NETS & PARTICIPANTS:
${Object.entries(netParticipation).map(([code, data]) => 
  `${code}: ${data.participants.length} personnel, ${data.participants.filter(p => ['DOWN', 'DISTRESS'].includes(p.status)).length} critical`
).join('\n')}

CRITICAL ALERTS:
${statuses.filter(s => s.status === 'DISTRESS').map(s => `- Distress signal from unit ${s.user_id.slice(0,8)}`).join('\n') || 'None'}

Provide a brief executive summary (2-3 sentences) plus key metrics in JSON:
{
  "summary": "executive summary text",
  "metrics": {
    "total_nets": number,
    "active_participants": number,
    "critical_alerts": number,
    "net_health": "optimal|degraded|critical"
  },
  "recommendations": ["action 1", "action 2"]
}`;

            const result = await base44.integrations.Core.InvokeLLM({
                prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        summary: { type: "string" },
                        metrics: {
                            type: "object",
                            properties: {
                                total_nets: { type: "integer" },
                                active_participants: { type: "integer" },
                                critical_alerts: { type: "integer" },
                                net_health: { type: "string" }
                            }
                        },
                        recommendations: {
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