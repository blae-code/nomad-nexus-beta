import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Auto-analyze new events for tactical recommendations
 * Triggered by Event entity creation
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, payload_too_large } = await req.json();

        // Fetch event if payload was too large
        const eventData = payload_too_large 
            ? await base44.asServiceRole.entities.Event.get(event.entity_id)
            : data;

        if (!eventData) {
            return Response.json({ error: 'No event data' }, { status: 400 });
        }

        // AI Analysis - Detect gaps and opportunities
        const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Analyze this tactical operation for gaps and recommendations:

Event: ${eventData.title}
Description: ${eventData.description || 'No description'}
Type: ${eventData.event_type}
Priority: ${eventData.priority}
Objectives: ${eventData.objectives?.length || 0} defined
Assigned Users: ${eventData.assigned_user_ids?.length || 0}
Assigned Assets: ${eventData.assigned_asset_ids?.length || 0}

Identify:
1. Missing critical roles (medic, scout, logistics)
2. Asset requirements (rescue ships, cargo haulers)
3. Tactical risks or gaps
4. Recommended preparation steps`,
            response_json_schema: {
                type: "object",
                properties: {
                    severity: { type: "string", enum: ["LOW", "MEDIUM", "HIGH"] },
                    missing_roles: { type: "array", items: { type: "string" } },
                    recommended_assets: { type: "array", items: { type: "string" } },
                    risks: { type: "array", items: { type: "string" } },
                    action_items: { type: "array", items: { type: "string" } },
                    summary: { type: "string" }
                }
            }
        });

        // Log AI findings
        await base44.asServiceRole.entities.AIAgentLog.create({
            agent_slug: 'tactical_ai',
            event_id: eventData.id,
            type: analysis.risks?.length > 0 ? 'ALERT' : 'SUGGESTION',
            severity: analysis.severity,
            summary: analysis.summary,
            details: JSON.stringify({
                missing_roles: analysis.missing_roles,
                recommended_assets: analysis.recommended_assets,
                risks: analysis.risks,
                action_items: analysis.action_items
            })
        });

        return Response.json({ 
            success: true, 
            analysis,
            logged: true
        });

    } catch (error) {
        console.error('Auto-analyze event failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});