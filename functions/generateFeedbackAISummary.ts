import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate AI summary and tags for feedback ticket
 * Enhances ticket with AI-generated analysis
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { feedbackId, title, description, type } = await req.json();

    if (!feedbackId || !title || !description) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Call LLM to generate summary and extract tags
    const prompt = `
Analyze this ${type === 'bug_report' ? 'bug report' : 'feature request'} and provide:
1. A concise 1-2 sentence summary
2. 3-5 relevant tags

Title: ${title}
Description: ${description}

Respond in JSON format:
{
  "summary": "...",
  "tags": ["tag1", "tag2", "tag3"]
}
    `.trim();

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        },
        required: ['summary', 'tags']
      }
    });

    // Update feedback with AI results
    await base44.asServiceRole.entities.Feedback.update(feedbackId, {
      ai_summary: response.summary,
      ai_tags: response.tags
    });

    return Response.json({
      success: true,
      summary: response.summary,
      tags: response.tags
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});