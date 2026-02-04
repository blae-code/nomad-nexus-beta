import { createServiceClient } from './_shared/memberAuth.ts';

/**
 * Scheduled scan - Check all active events for readiness issues
 * Runs every 30 minutes
 */
Deno.serve(async (req) => {
    try {
        const base44 = createServiceClient();

        // Get all active events
        const activeEvents = await base44.asServiceRole.entities.Event.filter({ 
            status: 'active' 
        });

        if (activeEvents.length === 0) {
            return Response.json({ success: true, message: 'No active events' });
        }

        const findings = [];

        for (const event of activeEvents) {
            // Get event participants
            const participants = await base44.asServiceRole.entities.EventParticipant.filter({ 
                eventId: event.id 
            });

            // Get player statuses
            const statuses = await base44.asServiceRole.entities.PlayerStatus.filter({ 
                event_id: event.id 
            });

            // AI Analysis
            const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
                prompt: `Readiness check for active operation:

Event: ${event.title}
Priority: ${event.priority}
Phase: ${event.phase}
Participants: ${participants.length}
Objectives: ${event.objectives?.length || 0}

Player Statuses:
- READY: ${statuses.filter(s => s.status === 'READY').length}
- IN_QUANTUM: ${statuses.filter(s => s.status === 'IN_QUANTUM').length}
- ENGAGED: ${statuses.filter(s => s.status === 'ENGAGED').length}
- DOWN: ${statuses.filter(s => s.status === 'DOWN').length}
- DISTRESS: ${statuses.filter(s => s.status === 'DISTRESS').length}

Assigned Assets: ${event.assigned_asset_ids?.length || 0}

Identify critical gaps or concerns requiring commander attention.`,
                response_json_schema: {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: ["GREEN", "YELLOW", "RED"] },
                        concerns: { type: "array", items: { type: "string" } },
                        recommendations: { type: "array", items: { type: "string" } },
                        requires_attention: { type: "boolean" }
                    }
                }
            });

            if (analysis.requires_attention) {
                // Log finding
                await base44.asServiceRole.entities.AIAgentLog.create({
                    agent_slug: 'tactical_ai',
                    event_id: event.id,
                    type: 'ALERT',
                    severity: analysis.status === 'RED' ? 'HIGH' : 'MEDIUM',
                    summary: `Readiness Alert: ${event.title}`,
                    details: JSON.stringify({
                        status: analysis.status,
                        concerns: analysis.concerns,
                        recommendations: analysis.recommendations,
                        participant_count: participants.length,
                        ready_count: statuses.filter(s => s.status === 'READY').length
                    })
                });

                findings.push({
                    event_id: event.id,
                    event_title: event.title,
                    status: analysis.status,
                    concerns: analysis.concerns
                });

                // Notify event commander if critical
                if (analysis.status === 'RED' && event.command_staff?.commander_id) {
                    await base44.asServiceRole.entities.Notification.create({
                        user_id: event.command_staff.commander_id,
                        type: 'READINESS_ALERT',
                        title: `⚠️ Readiness Alert: ${event.title}`,
                        message: analysis.concerns[0] || 'Critical gaps detected',
                        link: `/ops/events/${event.id}`,
                        priority: 'high'
                    });
                }
            }
        }

        return Response.json({ 
            success: true, 
            scanned: activeEvents.length,
            findings: findings.length,
            details: findings
        });

    } catch (error) {
        console.error('Readiness scan failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});
