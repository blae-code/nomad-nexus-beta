import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2, CheckCircle2, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AIFleetAssignmentSuggestions({ event, assets, onApplySuggestions }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch historical events for context
      const historicalEvents = await base44.entities.Event.list({ 
        sort: { created_date: -1 }, 
        limit: 50 
      });

      const prompt = `You are an expert fleet operations commander. Analyze this operation and suggest optimal fleet asset assignments.

OPERATION DETAILS:
Title: ${event.title}
Type: ${event.event_type}
Priority: ${event.priority}
Location: ${event.location || 'Not specified'}
Description: ${event.description}
Tags: ${event.tags?.join(', ') || 'None'}

AVAILABLE ASSETS:
${assets.map(a => `- ${a.name} (${a.model}) - Status: ${a.status}, Location: ${a.location || 'Unknown'}`).join('\n')}

HISTORICAL CONTEXT:
${historicalEvents.slice(0, 10).map(e => `- ${e.title} (${e.event_type}, ${e.priority}) - Assigned: ${e.assigned_asset_ids?.length || 0} assets`).join('\n')}

Provide:
1. Recommended assets (with reasoning for each)
2. Priority order
3. Any warnings or considerations`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  asset_id: { type: "string" },
                  asset_name: { type: "string" },
                  reasoning: { type: "string" },
                  priority: { type: "string", enum: ["essential", "recommended", "optional"] }
                }
              }
            },
            warnings: {
              type: "array",
              items: { type: "string" }
            },
            overall_assessment: { type: "string" }
          }
        }
      });

      setSuggestions(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestions?.recommendations) return;
    
    const recommendedAssetIds = suggestions.recommendations
      .filter(r => r.priority === 'essential' || r.priority === 'recommended')
      .map(r => r.asset_id)
      .filter(id => assets.some(a => a.id === id));
    
    onApplySuggestions(recommendedAssetIds);
  };

  if (!suggestions && !loading) {
    return (
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4 text-center">
          <Button 
            onClick={generateSuggestions} 
            className="bg-purple-900/30 hover:bg-purple-900/50 text-purple-300 border border-purple-800"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get AI Fleet Recommendations
          </Button>
          <p className="text-xs text-zinc-500 mt-2">
            Analyze historical data and suggest optimal assets
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-zinc-300 uppercase tracking-wide flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          AI Fleet Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          </div>
        )}

        {error && (
          <div className="bg-red-950/20 border border-red-900 p-3 rounded text-xs text-red-400">
            {error}
          </div>
        )}

        {suggestions && (
          <>
            <div className="bg-zinc-950/50 border border-zinc-800/50 p-3 rounded text-xs text-zinc-400">
              {suggestions.overall_assessment}
            </div>

            <div className="space-y-2">
              {suggestions.recommendations?.map((rec, idx) => {
                const asset = assets.find(a => a.id === rec.asset_id);
                if (!asset) return null;

                return (
                  <div key={idx} className="bg-zinc-950/50 border border-zinc-800/50 p-3 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-3 h-3 text-blue-400" />
                        <span className="text-sm font-bold text-zinc-200">{asset.name}</span>
                        <span className="text-xs text-zinc-500">{asset.model}</span>
                      </div>
                      <Badge variant="outline" className={
                        rec.priority === 'essential' ? "text-red-400 border-red-900 bg-red-950/20" :
                        rec.priority === 'recommended' ? "text-amber-400 border-amber-900 bg-amber-950/20" :
                        "text-zinc-500 border-zinc-800"
                      }>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{rec.reasoning}</p>
                  </div>
                );
              })}
            </div>

            {suggestions.warnings && suggestions.warnings.length > 0 && (
              <div className="bg-amber-950/20 border border-amber-900/50 p-3 rounded space-y-1">
                <div className="text-xs font-bold text-amber-400 uppercase">Warnings:</div>
                {suggestions.warnings.map((warning, idx) => (
                  <div key={idx} className="text-xs text-amber-300">• {warning}</div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={applySuggestions} 
                className="flex-1 bg-purple-900 hover:bg-purple-800 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply Recommendations
              </Button>
              <Button 
                onClick={generateSuggestions} 
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