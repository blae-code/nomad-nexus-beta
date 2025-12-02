import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, RefreshCw, Radio, Activity, Sparkles } from "lucide-react";
import { refreshAgent } from "@/utils/aiOrchestrator";
import { cn } from "@/lib/utils";
import { hasMinRank } from "@/components/permissions";

export default function AIInsightsPanel({ eventId, compact = false }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Fetch Agents
  const { data: agents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => base44.entities.AIAgent.list({ is_active: true }),
    initialData: []
  });

  // Fetch Logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-logs', eventId],
    queryFn: () => base44.entities.AIAgentLog.list({ 
      filter: { event_id: eventId },
      sort: { created_date: -1 },
      limit: 10 
    }),
    refetchInterval: 10000, // Auto-refresh logs every 10s
    initialData: []
  });

  // Mutations to trigger analysis
  const runAnalysisMutation = useMutation({
    mutationFn: async (agentSlug) => {
      return refreshAgent(agentSlug, eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-logs', eventId]);
    }
  });

  const canTrigger = hasMinRank(currentUser, 'Scout');

  // Get latest log per agent
  const latestLogs = React.useMemo(() => {
    const map = {};
    agents.forEach(a => {
      const log = logs.find(l => l.agent_slug === a.slug);
      if (log) map[a.slug] = log;
    });
    return map;
  }, [agents, logs]);

  return (
    <Card className={cn("bg-zinc-950 border-zinc-800", compact ? "border-0 bg-transparent shadow-none" : "")}>
      <CardHeader className={cn("pb-2", compact ? "p-0 mb-4" : "")}>
        <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
          <Bot className="w-4 h-4 text-indigo-400" />
          Nexus Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-4", compact ? "p-0" : "")}>
        {agents.map(agent => {
          const log = latestLogs[agent.slug];
          const isRunning = runAnalysisMutation.isPending && runAnalysisMutation.variables === agent.slug;
          
          return (
            <div key={agent.id} className="bg-zinc-900/50 rounded border border-zinc-800/50 overflow-hidden">
              {/* Agent Header */}
              <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-zinc-800/50">
                 <div className="flex items-center gap-2">
                    {agent.slug === 'comms-watch' ? <Radio className="w-3 h-3 text-blue-400" /> : <Activity className="w-3 h-3 text-emerald-400" />}
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{agent.name}</span>
                 </div>
                 {canTrigger && (
                   <Button 
                     variant="ghost" 
                     size="icon" 
                     className="h-5 w-5 text-zinc-500 hover:text-white"
                     disabled={isRunning}
                     onClick={() => runAnalysisMutation.mutate(agent.slug)}
                     title="Force Re-analysis"
                   >
                     <RefreshCw className={cn("w-3 h-3", isRunning && "animate-spin")} />
                   </Button>
                 )}
              </div>
              
              {/* Output */}
              <div className="p-3 text-xs font-mono text-zinc-400 leading-relaxed relative min-h-[60px]">
                 {isRunning ? (
                   <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                     <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                   </div>
                 ) : log ? (
                   <div>
                      <div className="whitespace-pre-line">{log.content}</div>
                      <div className="mt-2 text-[9px] text-zinc-600 uppercase text-right">
                        Updated: {new Date(log.created_date).toLocaleTimeString()}
                      </div>
                   </div>
                 ) : (
                   <div className="text-zinc-600 italic text-center py-2">
                     System standby. Awaiting initialization.
                   </div>
                 )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}