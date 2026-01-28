import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AIResponseSuggestions({ 
  recentMessages = [], 
  context, 
  onSelectSuggestion 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const generateSuggestions = async () => {
    if (recentMessages.length === 0) return;

    setIsGenerating(true);
    try {
      const lastMessages = recentMessages.slice(-5).map(m => ({
        user: m.user_id,
        content: m.content,
        time: new Date(m.created_date).toLocaleTimeString()
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant for tactical communications. Based on these recent messages, suggest 3 appropriate response options.

Recent Messages:
${JSON.stringify(lastMessages, null, 2)}

Context: ${context || 'Operational communications'}

Generate 3 concise, professional response suggestions that would be appropriate for this tactical conversation. Keep responses brief and clear.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  tone: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    if (recentMessages.length >= 2) {
      generateSuggestions();
    }
  }, [recentMessages.length]);

  if (suggestions.length === 0 && !isGenerating) return null;

  return (
    <Card className="bg-zinc-950/50 border-zinc-800 p-3">
      <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3" />
        AI Suggested Responses
      </div>
      
      {isGenerating ? (
        <div className="text-xs text-zinc-500 animate-pulse py-2">Analyzing conversation...</div>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 rounded p-2 cursor-pointer transition-all"
              onClick={() => onSelectSuggestion && onSelectSuggestion(suggestion.text)}
            >
              <div className="text-xs text-zinc-300 pr-8">{suggestion.text}</div>
              <Badge
                variant="outline"
                className="absolute top-2 right-2 text-[9px] h-4 border-zinc-700 text-zinc-500"
              >
                {suggestion.tone}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-2 right-2 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(suggestion.text, idx);
                }}
              >
                {copiedIndex === idx ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={generateSuggestions}
        disabled={isGenerating}
        className="w-full mt-2 h-7 text-[10px]"
      >
        <Sparkles className={cn("w-3 h-3 mr-1", isGenerating && "animate-pulse")} />
        Regenerate
      </Button>
    </Card>
  );
}