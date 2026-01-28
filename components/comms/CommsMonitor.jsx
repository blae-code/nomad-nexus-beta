import React from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, Radio, Eye, Zap, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function CommsMonitor({ eventId, autoRefresh = true }) {
  const [monitoring, setMonitoring] = React.useState(false);
  const [threats, setThreats] = React.useState(null);
  const [summary, setSummary] = React.useState(null);

  // Auto-analyze threats every 10 seconds when monitoring is active
  const { data: threatData, refetch: refetchThreats } = useQuery({
    queryKey: ['comms-threats', eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke('commsMonitor', {
        action: 'analyze_threats',
        eventId,
        timeWindow: 50
      });
      return res.data;
    },
    enabled: monitoring && !!eventId,
    refetchInterval: autoRefresh ? 10000 : false,
    onSuccess: (data) => setThreats(data)
  });

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('commsMonitor', {
        action: 'summarize_traffic',
        eventId,
        timeWindow: 40
      });
      return res.data;
    },
    onSuccess: (data) => setSummary(data)
  });

  const threatConfig = {
    critical: { color: "text-red-500", bg: "bg-red-950/30", border: "border-red-900", icon: Shield },
    elevated: { color: "text-yellow-500", bg: "bg-yellow-950/30", border: "border-yellow-900", icon: AlertTriangle },
    normal: { color: "text-emerald-500", bg: "bg-emerald-950/30", border: "border-emerald-900", icon: Eye }
  };

  const config = threatConfig[threats?.threat_level] || threatConfig.normal;
  const ThreatIcon = config.icon;

  return (
    <div className="space-y-3">
      {/* Monitoring Control */}
      <Card className="bg-zinc-900/50 border-zinc-800 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className={cn("w-4 h-4", monitoring && "animate-pulse text-emerald-500")} />
            <div className="text-xs font-bold text-zinc-300">AI Comms Monitor</div>
          </div>
          <Button
            size="sm"
            variant={monitoring ? "default" : "outline"}
            onClick={() => setMonitoring(!monitoring)}
            className={cn(
              "h-7 text-[10px] gap-1",
              monitoring ? "bg-emerald-600 hover:bg-emerald-700" : "border-zinc-800"
            )}
          >
            <Eye className="w-3 h-3" />
            {monitoring ? 'Active' : 'Standby'}
          </Button>
        </div>

        {monitoring && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchThreats()}
              className="flex-1 h-7 text-[10px] border-zinc-800 hover:bg-zinc-800"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Scan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => summarizeMutation.mutate()}
              disabled={summarizeMutation.isPending}
              className="flex-1 h-7 text-[10px] border-zinc-800 hover:bg-zinc-800"
            >
              <Zap className="w-3 h-3 mr-1" />
              Summary
            </Button>
          </div>
        )}
      </Card>

      {/* Threat Level Indicator */}
      <AnimatePresence>
        {monitoring && threats && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className={cn("border p-3", config.bg, config.border)}>
              <div className="flex items-center gap-2 mb-2">
                <ThreatIcon className={cn("w-4 h-4", config.color)} />
                <div className="text-xs font-bold text-white uppercase tracking-wider">
                  {threats.threat_level} Threat Level
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mb-2">
                Auto-scanning comms traffic for tactical keywords and distress signals
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Critical Alerts */}
      <AnimatePresence>
        {threats?.critical_alerts?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-2"
          >
            <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
              Critical Alerts Detected
            </div>
            {threats.critical_alerts.map((alert, idx) => (
              <Card key={idx} className="bg-red-950/30 border-red-900 p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px] border-red-700 text-red-400">
                        {alert.net_code}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] border-red-700 text-red-400">
                        {alert.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs font-bold text-white mb-1">{alert.message}</div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-red-400">ACTION:</span> {alert.recommended_action}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyword Detection */}
      <AnimatePresence>
        {threats?.keywords_detected?.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
              Keywords Detected
            </div>
            {threats.keywords_detected.slice(0, 5).map((kw, idx) => (
              <Card key={idx} className="bg-zinc-900/50 border-zinc-800 p-2">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className={cn(
                    "text-[9px]",
                    kw.threat_level === 'high' ? "border-red-700 text-red-400" :
                    kw.threat_level === 'medium' ? "border-yellow-700 text-yellow-400" :
                    "border-zinc-700 text-zinc-400"
                  )}>
                    {kw.keyword}
                  </Badge>
                  <span className="text-[9px] text-zinc-600 font-mono">{kw.net_code}</span>
                </div>
                <div className="text-[10px] text-zinc-500 italic">{kw.context}</div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Traffic Summary */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="bg-blue-950/20 border-blue-900/50 p-3">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-2">
                Traffic Summary
              </div>
              <div className="text-xs text-zinc-300 leading-relaxed mb-3">
                {summary.summary}
              </div>
              <div className="flex gap-2 mb-2">
                <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">
                  Activity: {summary.activity_level}
                </Badge>
                <Badge variant="outline" className="text-[9px] border-zinc-700 text-zinc-400">
                  Nets: {summary.nets_active?.length || 0}
                </Badge>
              </div>
              {summary.key_events?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[9px] text-zinc-500 uppercase">Key Events:</div>
                  {summary.key_events.slice(0, 3).map((event, idx) => (
                    <div key={idx} className="text-[10px] text-zinc-400 pl-2 border-l border-zinc-800">
                      • {event}
                    </div>
                  ))}
                </div>
              )}
              {summary.concerns?.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-950/20 border border-yellow-900/30 rounded-sm">
                  <div className="text-[9px] text-yellow-400 uppercase mb-1">Concerns:</div>
                  {summary.concerns.map((concern, idx) => (
                    <div key={idx} className="text-[10px] text-zinc-400">• {concern}</div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!monitoring && (
        <Card className="bg-zinc-950/50 border-zinc-800 p-4 text-center">
          <Eye className="w-8 h-8 mx-auto mb-2 text-zinc-700 opacity-50" />
          <div className="text-xs text-zinc-500">Enable monitoring to track threats</div>
        </Card>
      )}
    </div>
  );
}