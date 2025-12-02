import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  FileText 
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function CommsAIAssistant({ eventId, channelId, user }) {
  const [query, setQuery] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  
  // AI Operations
  const aiMutation = useMutation({
    mutationFn: async ({ action, data }) => {
      const res = await base44.functions.invoke('commsAssistant', { action, data });
      return res.data;
    }
  });

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
        <TabsContent value="ops" className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
           
           {/* Net Advisor */}
           <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Comms Optimization</p>
              <Button 
                 variant="outline" 
                 onClick={handleSuggestNet}
                 className="w-full justify-start gap-2 text-xs h-8 bg-zinc-900 border-zinc-800 hover:bg-zinc-800"
              >
                 <Radio className="w-3 h-3 text-emerald-400" />
                 Recommend Voice Net
              </Button>
           </div>

           {suggestion && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 rounded p-3">
                 <div className="text-xs font-bold text-emerald-400 uppercase mb-1">Optimal Frequency</div>
                 <div className="text-lg font-black font-mono text-emerald-500 mb-2">{suggestion.recommended_net_code}</div>
                 <p className="text-[10px] text-emerald-200/70">{suggestion.reason}</p>
              </div>
           )}

           {/* Priority Scanner */}
           <div className="space-y-2 pt-4 border-t border-zinc-800">
              <p className="text-[10px] text-zinc-500 uppercase font-bold">Threat Detection</p>
              <div className="bg-zinc-900/30 border border-zinc-800 p-3 rounded text-center">
                 <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2 opacity-50" />
                 <p className="text-[10px] text-zinc-500">Passive Priority Scanning Active</p>
              </div>
           </div>

        </TabsContent>
      </Tabs>
    </div>
  );
}