import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { action, context } = await req.json();

        if (!action || !context) {
            return Response.json({ error: 'Missing action or context' }, { status: 400 });
        }

        let prompt = "";
        let jsonSchema = null;

        switch (action) {
            case 'suggest_metadata':
                prompt = `
                    Based on the following event description, suggest the most appropriate event type and tags.
                    Description: "${context.description}"
                    
                    Available Types: "casual", "focused"
                    Available Tags: "Rescue", "Industry", "Racing", "PVP", "PVE", "Training", "Logistics", "Exploration"
                    
                    Return a JSON object with "event_type" and "tags" (array of strings).
                `;
                jsonSchema = {
                    type: "object",
                    properties: {
                        event_type: { type: "string", enum: ["casual", "focused"] },
                        tags: { type: "array", items: { type: "string" } }
                    },
                    required: ["event_type", "tags"]
                };
                break;

            case 'suggest_schedule':
                prompt = `
                    Suggest an optimal start time and duration for an event based on the following context.
                    Context: "${context.description}"
                    Current Date: ${new Date().toISOString()}
                    
                    Consider typical gaming peak hours (evenings/weekends UTC) if not specified.
                    
                    Return a JSON object with "start_time" (ISO string) and "duration_minutes" (integer).
                `;
                jsonSchema = {
                    type: "object",
                    properties: {
                        start_time: { type: "string" },
                        duration_minutes: { type: "integer" }
                    },
                    required: ["start_time", "duration_minutes"]
                };
                break;

            case 'draft_content':
                prompt = `
                    Draft a compelling event description and a short outreach message (for Discord/Comms) based on these rough notes.
                    Notes: "${context.notes}"
                    Tone: Professional, tactical, yet inviting.
                    Role: ${context.role || 'General'}
                    
                    Return a JSON object with "description" and "outreach_message".
                `;
                jsonSchema = {
                    type: "object",
                    properties: {
                        description: { type: "string" },
                        outreach_message: { type: "string" }
                    },
                    required: ["description", "outreach_message"]
                };
                break;

            default:
                return Response.json({ error: 'Invalid action' }, { status: 400 });
        }

        const response = await base44.integrations.Core.InvokeLLM({
            prompt,
            response_json_schema: jsonSchema
        });

        return Response.json(response);

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});