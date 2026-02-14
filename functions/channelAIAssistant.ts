import { getAuthContext, isAiFeaturesEnabled, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const body = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, body, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (actorType === 'member' && !isAiFeaturesEnabled(memberProfile)) {
      return Response.json({ error: 'AI features are disabled for this profile.' }, { status: 403 });
    }

    const { action, channelId, messageContent, recentMessages = [], timeWindowHours = 24 } = body;

    // Action 1: Categorize and tag a message
    if (action === 'categorizeMessage') {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this message and categorize it. Return a JSON object with:
- category: one of "discussion", "announcement", "question", "feedback", "off-topic"
- tags: array of relevant tags (max 3)
- confidence: number 0-1

Message: "${messageContent}"

Return ONLY valid JSON, no other text.`,
        response_json_schema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            confidence: { type: 'number' }
          }
        }
      });

      return Response.json({ result: response });
    }

    // Action 2: Suggest relevant channels for a discussion
    if (action === 'suggestChannels') {
      const channels = await base44.entities.Channel.list();
      const channelList = channels.map(c => `${c.name}: ${c.description || 'No description'}`).join('\n');

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Given this discussion topic, suggest the 3 most relevant channels from the list below.
Return a JSON array with objects containing: { channelName: string, relevance: number 0-1, reason: string }

Discussion: "${messageContent}"

Available channels:
${channelList}

Return ONLY valid JSON array, no other text.`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  channelName: { type: 'string' },
                  relevance: { type: 'number' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        }
      });

      return Response.json({ result: response });
    }

    // Action 3: Generate channel activity summary
    if (action === 'summarizeActivity') {
      const cutoffTime = new Date(Date.now() - timeWindowHours * 3600000).toISOString();
      const messages = await base44.entities.Message.filter(
        { channel_id: channelId },
        '-created_date',
        50
      );

      const recentMsgs = messages
        .filter(m => m.created_date > cutoffTime)
        .map(m => `${m.user_id}: ${m.content}`)
        .join('\n');

      if (!recentMsgs) {
        return Response.json({ 
          result: { 
            summary: 'No activity in this time period.',
            keyTopics: [],
            messageCount: 0,
            sentiment: 'neutral'
          }
        });
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize the key discussions and activity in this channel conversation. Return JSON with:
- summary: brief summary (max 150 chars)
- keyTopics: array of main topics discussed
- sentiment: "positive", "neutral", or "negative"
- messageCount: number of messages analyzed

Channel messages:
${recentMsgs}

Return ONLY valid JSON, no other text.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            keyTopics: { type: 'array', items: { type: 'string' } },
            sentiment: { type: 'string' },
            messageCount: { type: 'number' }
          }
        }
      });

      return Response.json({ result: response });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Channel AI error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
