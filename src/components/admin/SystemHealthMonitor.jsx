import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Server, Radio, AlertTriangle, CheckCircle, XCircle, RefreshCw, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function SystemHealthMonitor() {
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  // Check LiveKit connectivity
  const { data: livekitHealth, isLoading: livekitLoading, refetch: refetchLivekit } = useQuery({
    queryKey: ['livekit-health', lastRefresh],
    queryFn: async () => {
      try {
        const result = await base44.functions.invoke('getLiveKitRoomStatus', { roomName: 'health-check' });
        return {
          status: 'healthy',
          connected: true,
          message: 'LiveKit service operational',
          details: result.data
        };
      } catch (error) {
        return {
          status: 'error',
          connected: false,
          message: error.message || 'LiveKit unreachable',
          details: null
        };
      }
    },
    refetchInterval: 30000 // Every 30 seconds
  });

  // Check database connectivity
  const { data: dbHealth, refetch: refetchDb } = useQuery({
    queryKey: ['db-health', lastRefresh],
    queryFn: async () => {
      try {
        const testQuery = await base44.entities.User.list('-created_date', 1);
        return {
          status: 'healthy',
          connected: true,
          message: 'Database responsive',
          responseTime: performance.now()
        };
      } catch (error) {
        return {
          status: 'error',
          connected: false,
          message: 'Database connection failed',
          error: error.message
        };
      }
    },
    refetchInterval: 30000
  });

  // Check backend functions
  const { data: functionsHealth, refetch: refetchFunctions } = useQuery({
    queryKey: ['functions-health', lastRefresh],
    queryFn: async () => {
      try {
        // Try to invoke a simple health check function
        const result = await base44.functions.invoke('getLiveKitRoomStatus', { roomName: 'test' });
        return {
          status: 'healthy',
          connected: true,
          message: 'Backend functions operational'
        };
      } catch (error) {
        return {
          status: 'degraded',
          connected: true,
          message: 'Some functions may be unavailable',
          error: error.message
        };
      }
    },
    refetchInterval: 30000
  });

  // Active voice nets stats
  const { data: activeNets = [] } = useQuery({
    queryKey: ['active-nets-health'],
    queryFn: () => base44.entities.VoiceNet.filter({ status: 'active' }),
    refetchInterval: 10000
  });

  // Recent audit log activity
  const { data: recentAudits = [] } = useQuery({
    queryKey: ['recent-audits-health'],
    queryFn: () => base44.entities.AuditLog.list('-created_date', 10),
    refetchInterval: 15000
  });

  const handleRefreshAll = () => {
    setLastRefresh(new Date());
    refetchLivekit();
    refetchDb();
    refetchFunctions();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Activity className="w-5 h-5 text-zinc-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-emerald-950 border-emerald-900 text-emerald-400';
      case 'degraded':
        return 'bg-yellow-950 border-yellow-900 text-yellow-400';
      case 'error':
        return 'bg-red-950 border-red-900 text-red-400';
      default:
        return 'bg-zinc-900 border-zinc-800 text-zinc-500';
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="border-b border-zinc-900 bg-zinc-900/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-zinc-200 uppercase tracking-wide flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#ea580c]" />
                System Health Monitor
              </CardTitle>
              <CardDescription className="text-xs font-mono text-zinc-600">
                Real-time monitoring of backend services and infrastructure
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshAll}
              className="text-xs border-zinc-700"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-[10px] text-zinc-600 font-mono">
            Last updated: {format(lastRefresh, 'HH:mm:ss')}
          </div>
        </CardContent>
      </Card>

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LiveKit Service */}
        <Card className={cn("border transition-colors", livekitHealth?.status === 'healthy' ? "border-emerald-900/50" : "border-red-900/50")}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-zinc-400" />
                <div className="text-sm font-bold text-white">LiveKit</div>
              </div>
              {getStatusIcon(livekitHealth?.status)}
            </div>
            <div className="space-y-2">
              <Badge className={cn("text-[10px] uppercase", getStatusColor(livekitHealth?.status))}>
                {livekitHealth?.status || 'checking...'}
              </Badge>
              <div className="text-xs text-zinc-400">{livekitHealth?.message || 'Checking service...'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className={cn("border transition-colors", dbHealth?.status === 'healthy' ? "border-emerald-900/50" : "border-red-900/50")}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-zinc-400" />
                <div className="text-sm font-bold text-white">Database</div>
              </div>
              {getStatusIcon(dbHealth?.status)}
            </div>
            <div className="space-y-2">
              <Badge className={cn("text-[10px] uppercase", getStatusColor(dbHealth?.status))}>
                {dbHealth?.status || 'checking...'}
              </Badge>
              <div className="text-xs text-zinc-400">{dbHealth?.message || 'Checking connection...'}</div>
            </div>
          </CardContent>
        </Card>

        {/* Backend Functions */}
        <Card className={cn("border transition-colors", functionsHealth?.status === 'healthy' ? "border-emerald-900/50" : "border-yellow-900/50")}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-zinc-400" />
                <div className="text-sm font-bold text-white">Functions</div>
              </div>
              {getStatusIcon(functionsHealth?.status)}
            </div>
            <div className="space-y-2">
              <Badge className={cn("text-[10px] uppercase", getStatusColor(functionsHealth?.status))}>
                {functionsHealth?.status || 'checking...'}
              </Badge>
              <div className="text-xs text-zinc-400">{functionsHealth?.message || 'Checking availability...'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-900 bg-zinc-900/20 p-4">
            <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
              Active Voice Nets
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-3xl font-black text-white mb-2">{activeNets.length}</div>
            <div className="text-xs text-zinc-500">Currently operational</div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="border-b border-zinc-900 bg-zinc-900/20 p-4">
            <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-wide">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-3xl font-black text-white mb-2">{recentAudits.length}</div>
            <div className="text-xs text-zinc-500">Audit logs (last 10)</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Critical Events */}
      {recentAudits.filter(a => a.severity === 'critical' || a.severity === 'high').length > 0 && (
        <Card className="bg-zinc-950 border-red-900/50">
          <CardHeader className="border-b border-zinc-900 bg-red-950/20 p-4">
            <CardTitle className="text-sm font-bold text-red-400 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Recent Critical Events
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {recentAudits
                .filter(a => a.severity === 'critical' || a.severity === 'high')
                .slice(0, 5)
                .map((audit) => (
                  <div key={audit.id} className="text-xs p-2 bg-zinc-900/50 border border-zinc-800 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={cn(
                        "text-[9px]",
                        audit.severity === 'critical' ? "bg-red-900 text-red-400" : "bg-orange-900 text-orange-400"
                      )}>
                        {audit.severity}
                      </Badge>
                      <span className="text-zinc-600 font-mono text-[10px]">
                        {format(new Date(audit.created_date), 'HH:mm:ss')}
                      </span>
                    </div>
                    <div className="text-zinc-300">{audit.action_type.replace(/_/g, ' ')}</div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}