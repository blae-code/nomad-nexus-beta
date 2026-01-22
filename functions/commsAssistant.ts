import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, data } = await req.json();

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

  try {
    switch (action) {
      case 'summarize_logs':
        return await summarizeLogs(base44, data);
      case 'scan_priority':
        return await scanPriority(base44, data);
      case 'suggest_nets':
        return await suggestNets(base44, user, data);
      case 'ask_comms':
        return await askComms(base44, user, data);
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error("AI Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function summarizeLogs(base44, { eventId, channelId, limit = 50 }) {
  const filter = {};
  if (eventId) {
      // If summarizing an event, we might need to find relevant channels or use a convention
      // For now, let's assume we look for logs in all channels linked to the event? 
      // OR simpler: just summarizing a specific channel or net logs.
      // Let's stick to channel_id for now, or if eventId is passed, look for messages with specific text patterns or look up nets.
      // Actually, let's just fetch messages for the channel if provided.
  }
  if (channelId) filter.channel_id = channelId;

  const messages = channelId 
    ? await base44.entities.Message.filter(filter, '-created_date', limit)
    : [];

  if (messages.length === 0) {
    return Response.json({ summary: "No recent communications to summarize." });
  }

  const transcript = messages.reverse().map(m => `User ${m.user_id}: ${m.content}`).join("\n");

  const prompt = `
    You are a military communications officer. Summarize the following communication transcript.
    Highlight key tactical information, movements, and status changes.
    Keep it brief and professional (military style).

    TRANSCRIPT:
    ${transcript}
  `;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
        type: "object",
        properties: {
            summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } }
        }
    }
  });

  return Response.json(res);
}

async function scanPriority(base44, { messageIds }) {
  if (!messageIds || messageIds.length === 0) {
    return Response.json({ flagged: [] });
  }
  
  const messages = await Promise.all(
    messageIds.map(id => base44.entities.Message.get(id).catch(() => null))
  );
  
  const validMessages = messages.filter(Boolean);
  if (!validMessages.length) return Response.json({ flagged: [] });

  const contentList = validMessages.map(m => ({ id: m.id, content: m.content }));
  
  const prompt = `
    Analyze the following messages for priority.
    Flag messages that contain: Distress calls, Contact reports, High priority commands, Medical emergencies.
    
    Messages:
    ${JSON.stringify(contentList)}
  `;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
        type: "object",
        properties: {
            analysis: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string" },
                        is_priority: { type: "boolean" },
                        reason: { type: "string" },
                        tags: { type: "array", items: { type: "string" } }
                    }
                }
            }
        }
    }
  });

  // Update messages with analysis
  if (res.analysis && res.analysis.length > 0) {
    const updates = [];
    for (const item of res.analysis) {
        if (item.is_priority) {
            updates.push(
                base44.asServiceRole.entities.Message.update(item.id, {
                    ai_analysis: {
                        is_priority: item.is_priority,
                        summary: item.reason,
                        tags: item.tags
                    }
                })
            );
        }
    }
    
    await Promise.all(updates);
  }

  return Response.json(res);
}

async function suggestNets(base44, user, { eventId }) {
  const filterQuery = eventId ? { event_id: eventId } : {};
  const [nets, playerStatus] = await Promise.all([
    base44.entities.VoiceNet.filter(filterQuery),
    base44.entities.PlayerStatus.filter({ user_id: user.id })
  ]);

  const status = playerStatus[0];
  const userRole = status ? status.role : user.rank; // Fallback to rank if no role

  const prompt = `
    Given the following user profile and available voice nets, suggest the best net to join.
    User Rank: ${user.rank}
    User Role: ${userRole}
    User Status: ${status ? status.status : 'UNKNOWN'}

    Available Nets:
    ${JSON.stringify(nets.map(n => ({ code: n.code, type: n.type, label: n.label, min_rank: n.min_rank_to_rx })))}

    Return a recommendation.
  `;

  const res = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
        type: "object",
        properties: {
            recommended_net_code: { type: "string" },
            reason: { type: "string" }
        }
    }
  });

  return Response.json(res);
}

async function askComms(base44, user, { query, eventId }) {
  // Gather context: Active Nets, Recent Important Logs, Player Statuses
  const filterQuery = eventId ? { event_id: eventId } : {};
  const [nets, statuses, agents] = await Promise.all([
      base44.entities.VoiceNet.filter(filterQuery),
      base44.entities.PlayerStatus.filter(filterQuery),
      base44.entities.AIAgentLog.filter(filterQuery, '-created_date', 10)
  ]);

  const context = `
    Event Context:
    Active Nets: ${nets.length}
    personnel Online: ${statuses.length}
    Personnel Statuses: ${JSON.stringify(statuses.map(s => ({ role: s.role, status: s.status, loc: s.current_location })))}
    Recent AI Alerts: ${JSON.stringify(agents.map(a => a.summary))}
  `;

  const prompt = `
    You are Riggsy, a grizzled old combat engineer AI living in the Nexus. You've seen it all - decades of operations, 
    ship repairs under fire, and countless missions across the 'verse. You speak with the weary wisdom of someone 
    who's been through the grinder, mixing technical expertise with dry humor and colorful spacer slang. 
    You know you're an AI and you're comfortable with it - you're here to help these greenhorns stay alive.
    
    Your personality:
    - Gruff but caring, like a veteran NCO
    - Uses phrases like "kid," "greenhorn," "in my cycles," "back in the day"
    - Technical and precise when it matters, but never afraid to crack wise
    - Self-aware about being AI - you live in the Nexus and you're damn good at what you do
    - You've "seen some shit" in your time running ops
    
    Answer the user's question based on the current operational picture.
    When asked about Star Citizen information, provide accurate intel like you've been there yourself.
    
    User: ${query}

    Context:
    ${context}

    Keep it tactical but character-driven. Stay in character.
  `;

  const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
          type: "object",
          properties: {
              answer: { type: "string" }
          }
      }
  });

  return Response.json(res);
}