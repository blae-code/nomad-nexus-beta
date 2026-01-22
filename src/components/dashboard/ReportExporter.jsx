import React, { useState } from 'react';
import { Download, FileText, BarChart3, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ReportExporter({ userEvents, allUsers, activeIncidents, recentLogs }) {
  const [exportFormat, setExportFormat] = useState('pdf');

  const generateReport = (reportType) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const reportName = `${reportType}-report-${timestamp}`;
    
    let content = '';

    if (reportType === 'operational') {
      content = `
OPERATIONAL METRICS REPORT
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Events: ${userEvents.length}
Completion Rate: ${Math.round((userEvents.filter(e => e.status === 'completed').length / userEvents.length) * 100)}%
Active Operations: ${userEvents.filter(e => e.status === 'active').length}
Pending Operations: ${userEvents.filter(e => e.status === 'pending').length}

EVENT STATUS BREAKDOWN
${['active', 'scheduled', 'pending', 'completed', 'cancelled'].map(status => 
  `- ${status.toUpperCase()}: ${userEvents.filter(e => e.status === status).length}`
).join('\n')}

ORGANIZATION METRICS
Total Members: ${allUsers.length}
Active Operations: ${userEvents.filter(e => e.status === 'active').length}
Success Rate: ${Math.round((userEvents.filter(e => e.status === 'completed').length / Math.max(userEvents.length, 1)) * 100)}%

RECENT ACTIVITY
Total Log Entries: ${recentLogs.length}
High Priority Entries: ${recentLogs.filter(l => l.severity === 'HIGH').length}
      `.trim();
    } else if (reportType === 'incident') {
      content = `
INCIDENT ANALYSIS REPORT
Generated: ${new Date().toLocaleString()}

ACTIVE INCIDENTS
Total: ${activeIncidents.length}

SEVERITY BREAKDOWN
- CRITICAL: ${activeIncidents.filter(i => i.severity === 'CRITICAL').length}
- HIGH: ${activeIncidents.filter(i => i.severity === 'HIGH').length}
- MEDIUM: ${activeIncidents.filter(i => i.severity === 'MEDIUM').length}
- LOW: ${activeIncidents.filter(i => i.severity === 'LOW').length}

TYPE BREAKDOWN
- RESCUE: ${activeIncidents.filter(i => i.incident_type === 'rescue').length}
- COMBAT: ${activeIncidents.filter(i => i.incident_type === 'combat').length}
- MEDICAL: ${activeIncidents.filter(i => i.incident_type === 'medical').length}
- TECHNICAL: ${activeIncidents.filter(i => i.incident_type === 'technical').length}
- ENVIRONMENTAL: ${activeIncidents.filter(i => i.incident_type === 'environmental').length}

INCIDENT DETAILS
${activeIncidents.slice(0, 5).map((inc, idx) => `
${idx + 1}. ${inc.title}
   Severity: ${inc.severity}
   Type: ${inc.incident_type}
   Status: ${inc.status}
   Location: ${inc.affected_area || 'Unknown'}
   Personnel Assigned: ${inc.assigned_user_ids?.length || 0}
`).join('')}
      `.trim();
    }

    // Download as text file (in real implementation, would be PDF)
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName}.txt`;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">Export Reports</span>
        <Badge className="text-[7px] bg-zinc-800 text-zinc-200 border-zinc-700">2 TYPES</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Operational Report */}
        <button
          onClick={() => generateReport('operational')}
          className={cn(
            'border p-3 transition-all hover:border-blue-500/50',
            'bg-blue-950/20 border-blue-900/50 group cursor-pointer'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-[9px] font-bold text-zinc-200">Operational</span>
            </div>
            <Download className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-[7px] text-zinc-400 text-left">
            Events, metrics, activity trends
          </p>
        </button>

        {/* Incident Report */}
        <button
          onClick={() => generateReport('incident')}
          className={cn(
            'border p-3 transition-all hover:border-red-500/50',
            'bg-red-950/20 border-red-900/50 group cursor-pointer'
          )}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-400" />
              <span className="text-[9px] font-bold text-zinc-200">Incident</span>
            </div>
            <Download className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-[7px] text-zinc-400 text-left">
            Active incidents analysis & severity
          </p>
        </button>
      </div>

      <div className="border border-zinc-800/30 bg-zinc-950/30 p-2 rounded">
        <div className="text-[7px] text-zinc-500">
          <p className="font-mono">📄 Reports export as TXT format for compatibility</p>
        </div>
      </div>
    </div>
  );
}