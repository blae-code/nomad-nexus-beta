import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, AlertTriangle, MessageSquare, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AICommsSummarizer({ eventId, timeRangeMinutes = 15 }) {
  const [summary, setSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['comms-summary-messages', eventId],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
      const msgs = await base44.entities.Message.list('-created_date', 50);
      return msgs.filter(m => 
        new Date(m.created_date) > cutoff && 
        m.content.includes('[COMMS LOG]')
      );
    },
    enabled: !!eventId,
    refetchInterval: 30000,
    initialData: []
  });

  const { data: playerStatuses = [] } = useQuery({
    queryKey: ['comms-summary-statuses', eventId],
    queryFn: () => base44.entities.PlayerStatus.filter({ event_id: eventId }),
    enabled: !!eventId,
    refetchInterval: 15000,
    initialData: []
  });

  const generateSummary = async () => {
    if (recentMessages.length === 0) return;
    
    setIsGenerating(true);
    try {
      // Extract comms data
      const commsData = recentMessages.map(m => ({
        time: new Date(m.created_date).toLocaleTimeString(),
        content: m.content
      }));

      // Get status overview
      const distressCount = playerStatuses.filter(s => s.status === 'DISTRESS' || s.status === 'DOWN').length;
      const statusOverview = {
        total: playerStatuses.length,
        distress: distressCount,
        nominal: playerStatuses.filter(s => s.status === 'NOMINAL').length
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI communications analyst for a tactical operations console. Analyze these recent voice net communications and player statuses to provide:

1. A brief summary of key operational activities (2-3 sentences)
2. Any critical alerts that need immediate attention
3. Notable patterns or trends

Recent Communications (last ${timeRangeMinutes} minutes):
${JSON.stringify(commsData, null, 2)}

Player Status Overview:
${JSON.stringify(statusOverview, null, 2)}

Provide a concise tactical summary focused on actionable intelligence.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            critical_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string" },
                  message: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            trends: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setSummary(result.summary);
      setAlerts(result.critical_alerts || []);
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate on mount and when messages change significantly
  useEffect(() => {
    if (recentMessages.length > 0 && !summary) {
      generateSummary();
    }
  }, [recentMessages.length]);

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            AI Tactical Summary
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            disabled={isGenerating || recentMessages.length === 0}
            className="h-7 text-xs"
          >
            <RefreshCw className={cn("w-3 h-3 mr-1", isGenerating && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isGenerating ? (
          <div className="text-center py-6 text-xs text-zinc-500 font-mono animate-pulse">
            ANALYZING COMMS TRAFFIC...
          </div>
        ) : summary ? (
          <>
            <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/50 p-3 rounded border border-zinc-800">
              {summary}
            </div>

            {alerts.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Critical Alerts
                </div>
                {alerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-2 rounded text-xs border",
                      alert.severity === 'high' ? "bg-red-950/30 border-red-900 text-red-200" :
                      alert.severity === 'medium' ? "bg-yellow-950/30 border-yellow-900 text-yellow-200" :
                      "bg-blue-950/30 border-blue-900 text-blue-200"
                    )}
                  >
                    <div className="font-bold">{alert.message}</div>
                    {alert.action && (
                      <div className="text-[10px] opacity-80 mt-1">→ {alert.action}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6 text-xs text-zinc-600">
            No recent comms activity to analyze
          </div>
        )}

        <div className="pt-2 border-t border-zinc-900 text-[9px] text-zinc-600 font-mono flex items-center justify-between">
          <span>{recentMessages.length} transmissions analyzed</span>
          <span>Last {timeRangeMinutes}m</span>
        </div>
      </CardContent>
    </Card>
  );
}