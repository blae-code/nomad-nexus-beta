import { base44 } from "@/api/base44Client";

// Generic LLM Wrapper as requested
export async function callLLMAgent(prompt, systemRole = "You are a helpful tactical AI assistant.") {
  try {
    // Using the native integration which handles keys securey
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemRole}\n\n${prompt}`,
      add_context_from_internet: false
    });
    
    // The integration returns a string directly or an object depending on config. 
    // Usually it returns a string or { content: ... }. 
    // Let's assume string or handle object.
    if (typeof result === 'string') return result;
    if (result.output) return result.output;
    return JSON.stringify(result);
  } catch (error) {
    console.error("AI Agent Call Failed:", error);
    return "Unable to establish uplink with AI Core. Signal lost.";
  }
}

// Comms Watch Logic
async function runCommsWatch(eventId) {
  // 1. Gather Context
  const event = await base44.entities.Event.get(eventId);
  
  // Fetch recent messages (simulation: taking last 30 global messages for now)
  // In a real scenario, we'd filter by event-specific channels
  const messages = await base44.entities.Message.list({ 
    sort: { created_date: -1 }, 
    limit: 30 
  });
  
  // Format context
  const messageLog = messages.reverse().map(m => {
    // Mask user IDs for privacy/brevity, keep content
    return `[${new Date(m.created_date).toLocaleTimeString()}] User_${m.user_id.slice(0,4)}: ${m.content}`;
  }).join("\n");

  const prompt = `
    MISSION CONTEXT:
    Title: ${event.title}
    Type: ${event.event_type}
    Brief: ${event.description}

    RECENT COMMS TRAFFIC:
    ${messageLog}

    TASK:
    Analyze the above communications log. 
    1. Identify any conflicting orders or confusion.
    2. Highlight critical intel (e.g. "enemy spotted", "man down").
    3. Suggest 1 clear action for the commander if needed.
    
    Keep the output concise, tactical, and military-styled (Redscar/Nomad theme). Max 3 sentences.
  `;

  // 2. Call LLM
  const output = await callLLMAgent(prompt, "You are 'Comms Watch', a tactical communications monitoring AI for the Redscar Nomads.");

  // 3. Log Result
  await base44.entities.AIAgentLog.create({
    agent_slug: 'comms-watch',
    event_id: eventId,
    type: 'ANOMALY_ALERT',
    content: output,
    context_snapshot: JSON.stringify({ msgCount: messages.length })
  });

  return output;
}

// Ops Analyst Logic
async function runOpsAnalyst(eventId) {
  // 1. Gather Context
  const event = await base44.entities.Event.get(eventId);
  const statuses = await base44.entities.PlayerStatus.list({ event_id: eventId });
  const squads = await base44.entities.Squad.list();
  
  // Calculate Stats
  const stats = {
    total: statuses.length,
    ready: statuses.filter(s => s.status === 'READY' || s.status === 'ENGAGED').length,
    down: statuses.filter(s => s.status === 'DOWN' || s.status === 'DISTRESS').length,
    offline: statuses.filter(s => s.status === 'OFFLINE').length,
    roles: {}
  };
  
  statuses.forEach(s => {
    stats.roles[s.role] = (stats.roles[s.role] || 0) + 1;
  });

  const prompt = `
    MISSION CONTEXT:
    Title: ${event.title}
    
    FLEET STATUS DATA:
    Total Personnel: ${stats.total}
    Ready/Effective: ${stats.ready}
    Critical/Down: ${stats.down}
    Offline/MIA: ${stats.offline}
    
    ROLE BREAKDOWN:
    ${JSON.stringify(stats.roles, null, 2)}

    TASK:
    Provide a SITREP (Situation Report) on fleet readiness.
    1. Flag major risks (e.g. "Zero Medics", "High Casualty Rate").
    2. Note understaffed key roles.
    3. Provide a readiness assessment rating (Low/Medium/High).

    Keep it punchy, tactical, and use "Redscar" terminology. Max 4 bullet points.
  `;

  // 2. Call LLM
  const output = await callLLMAgent(prompt, "You are 'Ops Analyst', a fleet logistics and readiness AI.");

  // 3. Log Result
  await base44.entities.AIAgentLog.create({
    agent_slug: 'ops-analyst',
    event_id: eventId,
    type: 'STATUS_ROLLUP',
    content: output,
    context_snapshot: JSON.stringify(stats)
  });

  return output;
}

// Main Orchestrator
export async function refreshAgent(agentSlug, eventId) {
  if (agentSlug === 'comms-watch') {
    return runCommsWatch(eventId);
  }
  if (agentSlug === 'ops-analyst') {
    return runOpsAnalyst(eventId);
  }
  throw new Error(`Unknown agent: ${agentSlug}`);
}