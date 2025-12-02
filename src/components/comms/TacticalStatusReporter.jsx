import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Radar, MapPin, Activity, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function TacticalStatusReporter({ user, eventId }) {
  const [report, setReport] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [inferenceResult, setInferenceResult] = useState(null);
  const queryClient = useQueryClient();

  const handleReport = async () => {
    if (!report.trim()) return;

    setIsAnalyzing(true);
    try {
      // Simulate Backend Function using InvokeLLM
      const prompt = `
        Analyze the following status report from a user in a sci-fi operational context (Star Citizen universe).
        User Rank: ${user?.rank || 'Unknown'}
        Report: "${report}"

        Infer the following:
        1. Fleet Location (e.g., Stanton System, Pyro, Lagrange Point) based on place names (Hurston, MicroTech, Crusader, ArcCorp imply Stanton).
        2. Tactical Status (e.g., Combat Alert, Industry Ops, Idle, Transit).
        3. Status Color (Green, Amber, Red).

        Return JSON only: { "location": string, "status": string, "color": string, "summary": string }
      `;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
            type: "object",
            properties: {
                location: { type: "string" },
                status: { type: "string" },
                color: { type: "string" },
                summary: { type: "string" }
            }
        }
      });

      setInferenceResult(result);
      setReport("");
      
      // Ideally we would save this to an entity here so other users see it
      // For now we just display local state as requested by the "simulate" instruction
      
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

      {/* Result Display */}
      {inferenceResult && (
        <div className="bg-zinc-900/50 border border-zinc-800 p-3 space-y-2 animate-in fade-in slide-in-from-top-2">
           <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase tracking-widest text-zinc-500">Inferred Telemetry</span>
              <div className={`w-2 h-2 rounded-full ${
                 inferenceResult.color === 'Red' ? 'bg-red-500 animate-pulse' :
                 inferenceResult.color === 'Amber' ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
           </div>
           
           <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-xs">
                 <MapPin className="w-3 h-3 text-zinc-600" />
                 <span className="font-mono text-zinc-300">{inferenceResult.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                 <Activity className="w-3 h-3 text-zinc-600" />
                 <span className="font-mono font-bold text-white">{inferenceResult.status}</span>
              </div>
           </div>
           <div className="text-[10px] text-zinc-400 border-t border-zinc-800 pt-2 mt-1">
              "{inferenceResult.summary}"
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