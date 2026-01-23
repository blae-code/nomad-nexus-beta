import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId, reportType = 'summary' } = await req.json();

    if (!eventId) {
      return Response.json({ error: 'Missing eventId' }, { status: 400 });
    }

    // Fetch event data
    const event = await base44.asServiceRole.entities.Event.get(eventId);
    const logs = await base44.asServiceRole.entities.EventLog.filter({ event_id: eventId });
    const assignments = await base44.asServiceRole.entities.EventDutyAssignment.filter({ event_id: eventId });
    const users = await base44.asServiceRole.entities.User.list();

    const getUserName = (userId) => {
      const u = users.find(user => user.id === userId);
      return u?.callsign || u?.email || 'Unknown';
    };

    let content = '';

    if (reportType === 'summary') {
      content = `# Event Summary Report
## ${event.title}

**Event ID**: ${event.id}
**Type**: ${event.event_type.toUpperCase()}
**Priority**: ${event.priority}
**Status**: ${event.status}
**Phase**: ${event.phase || 'N/A'}

### Timeline
- **Start**: ${new Date(event.start_time).toLocaleString()}
- **End**: ${event.end_time ? new Date(event.end_time).toLocaleString() : 'TBD'}
- **Duration**: ${event.end_time ? Math.round((new Date(event.end_time) - new Date(event.start_time)) / (1000 * 60)) + ' minutes' : 'In progress'}

### Metrics
- **Total Logs**: ${logs.length}
- **Personnel Assigned**: ${assignments.length}
- **Objectives**: ${(event.objectives || []).filter(o => o.is_completed).length}/${(event.objectives || []).length} completed

### Key Events
${logs.slice(0, 10).map(log => `- **[${new Date(log.timestamp).toLocaleTimeString()}]** ${log.summary}`).join('\n')}

---
*Report generated on ${new Date().toLocaleString()}*`;

    } else if (reportType === 'detailed') {
      content = `# Detailed Event Analysis
## ${event.title}

### Event Information
- **Event ID**: ${event.id}
- **Type**: ${event.event_type}
- **Priority**: ${event.priority}
- **Status**: ${event.status}
- **Location**: ${event.location || 'N/A'}
- **Created By**: ${getUserName(event.created_by)}

### Description
${event.description || 'No description provided.'}

### Personnel Assignments (${assignments.length})
${assignments.map(a => `- **${a.role_name}**: ${getUserName(a.user_id)} (assigned ${new Date(a.assigned_at).toLocaleDateString()})`).join('\n')}

### Objectives
${(event.objectives || []).map((obj, i) => `
${i + 1}. **${obj.text}** ${obj.is_completed ? '✓ COMPLETE' : '○ PENDING'}
${obj.sub_tasks?.length > 0 ? obj.sub_tasks.map(st => `   - ${st.text} ${st.is_completed ? '✓' : '○'}`).join('\n') : ''}
`).join('\n')}

### Complete Event Log (${logs.length} entries)
${logs.map(log => `
#### [${new Date(log.timestamp).toLocaleString()}] ${log.type} - ${log.severity}
**${log.summary}**
${log.details ? '```json\n' + JSON.stringify(log.details, null, 2) + '\n```' : ''}
`).join('\n')}

---
*Detailed report generated on ${new Date().toLocaleString()}*`;

    } else if (reportType === 'aar') {
      const statusLogs = logs.filter(l => l.type === 'STATUS');
      const commsLogs = logs.filter(l => l.type === 'COMMS');
      const criticalLogs = logs.filter(l => l.severity === 'HIGH');

      content = `# After Action Report (AAR)
## ${event.title}

### Executive Summary
**Event**: ${event.title}
**Date**: ${new Date(event.start_time).toLocaleDateString()}
**Type**: ${event.event_type}
**Commander**: ${getUserName(event.command_staff?.commander_id || event.created_by)}
**Outcome**: ${event.status}

### Mission Overview
${event.description || 'No mission description available.'}

### Personnel & Assignments
**Total Assigned**: ${assignments.length}
${assignments.reduce((acc, a) => {
  const role = a.role_name;
  acc[role] = (acc[role] || 0) + 1;
  return acc;
}, {})}

### Objectives Analysis
**Total Objectives**: ${(event.objectives || []).length}
**Completed**: ${(event.objectives || []).filter(o => o.is_completed).length}
**Success Rate**: ${((event.objectives || []).filter(o => o.is_completed).length / (event.objectives || []).length * 100).toFixed(0)}%

${(event.objectives || []).map((obj, i) => `${i + 1}. ${obj.text} - ${obj.is_completed ? '✓ COMPLETED' : '✗ INCOMPLETE'}`).join('\n')}

### Critical Events (${criticalLogs.length})
${criticalLogs.map(log => `- **[${new Date(log.timestamp).toLocaleTimeString()}]** ${log.summary}`).join('\n') || 'No critical events logged.'}

### Communications Summary
**Total Comms Logs**: ${commsLogs.length}
${commsLogs.slice(0, 5).map(log => `- ${log.summary}`).join('\n')}

### Status Changes
${statusLogs.map(log => `- **[${new Date(log.timestamp).toLocaleString()}]** ${log.summary}`).join('\n')}

### Lessons Learned
${event.post_analysis?.lessons_learned || '(To be filled in during debrief)'}

### Recommendations
${event.post_analysis?.recommendations || '(To be filled in during debrief)'}

---
*AAR generated on ${new Date().toLocaleString()} by ${getUserName(user.id)}*`;
    }

    return Response.json({
      success: true,
      reportType,
      content
    });

  } catch (error) {
    console.error('Error generating event report:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});