import { getAuthContext, readJson } from './_shared/memberAuth.ts';

const withTimeout = (promise, ms = 2000) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
]);

Deno.serve(async (req) => {
  try {
    const payload = await readJson(req);
    const { base44, actorType } = await getAuthContext(req, payload, {
      allowAdmin: true,
      allowMember: true
    });
    
    if (!actorType) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, timeWindowMinutes = 15, netIds = [] } = payload;

    // Fetch activity from multiple channels
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60000).toISOString();
    
    const [logs, messages, incidents, nets, statuses] = await Promise.all([
      withTimeout(base44.entities.EventLog.filter(
        eventId ? { event_id: eventId } : {},
        '-created_date',
        50
      ), 1500).catch(() => []),
      withTimeout(base44.entities.Message.filter({}, '-created_date', 30), 1500).catch(() => []),
      withTimeout(base44.entities.Incident.filter({ status: ['active', 'responding'] }), 1500).catch(() => []),
      withTimeout(base44.entities.VoiceNet.filter(
        eventId ? { event_id: eventId } : {}
      ), 1500).catch(() => []),
      withTimeout(base44.entities.PlayerStatus.filter(
        eventId ? { event_id: eventId } : {}
      ), 1500).catch(() => [])
    ]);

    // Filter to time window
    const recentLogs = logs.filter(l => new Date(l.created_date) > new Date(cutoffTime));
    const recentMessages = messages.filter(m => new Date(m.created_date) > new Date(cutoffTime));

    // Build comprehensive context
    const context = {
      activeNets: nets.length,
      personnelOnline: statuses.filter(s => s.status === 'online' || s.status === 'in-call').length,
      activeIncidents: incidents.length,
      criticalIncidents: incidents.filter(i => i.severity === 'CRITICAL').length,
      recentActivity: {
        totalLogs: recentLogs.length,
        rescueEvents: recentLogs.filter(l => l.type === 'RESCUE').length,
        commsEvents: recentLogs.filter(l => l.type === 'COMMS').length,
        statusChanges: recentLogs.filter(l => l.type === 'STATUS').length,
        highPriority: recentLogs.filter(l => l.severity === 'HIGH').length
      },
      keyEvents: recentLogs.slice(0, 15).map(l => `[${l.type}] ${l.summary}`),
      channelActivity: recentMessages.slice(0, 10).map(m => m.content.substring(0, 100))
    };

    // Generate AI summary
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a tactical operations AI providing situational awareness to command staff.

Synthesize the following multi-channel intelligence into a concise SITREP (Situation Report):

OPERATIONAL STATUS:
- Active Voice Nets: ${context.activeNets}
- Personnel Online: ${context.personnelOnline}
- Active Incidents: ${context.activeIncidents} (${context.criticalIncidents} critical)

RECENT ACTIVITY (Last ${timeWindowMinutes}min):
- Total Events: ${context.recentActivity.totalLogs}
- Rescue Operations: ${context.recentActivity.rescueEvents}
- Communications Events: ${context.recentActivity.commsEvents}
- Status Changes: ${context.recentActivity.statusChanges}
- High Priority: ${context.recentActivity.highPriority}

KEY EVENTS:
${context.keyEvents.join('\n')}

CHANNEL TRAFFIC SAMPLE:
${context.channelActivity.join('\n')}

Provide:
1. Overall operational status (1-2 sentences)
2. Key developments requiring attention
3. Current threats or concerns
4. Recommended command priorities

Keep it tactical, concise, and actionable. Think like a military operations center.`,
      response_json_schema: {
        type: "object",
        properties: {
          operational_status: { type: "string" },
          posture: { type: "string", enum: ["NOMINAL", "ELEVATED", "HIGH_ALERT", "CRITICAL"] },
          key_developments: {
            type: "array",
            items: { type: "string" }
          },
          threats_concerns: {
            type: "array",
            items: { type: "string" }
          },
          command_priorities: {
            type: "array",
            items: { type: "string" }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      status: 'success',
      sitrep: response,
      generated_at: new Date().toISOString(),
      context: {
        timeWindowMinutes,
        eventsAnalyzed: recentLogs.length,
        channelsMonitored: nets.length
      }
    });

  } catch (error) {
    console.error('Multi-channel summary error:', error);
    return Response.json({ 
      status: 'error',
      error: error.message 
    }, { status: 500 });
  }
});
