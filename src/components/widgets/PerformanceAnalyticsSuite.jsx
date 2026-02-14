import React, { useState, useEffect } from 'react';
import { TrendingUp, X, Award, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PerformanceAnalyticsSuite({ widgetId, onRemove, isDragging }) {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    generateMetrics();
  }, []);

  const generateMetrics = () => {
    setMetrics([
      { label: 'Mission Success', value: 87, trend: '+5%' },
      { label: 'Combat Rating', value: 92, trend: '+2%' },
      { label: 'Team Coordination', value: 78, trend: '-3%' },
      { label: 'Resource Efficiency', value: 85, trend: '+7%' }
    ]);
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,0.015)_0px,transparent_20px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Performance</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 relative z-10">
        {metrics.map((metric, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-zinc-300 font-semibold">{metric.label}</span>
              <div className={`text-[9px] font-bold flex items-center gap-1 ${
                metric.trend.startsWith('+') ? 'text-green-400' : 'text-red-400'
              }`}>
                <TrendingUp className="w-2.5 h-2.5" />
                {metric.trend}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${metric.value > 85 ? 'bg-green-500' : metric.value > 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${metric.value > 85 ? 'text-green-400' : metric.value > 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                {metric.value}
              </span>
            </div>
          </div>
        ))}

        <div className="mt-4 p-3 bg-red-950/20 border border-red-700/40 rounded">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Overall Rating</span>
          </div>
          <div className="text-center">
            <span className="text-3xl font-black text-red-500">
              {Math.floor(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length)}
            </span>
            <span className="text-xs text-zinc-600 ml-1">/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}