/**
 * Real-time message translation
 * Translates messages to user's preferred language
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, target_language } = await req.json();

    if (!content || !target_language) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use AI to translate message
    const translation = await base44.integrations.Core.InvokeLLM({
      prompt: `Translate the following text to ${target_language}. Maintain the tone and intent. Only return the translation, no explanation.

Text: "${content}"`,
      response_json_schema: {
        type: 'object',
        properties: {
          translated_text: { type: 'string' },
          source_language: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    });

    return Response.json({
      success: true,
      original: content,
      translated: translation.translated_text,
      source_language: translation.source_language,
      target_language,
      confidence: translation.confidence
    });

  } catch (error) {
    console.error('Translation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});