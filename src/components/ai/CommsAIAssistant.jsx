import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  Bot, 
  Sparkles, 
  AlertTriangle, 
  Radio, 
  MessageSquare, 
  Loader2, 
  ChevronRight, 
  FileText,
  Copy,
  Send,
  Lightbulb
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CommsAIAssistant({ eventId, channelId, user }) {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [proactiveSuggestions, setProactiveSuggestions] = useState([]);
  const [draftMessage, setDraftMessage] = useState(null);
  
  // Fetch recent activity for proactive suggestions
  const { data: recentMessages } = useQuery({
    queryKey: ['comms-recent-activity', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      return base44.entities.Message.list({ limit: 20, sort: { created_date: -1 } });
    },
    enabled: !!eventId,
    refetchInterval: 10000
  });

  const { data: playerStatuses } = useQuery({
    queryKey: ['player-statuses-ai', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      return base44.entities.PlayerStatus.filter({ event_id: eventId });
    },
    enabled: !!eventId,
    refetchInterval: 15000
  });

  // AI Operations
  const aiMutation = useMutation({
    mutationFn: async ({ action, data }) => {
      const res = await base44.functions.invoke('commsAssistant', { action, data });
      return res.data;
    }
  });

  // Proactive analysis effect
  useEffect(() => {
    if (!eventId || !recentMessages?.length || !playerStatuses) return;

    const analyzeContext = async () => {
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyze this operational comms data and provide 2-3 SHORT, actionable suggestions for the comms officer:

Recent Messages: ${JSON.stringify(recentMessages.slice(0, 10))}
Player Statuses: ${JSON.stringify(playerStatuses.filter(p => p.status === 'DISTRESS' || p.status === 'DOWN'))}

Focus on:
1. Net routing for incidents (e.g., "Route rescue traffic to RESCUE net")
2. Response drafts (e.g., suggested message to send)
3. Priority alerts (e.g., "3 personnel in DISTRESS state")

Return JSON array of suggestions with: { type: "net_route"|"draft_message"|"alert", title, description, actionable_data }`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    actionable_data: { type: "object" }
                  }
                }
              }
            }
          }
        });

        if (res.suggestions?.length > 0) {
          setProactiveSuggestions(res.suggestions);
        }
      } catch (error) {
        console.error('Proactive analysis failed:', error);
      }
    };

    analyzeContext();
  }, [eventId, recentMessages?.length, playerStatuses?.length]);

  const handleSummarize = () => {
    aiMutation.mutate(
      { action: 'summarize_logs', data: { eventId, channelId } },
      {
        onSuccess: (data) => setSummary(data)
      }
    );
  };

  const handleSuggestNet = () => {
    aiMutation.mutate(
      { action: 'suggest_nets', data: { eventId } },
      {
        onSuccess: (data) => setSuggestion(data)
      }
    );
  };

  const handleDraftMessage = async (context) => {
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Draft a professional, concise comms message for this situation: ${context}. 
        
Keep it under 50 words, use military brevity, include relevant callsigns/codes.`,
        response_json_schema: {
          type: "object",
          properties: {
            message: { type: "string" }
          }
        }
      });
      setDraftMessage(res.message);
    } catch (error) {
      toast.error('Failed to draft message');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleAsk = (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const newHistory = [...chatHistory, { role: 'user', content: query }];
    setChatHistory(newHistory);
    setQuery("");

    aiMutation.mutate(
      { action: 'ask_comms', data: { query, eventId } },
      {
        onSuccess: (data) => {
          setChatHistory([...newHistory, { role: 'ai', content: data.answer }]);
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 w-80 shrink-0">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-500" />
          <span className="text-sm font-bold uppercase tracking-wider text-zinc-200">AI Uplink</span>
        </div>
        <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30 text-[10px]">
          V2.0 ONLINE
        </Badge>
      </div>

      <Tabs defaultValue="query" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2">
           <TabsList className="w-full grid grid-cols-3 bg-zinc-900/50 h-8">
              <TabsTrigger value="query" className="text-[10px]">QUERY</TabsTrigger>
              <TabsTrigger value="brief" className="text-[10px]">BRIEF</TabsTrigger>
              <TabsTrigger value="ops" className="text-[10px]">OPS</TabsTrigger>
           </TabsList>
        </div>

        {/* QUERY TAB */}
        <TabsContent value="query" className="flex-1 flex flex-col overflow-hidden p-0 m-0">
          <ScrollArea className="flex-1 p-4 space-y-4">
            {chatHistory.length === 0 && (
               <div className="text-center text-zinc-600 mt-10 space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto opacity-50" />
                  <p className="text-xs">Ask about event status, personnel locations, or active threats.</p>
               </div>
            )}
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={cn(
                "text-xs rounded-lg p-3 mb-2",
                msg.role === 'user' ? "bg-zinc-900 text-zinc-300 ml-4" : "bg-purple-900/20 text-purple-100 mr-4 border border-purple-500/20"
              )}>
                <div className="font-bold text-[9px] uppercase mb-1 opacity-50">
                   {msg.role === 'user' ? user.callsign || 'YOU' : 'AI OFFICER'}
                </div>
                {msg.content}
              </div>
            ))}
            {aiMutation.isPending && aiMutation.variables?.action === 'ask_comms' && (
               <div className="flex items-center gap-2 text-xs text-purple-400 ml-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing...
               </div>
            )}
          </ScrollArea>
          <div className="p-3 border-t border-zinc-800">
            <form onSubmit={handleAsk} className="flex gap-2">
               <Input 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask AI..."
                  className="h-8 text-xs bg-zinc-900 border-zinc-800"
               />
               <Button type="submit" size="sm" className="h-8 w-8 p-0 bg-purple-600 hover:bg-purple-700">
                  <ChevronRight className="w-4 h-4" />
               </Button>
            </form>
          </div>
        </TabsContent>

        {/* BRIEF TAB (Summaries) */}
        <TabsContent value="brief" className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
           <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Transcript Analysis</p>
              <Button 
                 variant="outline" 
                 onClick={handleSummarize} 
                 disabled={aiMutation.isPending}
                 className="w-full justify-start gap-2 text-xs h-8 bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
              >
                 <FileText className="w-3 h-3 text-blue-400" />
                 {aiMutation.isPending && aiMutation.variables?.action === 'summarize_logs' ? "Analyzing..." : "Summarize Recent Comms"}
              </Button>
           </div>
           
           {summary && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded p-3 space-y-2 animate-in fade-in zoom-in-95 duration-300">
                 <div className="text-xs font-bold text-blue-400 uppercase">Briefing Report</div>
                 <p className="text-xs text-zinc-300 leading-relaxed">{summary.summary}</p>
                 {summary.key_points?.length > 0 && (
                    <ul className="space-y-1 mt-2">
                       {summary.key_points.map((pt, i) => (
                          <li key={i} className="text-[10px] text-zinc-400 flex gap-2">
                             <span className="text-blue-500">•</span> {pt}
                          </li>
                       ))}
                    </ul>
                 )}
              </div>
           )}
        </TabsContent>

        {/* OPS TAB (Suggestions / Priority) */}
        <TabsContent value="ops" className="flex-1 flex flex-col overflow-hidden p-0 m-0">
           <ScrollArea className="flex-1 p-4 space-y-4">
              
              {/* Proactive Suggestions */}
              {proactiveSuggestions.length > 0 && (
                 <div className="space-y-2">
                    <div className="flex items-center gap-2">
                       <Lightbulb className="w-3 h-3 text-amber-500" />
                       <p className="text-[10px] text-zinc-500 uppercase font-bold">AI Recommendations</p>
                    </div>
                    {proactiveSuggestions.map((sug, idx) => (
                       <div key={idx} className="bg-zinc-900 border border-zinc-800 rounded p-3 space-y-2 hover:border-zinc-700 transition-colors">
                          <div className="flex items-start justify-between">
                             <div className="flex-1">
                                <div className="text-xs font-bold text-amber-400">{sug.title}</div>
                                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">{sug.description}</p>
                             </div>
                             <Badge variant="outline" className={cn(
                                "text-[9px] ml-2 shrink-0",
                                sug.type === 'alert' && "bg-red-950/30 text-red-400 border-red-900",
                                sug.type === 'net_route' && "bg-emerald-950/30 text-emerald-400 border-emerald-900",
                                sug.type === 'draft_message' && "bg-blue-950/30 text-blue-400 border-blue-900"
                             )}>
                                {sug.type.replace('_', ' ').toUpperCase()}
                             </Badge>
                          </div>
                          {sug.type === 'draft_message' && (
                             <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDraftMessage(sug.actionable_data?.context || sug.description)}
                                className="w-full justify-start gap-2 text-[10px] h-7 bg-blue-950/20 border border-blue-900/50 text-blue-300 hover:bg-blue-950/40"
                             >
                                <MessageSquare className="w-3 h-3" />
                                Generate Draft Response
                             </Button>
                          )}
                       </div>
                    ))}
                 </div>
              )}

              {/* Draft Message Display */}
              {draftMessage && (
                 <div className="bg-blue-950/20 border border-blue-900/50 rounded p-3 space-y-2">
                    <div className="text-xs font-bold text-blue-400 uppercase">Draft Message</div>
                    <div className="bg-zinc-900 border border-zinc-800 p-2 rounded">
                       <p className="text-xs text-zinc-300 font-mono leading-relaxed">{draftMessage}</p>
                    </div>
                    <div className="flex gap-2">
                       <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(draftMessage)}
                          className="flex-1 gap-2 text-[10px] h-7 border-zinc-700"
                       >
                          <Copy className="w-3 h-3" />
                          Copy
                       </Button>
                       <Button
                          size="sm"
                          onClick={() => setDraftMessage(null)}
                          className="flex-1 gap-2 text-[10px] h-7 bg-blue-600 hover:bg-blue-700"
                       >
                          <Send className="w-3 h-3" />
                          Use
                       </Button>
                    </div>
                 </div>
              )}
           
              {/* Net Advisor */}
              <div className="space-y-2 pt-4 border-t border-zinc-800">
                 <p className="text-[10px] text-zinc-500 uppercase font-bold">Comms Optimization</p>
                 <Button 
                    variant="outline" 
                    onClick={handleSuggestNet}
                    disabled={aiMutation.isPending}
                    className="w-full justify-start gap-2 text-xs h-8 bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
                 >
                    <Radio className="w-3 h-3 text-emerald-400" />
                    {aiMutation.isPending && aiMutation.variables?.action === 'suggest_nets' ? 'Analyzing...' : 'Recommend Voice Net'}
                 </Button>
              </div>

              {suggestion && (
                 <div className="bg-emerald-950/20 border border-emerald-900/50 rounded p-3">
                    <div className="text-xs font-bold text-emerald-400 uppercase mb-1">Optimal Frequency</div>
                    <div className="text-lg font-black font-mono text-emerald-500 mb-2">{suggestion.recommended_net_code}</div>
                    <p className="text-[10px] text-emerald-200/70">{suggestion.reason}</p>
                 </div>
              )}

              {/* Traffic Summary */}
              <div className="space-y-2 pt-4 border-t border-zinc-800">
                 <p className="text-[10px] text-zinc-500 uppercase font-bold">Traffic Monitor</p>
                 {playerStatuses?.filter(p => p.status === 'DISTRESS' || p.status === 'DOWN').length > 0 && (
                    <div className="bg-red-950/20 border border-red-900/50 p-3 rounded">
                       <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold text-red-400">PRIORITY ALERT</span>
                       </div>
                       <p className="text-[10px] text-red-300">
                          {playerStatuses.filter(p => p.status === 'DISTRESS' || p.status === 'DOWN').length} personnel require immediate assistance
                       </p>
                    </div>
                 )}
              </div>

           </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}