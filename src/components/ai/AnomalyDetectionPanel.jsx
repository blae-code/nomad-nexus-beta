import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Shield, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function AnomalyDetectionPanel({ eventId, timeWindowMinutes = 30 }) {
  const [isScanning, setIsScanning] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['anomaly-detection', eventId, timeWindowMinutes],
    queryFn: async () => {
      const response = await base44.functions.invoke('detectCommsAnomalies', {
        eventId,
        timeWindowMinutes
      });
      return response.data;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000
  });

  const handleScan = async () => {
    setIsScanning(true);
    await refetch();
    setTimeout(() => setIsScanning(false), 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CRITICAL': return 'bg-red-900/50 border-red-700 text-red-200';
      case 'ELEVATED': return 'bg-yellow-900/50 border-yellow-700 text-yellow-200';
      case 'NOMINAL': return 'bg-emerald-900/50 border-emerald-700 text-emerald-200';
      default: return 'bg-zinc-800 border-zinc-700 text-zinc-200';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-900/50 text-red-200 border-red-700';
      case 'HIGH': return 'bg-orange-900/50 text-orange-200 border-orange-700';
      case 'MEDIUM': return 'bg-yellow-900/50 text-yellow-200 border-yellow-700';
      case 'LOW': return 'bg-blue-900/50 text-blue-200 border-blue-700';
      default: return 'bg-zinc-800 text-zinc-200 border-zinc-700';
    }
  };

  if (isLoading && !data) {
    return (
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI ANOMALY DETECTION</span>
        </div>
        <div className="text-center py-8 text-zinc-500 text-xs">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          ANALYZING COMMS TRAFFIC...
        </div>
      </div>
    );
  }

  const analysis = data?.analysis;
  const anomalies = analysis?.anomalies || [];

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI ANOMALY DETECTION</span>
        </div>
        <Button
          onClick={handleScan}
          disabled={isScanning}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[8px]"
        >
          <RefreshCw className={cn("w-3 h-3", isScanning && "animate-spin")} />
        </Button>
      </div>

      {/* Overall Status */}
      <div className={cn(
        "border p-3 mb-3",
        getStatusColor(analysis?.overall_status)
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-bold uppercase tracking-wider">OPERATIONAL POSTURE</span>
          <Badge className={cn("text-[7px] font-bold", getSeverityColor(analysis?.overall_status))}>
            {analysis?.overall_status || 'SCANNING'}
          </Badge>
        </div>
        <div className="text-[10px] leading-relaxed">
          {analysis?.summary || 'Scanning comms traffic for anomalies...'}
        </div>
      </div>

      {/* Anomalies List */}
      {anomalies.length > 0 ? (
        <div className="space-y-2">
          <div className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider mb-2">
            DETECTED ANOMALIES ({anomalies.length})
          </div>
          {anomalies.map((anomaly, idx) => (
            <div
              key={idx}
              className={cn(
                "border p-2.5",
                getSeverityColor(anomaly.severity)
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[8px] font-bold uppercase">{anomaly.type}</span>
                </div>
                <Badge className={cn("text-[7px]", getSeverityColor(anomaly.severity))}>
                  {anomaly.severity}
                </Badge>
              </div>
              <div className="text-[9px] mb-1.5 leading-relaxed">{anomaly.description}</div>
              {anomaly.recommended_action && (
                <div className="text-[8px] text-zinc-400 border-t border-zinc-700/50 pt-1.5 mt-1.5">
                  <span className="font-bold">→ ACTION: </span>
                  {anomaly.recommended_action}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500 text-xs">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <div className="font-bold">NO ANOMALIES DETECTED</div>
          <div className="text-[9px] mt-1">All systems nominal</div>
        </div>
      )}

      {/* Scan Info */}
      <div className="mt-3 pt-3 border-t border-zinc-800">
        <div className="grid grid-cols-2 gap-2 text-[8px]">
          <div>
            <span className="text-zinc-500">Time Window:</span>
            <span className="text-zinc-300 ml-1 font-mono">{timeWindowMinutes}m</span>
          </div>
          <div>
            <span className="text-zinc-500">Events:</span>
            <span className="text-zinc-300 ml-1 font-mono">{data?.context?.logsAnalyzed || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}