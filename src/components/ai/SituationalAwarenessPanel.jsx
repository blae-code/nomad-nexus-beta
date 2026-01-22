import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, TrendingUp, AlertCircle, Target, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function SituationalAwarenessPanel({ eventId, timeWindowMinutes = 15 }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sitrep', eventId, timeWindowMinutes],
    queryFn: async () => {
      const response = await base44.functions.invoke('generateMultiChannelSummary', {
        eventId,
        timeWindowMinutes
      });
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000
  });

  const getPostureColor = (posture) => {
    switch (posture) {
      case 'CRITICAL': return 'bg-red-900/50 border-red-700 text-red-200 animate-pulse';
      case 'HIGH_ALERT': return 'bg-orange-900/50 border-orange-700 text-orange-200';
      case 'ELEVATED': return 'bg-yellow-900/50 border-yellow-700 text-yellow-200';
      case 'NOMINAL': return 'bg-emerald-900/50 border-emerald-700 text-emerald-200';
      default: return 'bg-zinc-800 border-zinc-700 text-zinc-200';
    }
  };

  if (isLoading && !data) {
    return (
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI SITUATIONAL AWARENESS</span>
        </div>
        <div className="text-center py-8 text-zinc-500 text-xs">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          GENERATING SITREP...
        </div>
      </div>
    );
  }

  const sitrep = data?.sitrep;

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-wider">AI SITUATION REPORT</span>
        </div>
        <Button
          onClick={() => refetch()}
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[8px]"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      </div>

      {/* Operational Posture */}
      <div className={cn(
        "border p-3 mb-3",
        getPostureColor(sitrep?.posture)
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-bold uppercase tracking-wider">OPERATIONAL POSTURE</span>
          <Badge className={cn("text-[7px] font-bold", getPostureColor(sitrep?.posture))}>
            {sitrep?.posture || 'ANALYZING'}
          </Badge>
        </div>
        <div className="text-[10px] leading-relaxed">
          {sitrep?.operational_status || 'Analyzing multi-channel activity...'}
        </div>
      </div>

      {/* Key Developments */}
      {sitrep?.key_developments?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-blue-400" />
            <span className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">
              KEY DEVELOPMENTS
            </span>
          </div>
          <div className="space-y-1.5">
            {sitrep.key_developments.slice(0, 3).map((dev, idx) => (
              <div key={idx} className="bg-zinc-900/50 border border-zinc-800 p-2">
                <div className="text-[9px] text-zinc-200">• {dev}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threats & Concerns */}
      {sitrep?.threats_concerns?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertCircle className="w-3 h-3 text-orange-400" />
            <span className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">
              THREATS & CONCERNS
            </span>
          </div>
          <div className="space-y-1.5">
            {sitrep.threats_concerns.map((threat, idx) => (
              <div key={idx} className="bg-orange-950/30 border border-orange-900/50 p-2">
                <div className="text-[9px] text-orange-200">⚠ {threat}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command Priorities */}
      {sitrep?.command_priorities?.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target className="w-3 h-3 text-emerald-400" />
            <span className="text-[8px] font-bold uppercase text-zinc-400 tracking-wider">
              COMMAND PRIORITIES
            </span>
          </div>
          <div className="space-y-1.5">
            {sitrep.command_priorities.map((priority, idx) => (
              <div key={idx} className="bg-emerald-950/30 border border-emerald-900/50 p-2">
                <div className="text-[9px] text-emerald-200">→ {priority}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="pt-3 border-t border-zinc-800">
        <div className="grid grid-cols-3 gap-2 text-[8px]">
          <div>
            <span className="text-zinc-500">Window:</span>
            <span className="text-zinc-300 ml-1 font-mono">{timeWindowMinutes}m</span>
          </div>
          <div>
            <span className="text-zinc-500">Events:</span>
            <span className="text-zinc-300 ml-1 font-mono">{data?.context?.eventsAnalyzed || 0}</span>
          </div>
          <div>
            <span className="text-zinc-500">Nets:</span>
            <span className="text-zinc-300 ml-1 font-mono">{data?.context?.channelsMonitored || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}