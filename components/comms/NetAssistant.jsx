import React from 'react';
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, AlertTriangle, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function NetAssistant({ eventId, onApplySuggestion }) {
  const [activeView, setActiveView] = React.useState(null); // 'suggest' | 'conflicts' | 'report'
  const [result, setResult] = React.useState(null);

  const assistMutation = useMutation({
    mutationFn: async (action) => {
      const res = await base44.functions.invoke('netAssistant', {
        action,
        eventId
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
    }
  });

  const handleAction = (action) => {
    setActiveView(action);
    setResult(null);
    assistMutation.mutate(action);
  };

  const renderSuggestions = () => {
    if (!result?.nets) return null;
    
    return (
      <div className="space-y-3">
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
          AI-Recommended Net Configuration
        </div>
        {result.nets.map((net, idx) => (
          <Card key={idx} className="bg-zinc-900/50 border-zinc-800 p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-mono font-bold text-white">{net.code}</div>
                <div className="text-xs text-zinc-400">{net.label}</div>
              </div>
              <Badge variant="outline" className={cn(
                "text-[9px]",
                net.priority === 1 ? "border-red-500 text-red-400" : "border-zinc-700 text-zinc-500"
              )}>
                P{net.priority}
              </Badge>
            </div>
            <div className="text-[10px] text-zinc-500 mb-2">{net.reasoning}</div>
            <div className="flex gap-2 flex-wrap text-[9px]">
              <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">{net.type}</Badge>
              {net.min_rank_to_tx && (
                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400">
                  TX: {net.min_rank_to_tx}
                </Badge>
              )}
              {net.linked_squad_id && (
                <Badge variant="secondary" className="bg-blue-900/30 text-blue-400">Squad Linked</Badge>
              )}
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full mt-3 h-7 text-xs border-emerald-900 text-emerald-400 hover:bg-emerald-950"
              onClick={() => onApplySuggestion && onApplySuggestion(net)}
            >
              Apply Configuration
            </Button>
          </Card>
        ))}
      </div>
    );
  };

  const renderConflicts = () => {
    if (!result?.conflicts) return null;
    
    const severityConfig = {
      high: { icon: XCircle, color: "text-red-500", bg: "bg-red-950/30", border: "border-red-900" },
      medium: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-950/30", border: "border-yellow-900" },
      low: { icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-950/30", border: "border-blue-900" }
    };

    return (
      <div className="space-y-3">
        <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-2">
          Detected Communication Issues
        </div>
        {result.conflicts.length === 0 ? (
          <Card className="bg-emerald-950/20 border-emerald-900/50 p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-xs text-emerald-400 font-bold">No Conflicts Detected</div>
            <div className="text-[10px] text-zinc-500 mt-1">Network configuration is optimal</div>
          </Card>
        ) : (
          result.conflicts.map((conflict, idx) => {
            const config = severityConfig[conflict.severity] || severityConfig.low;
            const Icon = config.icon;
            
            return (
              <Card key={idx} className={cn("border p-3", config.bg, config.border)}>
                <div className="flex items-start gap-2 mb-2">
                  <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", config.color)} />
                  <div className="flex-1">
                    <div className="text-xs font-bold text-white mb-1">{conflict.description}</div>
                    <div className="text-[10px] text-zinc-400">
                      <span className="text-zinc-500">Recommendation:</span> {conflict.recommendation}
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-[9px]", config.color)}>
                    {conflict.severity.toUpperCase()}
                  </Badge>
                </div>
              </Card>
            );
          })
        )}
      </div>
    );
  };

  const renderReport = () => {
    if (!result?.summary) return null;
    
    const healthConfig = {
      optimal: { color: "text-emerald-500", bg: "bg-emerald-950/30", icon: CheckCircle2 },
      degraded: { color: "text-yellow-500", bg: "bg-yellow-950/30", icon: AlertTriangle },
      critical: { color: "text-red-500", bg: "bg-red-950/30", icon: XCircle }
    };
    
    const config = healthConfig[result.metrics?.net_health] || healthConfig.optimal;
    const HealthIcon = config.icon;

    return (
      <div className="space-y-3">
        <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
          Network Status Report
        </div>
        
        <Card className={cn("border p-4", config.bg, `border-${result.metrics?.net_health === 'critical' ? 'red' : result.metrics?.net_health === 'degraded' ? 'yellow' : 'emerald'}-900`)}>
          <div className="flex items-center gap-2 mb-3">
            <HealthIcon className={cn("w-5 h-5", config.color)} />
            <div className="text-sm font-bold text-white uppercase tracking-wider">
              {result.metrics?.net_health || 'Unknown'} Status
            </div>
          </div>
          <div className="text-xs text-zinc-300 leading-relaxed mb-4">
            {result.summary}
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-zinc-950/50 p-2 rounded-sm text-center">
              <div className="text-xl font-bold text-white font-mono">{result.metrics?.total_nets || 0}</div>
              <div className="text-[9px] text-zinc-500 uppercase">Active Nets</div>
            </div>
            <div className="bg-zinc-950/50 p-2 rounded-sm text-center">
              <div className="text-xl font-bold text-emerald-400 font-mono">{result.metrics?.active_participants || 0}</div>
              <div className="text-[9px] text-zinc-500 uppercase">Personnel</div>
            </div>
            <div className="bg-zinc-950/50 p-2 rounded-sm text-center">
              <div className="text-xl font-bold text-red-400 font-mono">{result.metrics?.critical_alerts || 0}</div>
              <div className="text-[9px] text-zinc-500 uppercase">Alerts</div>
            </div>
          </div>

          {result.recommendations?.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Recommendations:</div>
              {result.recommendations.map((rec, idx) => (
                <div key={idx} className="text-xs text-zinc-400 pl-2 border-l border-zinc-700">
                  • {rec}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  return (
    <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-sm space-y-4">
      <div className="flex items-center gap-2 text-sm font-bold text-purple-400 uppercase tracking-wider">
        <Bot className="w-4 h-4" />
        Net Assistant
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('suggest_config')}
          disabled={assistMutation.isPending}
          className={cn(
            "h-auto py-2 flex-col gap-1 text-xs border-zinc-800 hover:bg-zinc-900",
            activeView === 'suggest_config' && "bg-emerald-950/30 border-emerald-900"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px]">Suggest</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('detect_conflicts')}
          disabled={assistMutation.isPending}
          className={cn(
            "h-auto py-2 flex-col gap-1 text-xs border-zinc-800 hover:bg-zinc-900",
            activeView === 'detect_conflicts' && "bg-yellow-950/30 border-yellow-900"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="text-[10px]">Conflicts</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAction('status_report')}
          disabled={assistMutation.isPending}
          className={cn(
            "h-auto py-2 flex-col gap-1 text-xs border-zinc-800 hover:bg-zinc-900",
            activeView === 'status_report' && "bg-blue-950/30 border-blue-900"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px]">Report</span>
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {assistMutation.isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-8 text-zinc-500 text-xs font-mono"
          >
            <Bot className="w-8 h-8 mx-auto mb-2 animate-pulse" />
            Analyzing tactical network...
          </motion.div>
        )}

        {result && activeView === 'suggest_config' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {renderSuggestions()}
          </motion.div>
        )}

        {result && activeView === 'detect_conflicts' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {renderConflicts()}
          </motion.div>
        )}

        {result && activeView === 'status_report' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {renderReport()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}