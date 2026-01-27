import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AIMissionBriefingGenerator({ event, onApplyBriefing }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateBriefing = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const prompt = `You are a military operations briefing officer. Generate a comprehensive mission briefing for this operation.

OPERATION DETAILS:
Title: ${event.title}
Type: ${event.event_type}
Priority: ${event.priority}
Location: ${event.location || 'Not specified'}
Current Description: ${event.description || 'No description provided'}
Tags: ${event.tags?.join(', ') || 'None'}
Objectives: ${event.objectives?.map(o => o.text).join(', ') || 'None defined'}

Generate a professional, tactical mission briefing that includes:
1. Executive summary
2. Mission objectives (clear and concise)
3. Key risks and threats
4. Recommended precautions
5. Success criteria

Keep it concise but comprehensive. Use tactical military language appropriate for a space operations context.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            objectives_summary: { type: "string" },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                  mitigation: { type: "string" }
                }
              }
            },
            precautions: {
              type: "array",
              items: { type: "string" }
            },
            success_criteria: {
              type: "array",
              items: { type: "string" }
            },
            full_briefing: { type: "string" }
          }
        }
      });

      setBriefing(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyBriefing = () => {
    if (!briefing?.full_briefing) return;
    navigator.clipboard.writeText(briefing.full_briefing);
    toast.success("Briefing copied to clipboard");
  };

  const applyBriefing = () => {
    if (!briefing?.full_briefing) return;
    onApplyBriefing(briefing.full_briefing);
    toast.success("Briefing applied to operation description");
  };

  if (!briefing && !loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4 text-center">
          <Button 
            onClick={generateBriefing} 
            className="bg-blue-900/30 hover:bg-blue-900/50 text-blue-300 border border-blue-800"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate AI Briefing
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            Auto-generate comprehensive mission briefing
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-zinc-300 uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          AI Generated Briefing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-900 p-3 rounded text-xs text-red-400">
            {error}
          </div>
        )}

        {briefing && (
          <>
            <div className="bg-zinc-950/50 border border-zinc-800/50 p-4 rounded space-y-3">
              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase mb-1">Executive Summary</div>
                <p className="text-sm text-zinc-300 leading-relaxed">{briefing.executive_summary}</p>
              </div>

              {briefing.objectives_summary && (
                <div>
                  <div className="text-xs font-bold text-zinc-400 uppercase mb-1">Mission Objectives</div>
                  <p className="text-sm text-zinc-300 leading-relaxed">{briefing.objectives_summary}</p>
                </div>
              )}
            </div>

            {briefing.risks && briefing.risks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-zinc-400 uppercase">Identified Risks</div>
                {briefing.risks.map((risk, idx) => (
                  <div key={idx} className="bg-zinc-950/50 border border-zinc-800/50 p-3 rounded space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-zinc-200">{risk.risk}</span>
                      <Badge variant="outline" className={
                        risk.severity === 'critical' ? "text-red-400 border-red-900 bg-red-950/20" :
                        risk.severity === 'high' ? "text-orange-400 border-orange-900 bg-orange-950/20" :
                        risk.severity === 'medium' ? "text-amber-400 border-amber-900 bg-amber-950/20" :
                        "text-zinc-500 border-zinc-800"
                      }>
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400">Mitigation: {risk.mitigation}</p>
                  </div>
                ))}
              </div>
            )}

            {briefing.precautions && briefing.precautions.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/50 p-3 rounded space-y-1">
                <div className="text-xs font-bold text-amber-400 uppercase">Recommended Precautions</div>
                {briefing.precautions.map((precaution, idx) => (
                  <div key={idx} className="text-xs text-amber-300">• {precaution}</div>
                ))}
              </div>
            )}

            {briefing.success_criteria && briefing.success_criteria.length > 0 && (
              <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 rounded space-y-1">
                <div className="text-xs font-bold text-emerald-400 uppercase">Success Criteria</div>
                {briefing.success_criteria.map((criteria, idx) => (
                  <div key={idx} className="text-xs text-emerald-300">• {criteria}</div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={applyBriefing} 
                className="flex-1 bg-blue-900 hover:bg-blue-800 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply to Description
              </Button>
              <Button 
                onClick={copyBriefing} 
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button 
                onClick={generateBriefing} 
                variant="outline"
                className="border-zinc-700 hover:bg-zinc-800"
              >
                Regenerate
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}