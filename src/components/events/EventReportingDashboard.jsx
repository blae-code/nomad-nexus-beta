import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, Download, TrendingUp, Users, Target, Clock, 
  AlertTriangle, CheckCircle, BarChart3, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function EventReportingDashboard({ timeRange = '30d' }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const { data: events = [] } = useQuery({
    queryKey: ['events-reporting', timeRange],
    queryFn: async () => {
      const cutoffDate = new Date();
      if (timeRange === '7d') cutoffDate.setDate(cutoffDate.getDate() - 7);
      else if (timeRange === '30d') cutoffDate.setDate(cutoffDate.getDate() - 30);
      else if (timeRange === '90d') cutoffDate.setDate(cutoffDate.getDate() - 90);

      const allEvents = await base44.entities.Event.list('-created_date', 200);
      return allEvents.filter(e => new Date(e.created_date) >= cutoffDate);
    }
  });

  const { data: eventReports = [] } = useQuery({
    queryKey: ['event-reports'],
    queryFn: () => base44.entities.EventReport.list('-created_date', 100)
  });

  const { data: eventLogs = [] } = useQuery({
    queryKey: ['event-logs-reporting'],
    queryFn: () => base44.entities.EventLog.list('-created_date', 500)
  });

  // Apply filters
  const filteredEvents = events.filter(e => {
    if (filterPhase !== 'all' && e.phase !== filterPhase) return false;
    if (filterPriority !== 'all' && e.priority !== filterPriority) return false;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: filteredEvents.length,
    completed: filteredEvents.filter(e => e.phase === 'DEBRIEF' || e.status === 'completed').length,
    active: filteredEvents.filter(e => e.phase === 'ACTIVE' || e.status === 'active').length,
    cancelled: filteredEvents.filter(e => e.status === 'cancelled' || e.status === 'failed').length,
    avgParticipants: filteredEvents.length > 0 
      ? Math.round(filteredEvents.reduce((sum, e) => sum + (e.assigned_user_ids?.length || 0), 0) / filteredEvents.length)
      : 0,
    avgObjectivesCompleted: filteredEvents.length > 0
      ? Math.round(filteredEvents.reduce((sum, e) => {
          const total = e.objectives?.length || 0;
          const completed = e.objectives?.filter(o => o.is_completed).length || 0;
          return sum + (total > 0 ? (completed / total) * 100 : 0);
        }, 0) / filteredEvents.length)
      : 0,
    criticalIncidents: eventLogs.filter(l => l.severity === 'HIGH' && l.type === 'RESCUE').length,
    totalReports: eventReports.length
  };

  const successRate = stats.total > 0 ? Math.round((stats.completed / (stats.completed + stats.cancelled)) * 100) : 0;

  const handleDownloadReport = (report) => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/\s+/g, '_')}_${report.created_date.slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const handleGenerateReport = async () => {
    toast.info('Generating comprehensive report...');
    // This would trigger a backend function to generate a report
    try {
      const { data } = await base44.functions.invoke('generateEventAAR', {
        eventIds: filteredEvents.map(e => e.id),
        timeRange
      });
      toast.success('Report generated');
    } catch (error) {
      toast.error('Failed to generate report');
    }
  };

  return (
    <div className="space-y-3">
      {/* Controls */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#ea580c]" />
              <span>EVENT ANALYTICS</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterPhase} onValueChange={setFilterPhase}>
                <SelectTrigger className="h-6 text-[9px] w-28 bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="BRIEFING">Briefing</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="DEBRIEF">Debrief</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-6 text-[9px] w-28 bg-zinc-900 border-zinc-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleGenerateReport}
                className="h-6 text-[9px] bg-[#ea580c] hover:bg-[#c2410c]"
              >
                <FileText className="w-3 h-3 mr-1" />
                GENERATE
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={Calendar}
              label="Total Events"
              value={stats.total}
              color="zinc"
            />
            <StatCard
              icon={CheckCircle}
              label="Completed"
              value={stats.completed}
              color="emerald"
              subtext={`${successRate}% success`}
            />
            <StatCard
              icon={TrendingUp}
              label="Active"
              value={stats.active}
              color="cyan"
            />
            <StatCard
              icon={AlertTriangle}
              label="Cancelled"
              value={stats.cancelled}
              color="red"
            />
            <StatCard
              icon={Users}
              label="Avg Personnel"
              value={stats.avgParticipants}
              color="cyan"
            />
            <StatCard
              icon={Target}
              label="Avg Objectives"
              value={`${stats.avgObjectivesCompleted}%`}
              color="emerald"
            />
            <StatCard
              icon={AlertTriangle}
              label="Critical Incidents"
              value={stats.criticalIncidents}
              color="amber"
            />
            <StatCard
              icon={FileText}
              label="Reports"
              value={stats.totalReports}
              color="zinc"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <span>GENERATED REPORTS</span>
            <Badge className="bg-zinc-800 text-zinc-400 text-[8px] h-4">
              {eventReports.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {eventReports.length === 0 && (
                <div className="text-center text-zinc-600 text-[9px] py-6">
                  No reports generated yet
                </div>
              )}
              {eventReports.map(report => (
                <div
                  key={report.id}
                  className="border border-zinc-800 bg-zinc-950/50 p-2 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-zinc-200 truncate">
                        {report.title}
                      </div>
                      <div className="text-[8px] text-zinc-500 font-mono">
                        {new Date(report.created_date).toLocaleDateString()} • {report.report_type}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadReport(report);
                      }}
                      className="h-5 w-5 p-0 text-zinc-600 hover:text-[#ea580c]"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                  {report.key_findings && report.key_findings.length > 0 && (
                    <div className="text-[8px] text-zinc-600 mt-1">
                      • {report.key_findings[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Report Detail */}
      {selectedReport && (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center justify-between">
              <span>{selectedReport.title}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedReport(null)}
                className="h-6 text-[9px]"
              >
                CLOSE
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="text-[9px] text-zinc-400 whitespace-pre-wrap font-mono">
                {selectedReport.content}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, subtext }) {
  const colorClasses = {
    emerald: 'text-emerald-500',
    cyan: 'text-cyan-500',
    amber: 'text-amber-500',
    red: 'text-red-500',
    zinc: 'text-zinc-500'
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-2">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-3 h-3", colorClasses[color])} />
        <span className="text-[8px] text-zinc-600 uppercase font-mono">{label}</span>
      </div>
      <div className={cn("text-xl font-black font-mono", colorClasses[color])}>
        {value}
      </div>
      {subtext && (
        <div className="text-[7px] text-zinc-600 font-mono mt-0.5">{subtext}</div>
      )}
    </div>
  );
}