
import { base44 } from "@/api/base44Client";

// --- Helper: Generic Finding Creator ---
async function createFinding(eventId, agentSlug, type, severity, summary, details) {
  return base44.entities.AIAgentLog.create({
    event_id: eventId,
    agent_slug: agentSlug,
    type,
    severity,
    summary,
    details,
    content: `${summary}\n${details}` // Fallback for legacy views
  });
}

// --- Agent: Comms Watch (Rule-Based) ---
async function runCommsWatch(eventId) {
  const LOOKBACK_MINUTES = 15;
  const lookbackTime = new Date(Date.now() - LOOKBACK_MINUTES * 60000).toISOString();

  // Fetch Data
  const messages = await base44.entities.Message.list({
    filter: {
      created_date: { $gte: lookbackTime }
      // In a real app we might filter by event_id if messages were linked to events directly
    },
    sort: { created_date: -1 },
    limit: 50
  });

  const statuses = await base44.entities.PlayerStatus.list({ event_id: eventId });
  
  const findings = [];

  // Rule 1: Analyze Command Net Traffic (Simulated logs)
  const commandLogs = messages.filter(m => m.content.includes("TX on COMMAND"));
  const engagedCount = statuses.filter(s => s.status === 'ENGAGED' || s.status === 'DOWN').length;

  if (engagedCount > 2 && commandLogs.length === 0) {
    findings.push({
      type: "ALERT",
      severity: "HIGH",
      summary: "Command Net Silence",
      details: `Forces are ENGAGED (${engagedCount} pax) but no COMMAND traffic detected in last ${LOOKBACK_MINUTES}m.`
    });
  }

  // Rule 2: Congestion Check
  const pttEvents = messages.filter(m => m.content.includes("[COMMS LOG]"));
  if (pttEvents.length > 15) {
    findings.push({
      type: "INFO",
      severity: "MEDIUM",
      summary: "High Comms Traffic",
      details: `Detected ${pttEvents.length} transmissions in ${LOOKBACK_MINUTES}m. Potential channel congestion.`
    });
  }

  // Rule 3: Distress Signal Check (Implicit)
  const distressLogs = messages.filter(m => m.content.toLowerCase().includes("distress") || m.content.toLowerCase().includes("mayday"));
  if (distressLogs.length > 0) {
    findings.push({
      type: "ALERT",
      severity: "HIGH",
      summary: "Distress Signals Detected",
      details: `Keyword 'DISTRESS' or 'MAYDAY' found in recent logs (${distressLogs.length} matches).`
    });
  }

  // Save Findings
  if (findings.length === 0) {
    await createFinding(eventId, 'comms-watch', 'INFO', 'LOW', 'Comms Nominal', 'Traffic patterns within normal parameters.');
    return "Comms nominal.";
  }

  for (const f of findings) {
    await createFinding(eventId, 'comms-watch', f.type, f.severity, f.summary, f.details);
  }
  
  return `Generated ${findings.length} findings.`;
}

// --- Helper: Action Executor ---
async function executeAction(actionType, actionParamsStr, eventId) {
  const params = JSON.parse(actionParamsStr || '{}');
  
  if (actionType === 'AUTO_ASSIGN_ROLE') {
    const { role } = params;
    // Find a READY user with OTHER role or specifically unassigned in this event context
    // Simplified: Find someone with status 'READY' and role 'OTHER'
    const candidates = await base44.entities.PlayerStatus.list({ 
      filter: { // Adding filter key as per SDK usage
        event_id: eventId,
        status: 'READY',
        role: 'OTHER'
      }
    });
    
    if (candidates.length > 0) {
      const target = candidates[0];
      await base44.entities.PlayerStatus.update(target.id, { role: role });
      
      // Log the action
      await createFinding(eventId, 'ops-monitor', 'INFO', 'HIGH', 'Auto-Action Triggered', `Automatically assigned ${role} role to user ${target.user_id.slice(0,4)}.`);
      return true;
    }
    return false;
  }
  
  if (actionType === 'SEND_ALERT') {
    // Simulating alert dispatch
    await createFinding(eventId, 'ops-monitor', 'ALERT', 'HIGH', 'Broadcast Alert', `SYSTEM BROADCAST: ${params.message || 'Critical Status Alert'}`);
    return true;
  }
  
  return false;
}

