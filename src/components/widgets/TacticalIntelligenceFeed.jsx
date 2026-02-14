import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Zap, TrendingUp, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function TacticalIntelligenceFeed({ widgetId, onRemove, isDragging }) {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const logs = await base44.entities.AIAgentLog.list('-created_date', 20);
      setAlerts(logs || []);
    } catch (err) {
      console.error('Alerts load failed:', err);
    }
  };

  const filteredAlerts = alerts.filter(a => 
    filter === 'all' || a.severity === filter.toUpperCase()
  );

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(220,38,38,0.1),transparent_50%)] animate-pulse pointer-events-none" />
      
      {/* Header */}
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Intel Feed</span>
          <Zap className="w-3 h-3 text-orange-500 animate-pulse" />
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 px-3 py-2 bg-zinc-900/40 border-b border-zinc-800/60 flex gap-2 relative z-10">
        {['all', 'high', 'medium', 'low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-2 py-1 rounded text-[9px] uppercase font-bold tracking-wider transition-all ${
              filter === f 
                ? 'bg-red-600 text-white' 
                : 'bg-zinc-800/60 text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative z-10">
        {filteredAlerts.map((alert, i) => {
          const severity = alert.severity?.toLowerCase() || 'low';
          const colors = {
            high: 'border-red-700/60 bg-red-950/30',
            medium: 'border-orange-700/60 bg-orange-950/30',
            low: 'border-zinc-700/60 bg-zinc-900/30'
          };
          
          return (
            <div key={i} className={`p-2 border rounded ${colors[severity]} relative overflow-hidden group`}>
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                severity === 'high' ? 'bg-red-600/10' : 
                severity === 'medium' ? 'bg-orange-600/10' : 'bg-zinc-600/10'
              }`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    {severity === 'high' && <TrendingUp className="w-3 h-3 text-red-500" />}
                    <span className={`text-[9px] uppercase font-bold tracking-wider ${
                      severity === 'high' ? 'text-red-400' :
                      severity === 'medium' ? 'text-orange-400' : 'text-zinc-500'
                    }`}>
                      {severity}
                    </span>
                  </div>
                  <span className="text-[8px] text-zinc-600 flex items-center gap-1">
                    <Clock className="w-2 h-2" />
                    {new Date(alert.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="text-xs text-zinc-300 font-semibold mb-1">{alert.summary}</p>
                {alert.details && (
                  <p className="text-[10px] text-zinc-500 leading-relaxed">{alert.details.substring(0, 100)}...</p>
                )}
              </div>
            </div>
          );
        })}
        
        {filteredAlerts.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <AlertTriangle className="w-8 h-8 text-zinc-800/40 mx-auto" />
            <p className="text-[10px] text-zinc-700 uppercase tracking-wider">No alerts detected</p>
          </div>
        )}
      </div>
    </div>
  );
}