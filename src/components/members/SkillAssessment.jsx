import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getDisplayCallsign } from '@/utils';
import { Loader2, Zap } from 'lucide-react';

export default function SkillAssessment({ member, participationHistory }) {
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSkillAssessment();
  }, [member.id]);

  const generateSkillAssessment = async () => {
    setLoading(true);
    try {
      const operationCount = participationHistory.length;
      const memberSince = member.created_date
        ? Math.floor((Date.now() - new Date(member.created_date)) / (1000 * 60 * 60 * 24))
        : 0;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Assess the operational skills and performance profile of a Star Citizen organization member based on this data:

        Member: ${member.full_name}
        Callsign: ${getDisplayCallsign(member.profile) || 'N/A'}
        Rank: ${member.profile?.rank || 'VAGRANT'}
        Member Since: ${memberSince} days
        Operations Participated: ${operationCount}
        Assigned Roles: ${member.profile?.roles?.join(', ') || 'None'}
        ${participationHistory.length > 0 ? `Recent Operations:\n${participationHistory.slice(0, 5).map((e) => `- ${e.title} (${e.status})`).join('\n')}` : ''}

        Provide a comprehensive skill assessment with:
        1. Overall competency rating (1-10)
        2. Key strengths (list 3-4)
        3. Areas for development
        4. Recommended roles based on performance
        5. Training suggestions
        
        Format as JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            competency_rating: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            development_areas: { type: 'array', items: { type: 'string' } },
            recommended_roles: { type: 'array', items: { type: 'string' } },
            training_suggestions: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      setAssessment(response);
    } catch (error) {
      console.error('Failed to generate assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCompetencyColor = (rating) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 6) return 'text-blue-400';
    if (rating >= 4) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const getCompetencyBg = (rating) => {
    if (rating >= 8) return 'bg-green-950/30 border-green-600/50';
    if (rating >= 6) return 'bg-blue-950/30 border-blue-600/50';
    if (rating >= 4) return 'bg-yellow-950/30 border-yellow-600/50';
    return 'bg-orange-950/30 border-orange-600/50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-2" />
        <span className="text-zinc-400">Analyzing member performance...</span>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Unable to generate skill assessment
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competency Rating */}
      <div className={`p-6 border rounded ${getCompetencyBg(assessment.competency_rating)}`}>
        <div className="flex items-end gap-4">
          <div>
            <div className="text-xs text-zinc-400 mb-2">OVERALL COMPETENCY</div>
            <div className={`text-5xl font-black ${getCompetencyColor(assessment.competency_rating)}`}>
              {assessment.competency_rating}
            </div>
            <div className="text-xs text-zinc-500 mt-1">/10.0</div>
          </div>
          <div className="flex-1 bg-zinc-800 rounded h-2 overflow-hidden">
            <div
              className={`h-full ${getCompetencyColor(assessment.competency_rating).replace('text-', 'bg-')}`}
              style={{ width: `${(assessment.competency_rating / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Strengths */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-green-400 uppercase flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Key Strengths
        </h4>
        <div className="space-y-2">
          {assessment.strengths.map((strength, idx) => (
            <div key={idx} className="p-3 bg-green-950/30 border border-green-600/50 rounded text-sm text-green-300">
              • {strength}
            </div>
          ))}
        </div>
      </div>

      {/* Development Areas */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-yellow-400 uppercase">Areas for Development</h4>
        <div className="space-y-2">
          {assessment.development_areas.map((area, idx) => (
            <div key={idx} className="p-3 bg-yellow-950/30 border border-yellow-600/50 rounded text-sm text-yellow-300">
              • {area}
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Roles */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-blue-400 uppercase">Recommended Roles</h4>
        <div className="flex flex-wrap gap-2">
          {assessment.recommended_roles.map((role, idx) => (
            <span
              key={idx}
              className="px-3 py-2 bg-blue-600/30 border border-blue-500/50 rounded text-xs font-bold text-blue-300"
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Training Suggestions */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-purple-400 uppercase">Training Suggestions</h4>
        <div className="space-y-2">
          {assessment.training_suggestions.map((suggestion, idx) => (
            <div key={idx} className="p-3 bg-purple-950/30 border border-purple-600/50 rounded text-sm text-purple-300">
              • {suggestion}
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div className="text-xs text-zinc-500 border-t border-zinc-700 pt-4">
        Assessment based on {participationHistory.length} operations and member profile data
      </div>
    </div>
  );
}
