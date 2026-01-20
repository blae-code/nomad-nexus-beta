import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { OpsPanel, OpsPanelHeader, OpsPanelTitle, OpsPanelContent } from '@/components/ui/OpsPanel';
import { Loader2, Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function AITacticalAdvisor({ eventId }) {
  const [suggestions, setSuggestions] = React.useState([]);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const { data: eventData } = useQuery({
    queryKey: ['ai-advisor-event', eventId],
    queryFn: () => eventId ? base44.entities.Event.get(eventId) : null,
    enabled: !!eventId
  });

  React.useEffect(() => {
    if (!eventData) return;

    setIsAnalyzing(true);
    const generateSuggestions = async () => {
      try {
        const aiResponse = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a tactical advisor for the operation: "${eventData.title}". 
          ${eventData.description ? `Description: ${eventData.description}` : ''}
          
          Provide 3-4 specific tactical recommendations to ensure mission success. Keep each suggestion under 50 words. Focus on: force composition, timing, communication discipline, risk mitigation.
          
          Return as JSON: { "suggestions": [{ "title": "...", "detail": "...", "risk": "low|medium|high" }] }`,
          response_json_schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    detail: { type: 'string' },
                    risk: { type: 'string' }
                  }
                }
              }
            }
          }
        });

        if (aiResponse?.data?.suggestions) {
          setSuggestions(aiResponse.data.suggestions);
        }
      } catch (err) {
        console.error('AI analysis failed:', err);
      } finally {
        setIsAnalyzing(false);
      }
    };

    generateSuggestions();
  }, [eventData]);

  if (!eventData) return null;

  const getRiskColor = (risk) => {
    const map = { low: 'text-emerald-500', medium: 'text-amber-500', high: 'text-red-500' };
    return map[risk] || 'text-zinc-500';
  };

  return (
    <OpsPanel>
      <OpsPanelHeader>
        <OpsPanelTitle className="flex items-center gap-2">
          <Brain className="w-3 h-3" />
          AI TACTICAL ADVISOR
        </OpsPanelTitle>
      </OpsPanelHeader>

      <OpsPanelContent className="space-y-2">
        {isAnalyzing ? (
          <div className="flex items-center justify-center py-4 text-zinc-500 text-xs">
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            ANALYZING OPERATION...
          </div>
        ) : suggestions.length === 0 ? (
          <div className="text-zinc-600 text-xs">NO ANALYSIS AVAILABLE</div>
        ) : (
          suggestions.map((sugg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-2 bg-zinc-900/50 border border-zinc-800 rounded space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-zinc-300">{sugg.title}</div>
                  <p className="text-[9px] text-zinc-500 mt-0.5 leading-relaxed">{sugg.detail}</p>
                </div>
                <TrendingUp className={cn('w-3 h-3 shrink-0 mt-0.5', getRiskColor(sugg.risk))} />
              </div>
              {sugg.risk === 'high' && (
                <div className="flex items-center gap-1 pt-1 text-[9px] text-red-400">
                  <AlertTriangle className="w-2 h-2" />
                  High Risk - Review Carefully
                </div>
              )}
            </motion.div>
          ))
        )}
      </OpsPanelContent>
    </OpsPanel>
  );
}