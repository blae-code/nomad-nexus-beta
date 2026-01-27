import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AIMessageAnalysis({ message, compact = false }) {
  const [analyzing, setAnalyzing] = useState(false);
  const analysis = message?.ai_analysis;

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);
      const response = await base44.functions.invoke('analyzeMessage', {
        messageId: message.id,
        content: message.content,
        channelId: message.channel_id
      });
      return response.data;
    },
    onSettled: () => setAnalyzing(false)
  });

  if (!analysis && !compact) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={() => analyzeMutation.mutate()}
        disabled={analyzing}
        className="gap-2 h-6 text-xs"
      >
        <Brain className="w-3 h-3" />
        {analyzing ? 'Analyzing...' : 'AI Analyze'}
      </Button>
    );
  }

  if (!analysis) return null;

  const priorityColors = {
    low: 'bg-zinc-700 text-zinc-300',
    medium: 'bg-blue-900/50 text-blue-300 border-blue-700',
    high: 'bg-orange-900/50 text-orange-300 border-orange-700',
    critical: 'bg-red-900/50 text-red-300 border-red-700'
  };

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={cn('text-[9px]', priorityColors[analysis.priority])}>
          {analysis.priority?.toUpperCase()}
        </Badge>
        <Badge variant="outline" className="text-[9px]">
          {analysis.category}
        </Badge>
        {analysis.escalate && (
          <Badge className="text-[9px] bg-red-950 text-red-300 border-red-700 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            ESCALATE
          </Badge>
        )}
      </div>
      
      {!compact && analysis.summary && (
        <div className="text-[10px] text-zinc-400 italic bg-zinc-900/50 p-2 border-l-2 border-blue-500">
          {analysis.summary}
        </div>
      )}
      
      {!compact && analysis.action_items?.length > 0 && (
        <div className="text-[10px] text-zinc-400 space-y-0.5">
          {analysis.action_items.map((item, i) => (
            <div key={i} className="flex items-start gap-1">
              <TrendingUp className="w-2.5 h-2.5 mt-0.5 text-orange-500" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}