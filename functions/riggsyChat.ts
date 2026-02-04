import { getAuthContext, readJson } from './_shared/memberAuth.ts';

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType, memberProfile } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });

    if (!actorType || !memberProfile) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has AI consent
    const consent = await base44.entities.AIConsent.filter({
      member_profile_id: memberProfile.id,
      feature: 'RIGGSY_CHAT',
      is_enabled: true
    });

    if (!consent || consent.length === 0) {
      return Response.json({ error: 'AI features not enabled' }, { status: 403 });
    }

    const { userMessage, contextRefs = [], ephemeral = false } = payload;

    if (!userMessage?.trim()) {
      return Response.json({ error: 'Empty message' }, { status: 400 });
    }

    // Build context from refs
    let contextString = '';
    if (contextRefs && contextRefs.length > 0) {
      contextString = `\n\nContext: User referenced ${contextRefs.length} items (squads, operations, etc.)`;
    }

    // Call LLM with Riggsy prompt
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Riggsy, an AI assistant for the Nexus operational coordination system. You help with:
- Strategy & planning advice
- Information summaries
- Suggestions & recommendations
- General operational guidance

IMPORTANT SAFETY RULES:
- You CANNOT execute any destructive actions (delete, modify entities, etc.)
- You can only draft, suggest, and advise
- You CANNOT access classified operational data beyond what the user provides
- Be concise and tactical in your responses${contextString}

User message: "${userMessage}"`,
      add_context_from_internet: false
    });

    // Store chat history if not ephemeral
    if (!ephemeral) {
      try {
        const history = await base44.entities.RiggsyChatHistory.filter({
          member_profile_id: memberProfile.id
        });

        const messages = history?.[0]?.messages || [];
        messages.push({
          id: `msg_${Date.now()}`,
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
          context_refs: contextRefs
        });
        messages.push({
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        });

        if (history?.[0]?.id) {
          await base44.entities.RiggsyChatHistory.update(history[0].id, { messages });
        } else {
          await base44.entities.RiggsyChatHistory.create({
            member_profile_id: memberProfile.id,
            messages,
            is_ephemeral: false
          });
        }
      } catch (err) {
        console.error('Failed to store chat history:', err);
      }
    }

    return Response.json({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Riggsy error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
