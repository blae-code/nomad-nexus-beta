import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Auto-detect priority messages in comms
 * Triggered by Message entity creation
 */
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { event, data, payload_too_large } = await req.json();

        const messageData = payload_too_large 
            ? await base44.asServiceRole.entities.Message.get(event.entity_id)
            : data;

        if (!messageData || !messageData.content) {
            return Response.json({ success: true, skipped: 'no_content' });
        }

        // AI Priority Detection
        const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Analyze this message for priority/urgency:

"${messageData.content}"

Detect if this is:
- Emergency/distress (crew down, ship destroyed, under attack)
- High priority (mission-critical, time-sensitive)
- Standard communication

Also identify sentiment and key topics.`,
            response_json_schema: {
                type: "object",
                properties: {
                    is_priority: { type: "boolean" },
                    priority_level: { type: "string", enum: ["CRITICAL", "HIGH", "NORMAL", "LOW"] },
                    sentiment: { type: "string", enum: ["positive", "neutral", "negative", "urgent"] },
                    tags: { type: "array", items: { type: "string" } },
                    summary: { type: "string" }
                }
            }
        });

        // Update message with AI metadata
        await base44.asServiceRole.entities.Message.update(messageData.id, {
            ai_analysis: {
                is_priority: analysis.is_priority,
                sentiment: analysis.sentiment,
                tags: analysis.tags,
                summary: analysis.summary
            }
        });

        // If critical, create notification
        if (analysis.priority_level === 'CRITICAL') {
            const channel = await base44.asServiceRole.entities.Channel.get(messageData.channel_id);
            
            // Get admins to notify
            const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
            
            for (const admin of admins) {
                await base44.asServiceRole.entities.Notification.create({
                    user_id: admin.id,
                    type: 'CRITICAL_MESSAGE',
                    title: `🚨 Critical Message in #${channel.name}`,
                    message: analysis.summary,
                    link: `/comms?channel=${messageData.channel_id}`,
                    priority: 'high'
                });
            }
        }

        return Response.json({ 
            success: true, 
            analysis,
            notified: analysis.priority_level === 'CRITICAL'
        });

    } catch (error) {
        console.error('Auto-detect priority failed:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});