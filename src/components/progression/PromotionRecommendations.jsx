import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, CheckCircle } from 'lucide-react';

const RANK_HIERARCHY = ['VAGRANT', 'SCOUT', 'VOYAGER', 'COMMANDER'];

export default function PromotionRecommendations({ member, onMemberUpdate }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    generatePromotionRecommendation();
  }, [member?.id]);

  const generatePromotionRecommendation = async () => {
    setLoading(true);
    try {
      const events = await base44.entities.Event.list('-start_time', 100);
      const memberEvents = events.filter((e) => e.assigned_user_ids?.includes(member.id));

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a promotion recommendation for this organization member:

        Member: ${member.full_name}
        Callsign: ${member.profile?.callsign || 'N/A'}
        Current Rank: ${member.profile?.rank || 'VAGRANT'}
        Current Roles: ${member.profile?.roles?.join(', ') || 'None'}
        Operations Participated: ${memberEvents.length}
        Member Since: ${Math.floor((Date.now() - new Date(member.created_date)) / (1000 * 60 * 60 * 24))} days

        Analyze and determine:
        1. Should they be promoted? (YES/NO)
        2. If YES, to what rank? (SCOUT, VOYAGER, COMMANDER based on progression)
        3. Promotion readiness score (0-100)
        4. Key strengths supporting promotion
        5. Areas needing improvement before promotion
        6. Recommended actions before promotion

        Format as JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            should_promote: { type: 'boolean' },
            recommended_rank: { type: 'string' },
            readiness_score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            improvement_areas: { type: 'array', items: { type: 'string' } },
            actions_before_promotion: { type: 'array', items: { type: 'string' } },
            reasoning: { type: 'string' },
          },
        },
      });

      setRecommendation(response);
    } catch (error) {
      console.error('Failed to generate promotion recommendation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!recommendation?.should_promote || !recommendation?.recommended_rank) return;

    setPromoting(true);
    try {
      const profile = await base44.entities.MemberProfile.filter({ user_id: member.id });
      if (profile.length > 0) {
        await base44.entities.MemberProfile.update(profile[0].id, {
          rank: recommendation.recommended_rank,
        });
        onMemberUpdate();
      }
    } catch (error) {
      console.error('Failed to promote member:', error);
    } finally {
      setPromoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mr-2" />
        <span className="text-zinc-400">Analyzing promotion readiness...</span>
      </div>
    );
  }

  if (!recommendation) {
    return <div className="text-center py-8 text-zinc-500">Unable to generate recommendation</div>;
  }

  return (
    <div className="space-y-6">
      {/* Readiness Score */}
      <div className={`p-6 border rounded ${recommendation.should_promote ? 'bg-green-950/30 border-green-600/50' : 'bg-yellow-950/30 border-yellow-600/50'}`}>
        <div className="flex items-end gap-4">
          <div>
            <div className="text-xs text-gray-300 mb-2">PROMOTION READINESS</div>
            <div className={`text-5xl font-black ${recommendation.should_promote ? 'text-green-400' : 'text-yellow-400'}`}>
              {recommendation.readiness_score}
            </div>
            <div className="text-xs text-gray-400 mt-1">/100</div>
          </div>
          <div className="flex-1 bg-zinc-800 rounded h-2 overflow-hidden">
            <div
              className={recommendation.should_promote ? 'bg-green-600' : 'bg-yellow-600'}
              style={{ width: `${recommendation.readiness_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {recommendation.should_promote && recommendation.recommended_rank && (
        <div className="p-4 bg-green-950/30 border border-green-600/50 rounded space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-green-400 mb-1">PROMOTION ELIGIBLE</div>
              <div className="text-xl font-black text-green-300">{member.profile?.rank} → {recommendation.recommended_rank}</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <Button onClick={handlePromote} disabled={promoting} className="w-full">
            {promoting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {promoting ? 'Promoting...' : 'Execute Promotion'}
          </Button>
        </div>
      )}

      {/* Reasoning */}
      <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
        <div className="text-xs text-zinc-400 mb-2">ANALYSIS</div>
        <p className="text-sm text-zinc-300">{recommendation.reasoning}</p>
      </div>

      {/* Strengths */}
      {recommendation.strengths?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-green-400 uppercase flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Promotion Strengths
          </h4>
          <div className="space-y-2">
            {recommendation.strengths.map((strength, idx) => (
              <div key={idx} className="p-3 bg-green-950/20 border border-green-600/30 rounded text-sm text-green-300">
                ✓ {strength}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement Areas */}
      {recommendation.improvement_areas?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-yellow-400 uppercase">Areas for Improvement</h4>
          <div className="space-y-2">
            {recommendation.improvement_areas.map((area, idx) => (
              <div key={idx} className="p-3 bg-yellow-950/20 border border-yellow-600/30 rounded text-sm text-yellow-300">
                • {area}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Before Promotion */}
      {recommendation.actions_before_promotion?.length > 0 && (
        <div className="space-y-2 border-t border-zinc-700 pt-6">
          <h4 className="text-sm font-bold text-blue-400 uppercase">Recommended Actions</h4>
          <div className="space-y-2">
            {recommendation.actions_before_promotion.map((action, idx) => (
              <div key={idx} className="p-3 bg-blue-950/20 border border-blue-600/30 rounded text-sm text-blue-300">
                → {action}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}