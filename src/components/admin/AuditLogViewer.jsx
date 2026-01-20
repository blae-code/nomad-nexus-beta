import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Shield, AlertTriangle, Info, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AuditLogViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [limit, setLimit] = useState(50);

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: () => base44.entities.AuditLog.list('-created_date', limit),
    refetchInterval: 10000
  });

  const filteredLogs = auditLogs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        log.actor_name,
        log.target_name,
        log.action_type,
        JSON.stringify(log.details)
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) return false;
    }

    if (actionTypeFilter !== 'all' && log.action_type !== actionTypeFilter) {
      return false;
    }

    if (severityFilter !== 'all' && log.severity !== severityFilter) {
      return false;
    }

    if (targetTypeFilter !== 'all' && log.target_type !== targetTypeFilter) {
      return false;
    }

    if (dateRange !== 'all') {
      const logDate = new Date(log.created_date);
      const now = new Date();
      const hoursDiff = (now - logDate) / (1000 * 60 * 60);
      
      if (dateRange === '1h' && hoursDiff > 1) return false;
      if (dateRange === '24h' && hoursDiff > 24) return false;
      if (dateRange === '7d' && hoursDiff > 168) return false;
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Actor', 'Action', 'Target', 'Severity', 'Success', 'Details'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_date), 'yyyy-MM-dd HH:mm:ss'),
      log.actor_name || 'Unknown',
      log.action_type,
      log.target_name || '',
      log.severity,
      log.success ? 'Yes' : 'No',
      JSON.stringify(log.details || {})
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    toast.success('Audit log exported to CSV');
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      critical: <AlertTriangle className="w-4 h-4 text-red-500" />,
      high: <AlertTriangle className="w-4 h-4 text-orange-500" />,
      medium: <Info className="w-4 h-4 text-yellow-500" />,
      low: <Info className="w-4 h-4 text-blue-500" />
    };
    return icons[severity] || icons.low;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-950 border-red-900 text-red-400',
      high: 'bg-orange-950 border-orange-900 text-orange-400',
      medium: 'bg-yellow-950 border-yellow-900 text-yellow-400',
      low: 'bg-blue-950 border-blue-900 text-blue-400'
    };
    return colors[severity] || colors.low;
  };

  const getActionTypeColor = (actionType) => {
    if (actionType.includes('delete') || actionType.includes('ban')) {
      return 'bg-red-950 border-red-900 text-red-400';
    }
    if (actionType.includes('create') || actionType.includes('login')) {
      return 'bg-emerald-950 border-emerald-900 text-emerald-400';
    }
    if (actionType.includes('update') || actionType.includes('change')) {
      return 'bg-amber-950 border-amber-900 text-amber-400';
    }
    return 'bg-zinc-800 border-zinc-700 text-zinc-400';
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#ea580c]" />
            Audit Log
          </CardTitle>
          <CardDescription className="text-xs font-mono text-zinc-600">
            Comprehensive tracking of all administrative actions and system events
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
              <Input
                placeholder="Search by user, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-zinc-900 border-zinc-800 pl-9 text-sm"
              />
            </div>

            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="user_login">User Login</SelectItem>
                <SelectItem value="role_change">Role Change</SelectItem>
                <SelectItem value="message_delete">Message Delete</SelectItem>
                <SelectItem value="user_mute">User Mute</SelectItem>
                <SelectItem value="user_ban">User Ban</SelectItem>
                <SelectItem value="channel_update">Channel Update</SelectItem>
                <SelectItem value="data_modification">Data Modification</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Target Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="channel">Channel</SelectItem>
                <SelectItem value="message">Message</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
            <div className="text-xs text-zinc-500 font-mono">
              Showing {filteredLogs.length} of {auditLogs.length} entries
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={exportToCSV}
                className="text-xs h-7 border-zinc-700"
                disabled={filteredLogs.length === 0}
              >
                <Download className="w-3 h-3 mr-1" />
                Export CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLimit(limit === 50 ? 100 : 50)}
                className="text-xs h-7 border-zinc-700"
              >
                {limit === 50 ? 'Load More' : 'Show Less'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetch()}
                className="text-xs h-7 border-zinc-700"
              >
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {isLoading ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              Loading audit logs...
            </CardContent>
          </Card>
        ) : filteredLogs.length === 0 ? (
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-6 text-center text-zinc-500">
              No audit logs found
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card
              key={log.id}
              className={cn(
                "bg-zinc-950 border transition-colors hover:border-[#ea580c]/50",
                log.success ? "border-zinc-800" : "border-red-900/50"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getSeverityIcon(log.severity)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] capitalize", getActionTypeColor(log.action_type))}
                          >
                            {log.action_type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] capitalize", getSeverityColor(log.severity))}
                          >
                            {log.severity}
                          </Badge>
                          {!log.success && (
                            <Badge variant="destructive" className="text-[10px]">
                              FAILED
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-white font-medium">
                          <span className="text-[#ea580c]">{log.actor_name || 'Unknown'}</span>
                          {' performed '}
                          <span className="text-zinc-300">{log.action_type.replace(/_/g, ' ')}</span>
                          {log.target_name && (
                            <>
                              {' on '}
                              <span className="text-zinc-300">{log.target_name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-600 font-mono text-right shrink-0">
                        {format(new Date(log.created_date), 'MMM d, HH:mm:ss')}
                      </div>
                    </div>

                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="mt-2 p-2 bg-zinc-900/50 border border-zinc-800 rounded">
                        <div className="text-[10px] font-mono text-zinc-500 mb-1">DETAILS:</div>
                        <div className="text-xs text-zinc-400 font-mono">
                          {Object.entries(log.details).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-zinc-600">{key}:</span>{' '}
                              <span className="text-zinc-300">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.ip_address && (
                      <div className="text-[10px] text-zinc-600 font-mono mt-2">
                        IP: {log.ip_address}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}