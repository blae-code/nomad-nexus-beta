import React, { useState, useEffect } from 'react';
import { Brain, X, TrendingUp, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PredictiveIntelEngine({ widgetId, onRemove, isDragging }) {
  const [predictions, setPredictions] = useState([]);

  useEffect(() => {
    generatePredictions();
    const interval = setInterval(generatePredictions, 15000);
    return () => clearInterval(interval);
  }, []);

  const generatePredictions = () => {
    const events = [
      'Supply shortage likely in Stanton',
      'Pirate activity spike predicted',
      'Trade opportunity window opening',
      'Weather anomaly detected',
      'Fleet maintenance window optimal'
    ];
    setPredictions(events.map((e, i) => ({
      text: e,
      confidence: Math.floor(60 + Math.random() * 40),
      impact: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)]
    })));
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-red-950/5 via-transparent to-orange-950/5 pointer-events-none animate-pulse" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Intel Engine</span>
          <Sparkles className="w-3 h-3 text-orange-500 animate-pulse" />
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {predictions.map((pred, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs text-zinc-300 font-semibold flex-1">{pred.text}</p>
              <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-bold ${
                pred.impact === 'HIGH' ? 'bg-red-950/40 text-red-400' :
                pred.impact === 'MEDIUM' ? 'bg-orange-950/40 text-orange-400' :
                'bg-zinc-900/40 text-zinc-500'
              }`}>
                {pred.impact}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Confidence</span>
              <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 transition-all" style={{ width: `${pred.confidence}%` }} />
              </div>
              <span className="text-[9px] text-orange-400 font-bold">{pred.confidence}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-2 border-t border-red-700/40 bg-black/60 backdrop-blur-sm relative z-10">
        <Button size="sm" variant="outline" className="w-full h-7 text-xs border-red-700/40 hover:border-red-500/60">
          <TrendingUp className="w-3 h-3 mr-1" /> Run Forecast
        </Button>
      </div>
    </div>
  );
}