import React, { useState, useEffect } from 'react';
import { Brain, X, Lightbulb, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AITacticalAdvisor({ widgetId, onRemove, isDragging }) {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    generateRecommendations();
    const interval = setInterval(generateRecommendations, 20000);
    return () => clearInterval(interval);
  }, []);

  const generateRecommendations = () => {
    const recs = [
      { text: 'Reassign BRAVO squad to northern sector', priority: 'HIGH', confidence: 92 },
      { text: 'Refuel assets before next jump', priority: 'MEDIUM', confidence: 85 },
      { text: 'Weather window optimal for deployment', priority: 'LOW', confidence: 78 }
    ];
    setRecommendations(recs);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/5 via-transparent to-orange-950/5 animate-pulse pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-red-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">AI Advisor</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {recommendations.map((rec, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-start gap-2 mb-1.5">
              <Lightbulb className={`w-3 h-3 mt-0.5 ${
                rec.priority === 'HIGH' ? 'text-red-500' :
                rec.priority === 'MEDIUM' ? 'text-orange-500' : 'text-zinc-500'
              }`} />
              <p className="text-xs text-zinc-300 flex-1 leading-relaxed">{rec.text}</p>
            </div>
            <div className="flex items-center gap-2 ml-5">
              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                rec.priority === 'HIGH' ? 'bg-red-950/40 text-red-400' :
                rec.priority === 'MEDIUM' ? 'bg-orange-950/40 text-orange-400' :
                'bg-zinc-900/40 text-zinc-500'
              }`}>
                {rec.priority}
              </span>
              <span className="text-[9px] text-zinc-600">AI: {rec.confidence}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}