// --- Agent: Ops Monitor (Rule-Based + Dynamic) ---
async function runOpsMonitor(eventId) {
  // Fetch Data
  const statuses = await base44.entities.PlayerStatus.list({ event_id: eventId });
  const event = await base44.entities.Event.get(eventId);

  const findings = [];
  
  // metrics calculation
  const totalPax = statuses.length;
  const medics = statuses.filter(s => s.role === 'MEDIC').length;
  const logistics = statuses.filter(s => s.role === 'LOGISTICS').length;
  const readyCount = statuses.filter(s => s.status === 'READY').length;
  const readyPercent = totalPax > 0 ? (readyCount / totalPax) * 100 : 0;
  const downCount = statuses.filter(s => s.status === 'DOWN' || s.status === 'DISTRESS').length;

  // hardcoded rules
  if (totalPax > 0) {
      if (medics === 0) {
        findings.push({ type: "ALERT", severity: "HIGH", summary: "No Medical Support", details: "Zero participants assigned to MEDIC role. Critical risk." });
      } else if (medics < Math.ceil(totalPax / 10)) {
        findings.push({ type: "SUGGESTION", severity: "MEDIUM", summary: "Low Medic Ratio", details: `Only ${medics} medic(s) for ${totalPax} personnel. Recommended: 1 per 10.` });
      }

      if (logistics === 0 && (event.tags?.includes("Industry") || event.event_type === "focused")) {
        findings.push({ type: "SUGGESTION", severity: "MEDIUM", summary: "Missing Logistics", details: "Operation type suggests logistics need, but 0 LOGISTICS roles assigned." });
      }

      if (readyPercent < 50 && event.status === 'active') {
         findings.push({ type: "ALERT", severity: "MEDIUM", summary: "Low Force Readiness", details: `Only ${Math.round(readyPercent)}% of fleet is marked READY during active op.` });
      }

      if (downCount > 0) {
        const severity = downCount > 2 ? 'HIGH' : 'MEDIUM';
        findings.push({ type: "ALERT", severity, summary: "Casualties Sustained", details: `${downCount} operator(s) currently DOWN or in DISTRESS.` });
      }
  } else {
      await createFinding(eventId, 'ops-monitor', 'INFO', 'LOW', 'No Participants', 'Waiting for forces to assemble.');
  }

  // --- Dynamic Rule Evaluation ---
  const rules = await base44.entities.AIAgentRule.list({ filter: { agent_slug: 'ops-monitor', is_active: true } });
  
  const metrics = {
    medic_count: medics,
    logistics_count: logistics,
    ready_percent: readyPercent,
    down_count: downCount,
    total_pax: totalPax
  };

  for (const rule of rules) {
    const currentVal = metrics[rule.condition_metric];
    if (currentVal === undefined) continue;

    let match = false;
    if (rule.condition_operator === 'lt') match = currentVal < rule.condition_value;
    if (rule.condition_operator === 'gt') match = currentVal > rule.condition_value;
    if (rule.condition_operator === 'eq') match = currentVal === rule.condition_value;

    if (match) {
      // Execute Action
      await executeAction(rule.action_type, rule.action_params, eventId);
    }
  }

  // Save Findings (Hardcoded only, actions log themselves)
  // This condition for 'Ops Normal' relies on both hardcoded 'findings' array and whether any dynamic rules are configured.
  // If dynamic rules exist but don't fire an action, this condition still considers it 'not nothing'.
  if (findings.length === 0 && rules.length === 0) { // Only if absolutely nothing happened (no hardcoded findings AND no dynamic rules configured)
    await createFinding(eventId, 'ops-monitor', 'INFO', 'LOW', 'Ops Normal', 'Fleet composition and status balanced.');
    return "Ops normal.";
  }

  for (const f of findings) {
    await createFinding(eventId, 'ops-monitor', f.type, f.severity, f.summary, f.details);
  }

  return `Generated ${findings.length} findings and checked ${rules.length} rules.`;
}

// --- Main Orchestrator ---
export async function refreshAgent(agentSlug, eventId) {
  // Clear old logs (optional cleanup)
  // await base44.entities.AIAgentLog.deleteMany({ event_id: eventId, agent_slug: agentSlug }); // Not available in SDK yet usually, just append new ones.
  
  if (agentSlug === 'comms-watch') {
    return runCommsWatch(eventId);
  }
  if (agentSlug === 'ops-monitor' || agentSlug === 'ops-analyst') { // Handle both slug versions
    return runOpsMonitor(eventId);
  }
  throw new Error(`Unknown agent: ${agentSlug}`);
}
