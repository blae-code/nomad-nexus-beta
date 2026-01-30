import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, AlertCircle, Info, Lightbulb, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export default function AIInsightsPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState(null);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadLogs = async () => {
    try {
      const recentLogs = await base44.entities.AIAgentLog.list();
      setLogs(recentLogs || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load AI logs:', error);
      setLogs([]);
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ALERT': return <AlertCircle className="w-4 h-4" />;
      case 'SUGGESTION': return <Lightbulb className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getColors = (severity) => {
    switch (severity) {
      case 'HIGH': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'LOW': return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/30';
    }
  };

  const getAgentLabel = (slug) => {
    const labels = {
      tactical_ai: 'Tactical AI',
      logistics_ai: 'Logistics AI',
      communications_ai: 'Comms AI',
      quartermaster_ai: 'Quartermaster AI'
    };
    return labels[slug] || slug;
  };

  if (loading) {
    return (
      <div className="p-3 text-center">
        <Bot className="w-5 h-5 text-orange-500 animate-pulse mx-auto mb-2" />
        <div className="text-xs text-zinc-500">Loading AI insights...</div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-3 text-center">
        <Bot className="w-5 h-5 text-zinc-600 mx-auto mb-2" />
        <div className="text-xs text-zinc-500">No AI insights yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-2 mb-2">
        <Zap className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">AI Insights</span>
      </div>

      {logs.map((log) => {
        const isExpanded = expandedLog === log.id;
        const colors = getColors(log.severity);
        
        return (
          <div key={log.id} className={`border rounded ${colors} overflow-hidden`}>
            <button
              onClick={() => setExpandedLog(isExpanded ? null : log.id)}
              className="w-full p-2 text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start gap-2">
                {getIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-zinc-500 mb-0.5">
                    {getAgentLabel(log.agent_slug)}
                  </div>
                  <div className="text-xs font-semibold leading-tight mb-1">
                    {log.summary}
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    {new Date(log.created_date).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-3 h-3 flex-shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-3 h-3 flex-shrink-0 mt-1" />
                )}
              </div>
            </button>

            {isExpanded && log.details && (
              <div className="px-2 pb-2 border-t border-current/20">
                <div className="mt-2 text-[10px] space-y-1">
                  {(() => {
                    try {
                      const details = JSON.parse(log.details);
                      return (
                        <>
                          {details.missing_roles && details.missing_roles.length > 0 && (
                            <div>
                              <span className="font-bold">Missing Roles:</span>
                              <div className="text-zinc-400">{details.missing_roles.join(', ')}</div>
                            </div>
                          )}
                          {details.recommended_assets && details.recommended_assets.length > 0 && (
                            <div>
                              <span className="font-bold">Recommended Assets:</span>
                              <div className="text-zinc-400">{details.recommended_assets.join(', ')}</div>
                            </div>
                          )}
                          {details.risks && details.risks.length > 0 && (
                            <div>
                              <span className="font-bold">Risks:</span>
                              {details.risks.map((risk, idx) => (
                                <div key={idx} className="text-zinc-400">• {risk}</div>
                              ))}
                            </div>
                          )}
                          {details.action_items && details.action_items.length > 0 && (
                            <div>
                              <span className="font-bold">Action Items:</span>
                              {details.action_items.map((item, idx) => (
                                <div key={idx} className="text-zinc-400">• {item}</div>
                              ))}
                            </div>
                          )}
                          {details.concerns && details.concerns.length > 0 && (
                            <div>
                              <span className="font-bold">Concerns:</span>
                              {details.concerns.map((concern, idx) => (
                                <div key={idx} className="text-zinc-400">• {concern}</div>
                              ))}
                            </div>
                          )}
                          {details.recommendation && (
                            <div>
                              <span className="font-bold">Recommendation:</span>
                              <div className="text-zinc-400">{details.recommendation}</div>
                            </div>
                          )}
                        </>
                      );
                    } catch {
                      return <div className="text-zinc-400">{log.details}</div>;
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}