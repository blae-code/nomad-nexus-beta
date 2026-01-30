import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, BarChart3 } from 'lucide-react';

export default function PostEventAnalysis({ event }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generatePostEventAnalysis();
  }, [event?.id]);

  const generatePostEventAnalysis = async () => {
    setLoading(true);
    try {
      let additionalContext = '';

      if (event.id) {
        try {
          const reports = await base44.entities.EventReport.filter({ event_id: event.id }, '-created_date', 5);
          if (reports.length > 0) {
            additionalContext = `\nAvailable Reports:\n${reports.map((r) => `- ${r.summary}`).join('\n')}`;
          }
        } catch {
          // No reports available yet
        }
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a post-operation analysis report for this Star Citizen mission:

        Operation: ${event.title}
        Type: ${event.event_type}
        Status: ${event.status}
        Duration: ${event.end_time ? Math.round((new Date(event.end_time) - new Date(event.start_time)) / 1000 / 60) : 'N/A'} minutes
        Participants: ${event.assigned_user_ids?.length || 0}
        Assets Deployed: ${event.assigned_asset_ids?.length || 0}
        Priority: ${event.priority}
        ${additionalContext}

        Provide a comprehensive preliminary analysis including:
        1. Mission Success Metrics (completion status, objectives achieved)
        2. Key Performance Indicators (participation rate, mission duration efficiency, asset utilization)
        3. Personnel Performance Summary (team coordination, response time, skill execution)
        4. Resource Utilization (asset effectiveness, deployment efficiency)
        5. Incident Summary (issues encountered, critical moments)
        6. Lessons Learned (what went well, improvement areas)
        7. Recommendations (follow-up actions, training focus)

        Format as structured JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            success_metrics: { type: 'object', properties: { completion_status: { type: 'string' }, objectives_achieved: { type: 'number' }, overall_success_rate: { type: 'number' } } },
            kpis: { type: 'object', properties: { participation_rate: { type: 'number' }, duration_efficiency: { type: 'string' }, asset_utilization: { type: 'string' } } },
            personnel_performance: { type: 'array', items: { type: 'string' } },
            resource_utilization: { type: 'array', items: { type: 'string' } },
            incidents: { type: 'array', items: { type: 'string' } },
            lessons_learned: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      setAnalysis(response);
    } catch (error) {
      console.error('Failed to generate post-event analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mr-2" />
        <span className="text-zinc-400">Generating post-event analysis...</span>
      </div>
    );
  }

  if (!analysis) {
    return <div className="text-center py-8 text-zinc-500 text-sm">Unable to generate analysis</div>;
  }

  return (
    <div className="space-y-6">
      {/* Success Metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 bg-green-950/30 border border-green-600/50 rounded">
          <div className="text-xs text-green-400 mb-1">COMPLETION STATUS</div>
          <div className="text-2xl font-black text-green-300">{analysis.success_metrics?.completion_status || 'N/A'}</div>
        </div>
        <div className="p-4 bg-blue-950/30 border border-blue-600/50 rounded">
          <div className="text-xs text-blue-400 mb-1">OBJECTIVES ACHIEVED</div>
          <div className="text-2xl font-black text-blue-300">{analysis.success_metrics?.objectives_achieved || 0}</div>
        </div>
        <div className="p-4 bg-purple-950/30 border border-purple-600/50 rounded">
          <div className="text-xs text-purple-400 mb-1">SUCCESS RATE</div>
          <div className="text-2xl font-black text-purple-300">{Math.round(analysis.success_metrics?.overall_success_rate || 0)}%</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-orange-400 uppercase flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Key Performance Indicators
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {analysis.kpis?.participation_rate && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded text-center">
              <div className="text-xs text-zinc-400">Participation</div>
              <div className="text-lg font-bold text-orange-400 mt-1">{Math.round(analysis.kpis.participation_rate)}%</div>
            </div>
          )}
          {analysis.kpis?.duration_efficiency && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded text-center">
              <div className="text-xs text-zinc-400">Duration</div>
              <div className="text-sm font-bold text-orange-400 mt-1">{analysis.kpis.duration_efficiency}</div>
            </div>
          )}
          {analysis.kpis?.asset_utilization && (
            <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded text-center">
              <div className="text-xs text-zinc-400">Asset Use</div>
              <div className="text-sm font-bold text-orange-400 mt-1">{analysis.kpis.asset_utilization}</div>
            </div>
          )}
        </div>
      </div>

      {/* Personnel Performance */}
      {analysis.personnel_performance?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-blue-400 uppercase">Personnel Performance</h4>
          <div className="space-y-2">
            {analysis.personnel_performance.map((perf, idx) => (
              <div key={idx} className="p-3 bg-blue-950/20 border border-blue-600/30 rounded text-sm text-blue-300">
                • {perf}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incidents */}
      {analysis.incidents?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-red-400 uppercase">Incidents & Issues</h4>
          <div className="space-y-2">
            {analysis.incidents.map((incident, idx) => (
              <div key={idx} className="p-3 bg-red-950/20 border border-red-600/30 rounded text-sm text-red-300">
                ⚠ {incident}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lessons Learned */}
      {analysis.lessons_learned?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-yellow-400 uppercase">Lessons Learned</h4>
          <div className="space-y-2">
            {analysis.lessons_learned.map((lesson, idx) => (
              <div key={idx} className="p-3 bg-yellow-950/20 border border-yellow-600/30 rounded text-sm text-yellow-300">
                ✓ {lesson}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div className="space-y-2 border-t border-zinc-700 pt-6">
          <h4 className="text-sm font-bold text-green-400 uppercase">Recommendations</h4>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <div key={idx} className="p-3 bg-green-950/20 border border-green-600/30 rounded text-sm text-green-300">
                → {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}