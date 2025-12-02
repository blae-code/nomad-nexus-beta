import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Radar, MapPin, Activity, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useQuery, useMutation } from "@tanstack/react-query";

export default function TacticalStatusReporter({ user, eventId }) {
  const [report, setReport] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch latest tactical inference shared by any user
  const { data: latestLog } = useQuery({
    queryKey: ['tactical-log', eventId],
    queryFn: async () => {
       const logs = await base44.entities.AIAgentLog.list({
          filter: { 
             event_id: eventId,
             agent_slug: 'tactical-computer'
          },
          sort: { created_date: -1 },
          limit: 1
       });
       return logs[0] || null;
    },
    refetchInterval: 3000
  });

  // Parse stored result
  const tacticalPicture = React.useMemo(() => {
    if (!latestLog?.details) return null;
    try {
       return JSON.parse(latestLog.details);
    } catch {
       return null;
    }
  }, [latestLog]);

  const handleReport = async () => {
    if (!report.trim()) return;

    setIsAnalyzing(true);
    try {
      // Call Backend Function for Inference
      const { data: result } = await base44.functions.invoke('inferTacticalStatus', {
          report: report,
          userRank: user?.rank || 'Unknown'
      });

      // Broadcast result via AIAgentLog
      await base44.entities.AIAgentLog.create({
         event_id: eventId,
         agent_slug: 'tactical-computer',
         type: 'INFO',
         severity: result.color === 'Red' ? 'HIGH' : 'LOW',
         summary: 'Tactical Picture Update',
         details: JSON.stringify(result)
      });

      setReport("");
      queryClient.invalidateQueries(['tactical-log', eventId]);
      
    } catch (error) {
      console.error("Inference failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">
        <Radar className="w-4 h-4" />
        <span>Tactical Uplink</span>
      </div>

      {/* Result Display (Shared View) */}
      {tacticalPicture && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
           <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">Fleet Telemetry</span>
              <div className={`w-2 h-2 rounded-full ${
                 tacticalPicture.color === 'Red' ? 'bg-red-500 animate-pulse' :
                 tacticalPicture.color === 'Amber' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
           </div>
           
           <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs">
                 <MapPin className="w-3 h-3 text-zinc-600" />
                 <span className="font-mono text-zinc-300">{tacticalPicture.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                 <Activity className="w-3 h-3 text-zinc-600" />
                 <span className="font-mono font-bold text-white">{tacticalPicture.status}</span>
              </div>
           </div>
           <div className="text-[10px] text-zinc-400 border-t border-zinc-800 pt-2 mt-1">
              "{tacticalPicture.summary}"
           </div>
        </div>
      )}

      {/* Input Area */}
      <div className="space-y-2">
         <Textarea 
            placeholder="REPORT STATUS // e.g. 'Mining near Hurston', 'Engaged at SPK'..."
            className="bg-black border-zinc-800 text-xs font-mono min-h-[80px] focus-visible:ring-zinc-700"
            value={report}
            onChange={(e) => setReport(e.target.value)}
         />
         <Button 
            onClick={handleReport} 
            disabled={isAnalyzing || !report.trim()}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs tracking-wider"
         >
            {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Send className="w-3 h-3 mr-2" />}
            {isAnalyzing ? "PROCESSING..." : "TRANSMIT REPORT"}
         </Button>
      </div>
    </div>
  );
}