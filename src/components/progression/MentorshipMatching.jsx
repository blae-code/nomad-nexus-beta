import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Heart } from 'lucide-react';

export default function MentorshipMatching({ currentMember, allMembers }) {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    generateMentorshipMatches();
  }, [currentMember?.id]);

  const generateMentorshipMatches = async () => {
    setLoading(true);
    try {
      const isMentor = ['COMMANDER', 'VOYAGER'].includes(currentMember.profile?.rank);
      const prompt = isMentor
        ? `Find ideal recruits for ${currentMember.full_name} (${currentMember.profile?.rank}) to mentor.
           
           Analyze these candidates: ${allMembers
             .filter((m) => m.id !== currentMember.id)
             .slice(0, 8)
             .map((m) => `${m.full_name} (${m.profile?.rank || 'VAGRANT'})`)
             .join(', ')}
           
           Recommend 3-4 best matches based on:
           - Rank gap (mentor should be 1-2 ranks higher)
           - Complementary skills
           - Mentee potential and learning capability
           - Time commitment compatibility`
        : `Find experienced mentors for ${currentMember.full_name} (${currentMember.profile?.rank}).
           
           Analyze these experienced members: ${allMembers
             .filter((m) => ['COMMANDER', 'VOYAGER'].includes(m.profile?.rank) && m.id !== currentMember.id)
             .slice(0, 5)
             .map((m) => `${m.full_name} (${m.profile?.rank})`)
             .join(', ')}
           
           Recommend 2-3 best matches based on:
           - Expertise and role compatibility
           - Teaching ability potential
           - Shared mission interests
           - Availability`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            role: { type: 'string' },
            matches: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rank: { type: 'string' },
                  compatibility_score: { type: 'number' },
                  why_match: { type: 'string' },
                  focus_areas: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      });

      setMatches(response);
    } catch (error) {
      console.error('Failed to generate mentorship matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (match) => {
    setConnecting(true);
    try {
      // Create mentorship record or update member profile with mentor/mentee assignment
      setSelectedMatch(match);
      // In a real system, this would save the mentorship relationship
    } catch (error) {
      console.error('Failed to connect mentorship:', error);
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-pink-400 mr-2" />
        <span className="text-zinc-400">Finding mentorship matches...</span>
      </div>
    );
  }

  if (!matches) {
    return <div className="text-center py-8 text-zinc-500">Unable to generate matches</div>;
  }

  const isMentor = matches.role === 'mentor';

  return (
    <div className="space-y-6">
      {/* Role Info */}
      <div className={`p-4 border rounded ${isMentor ? 'bg-purple-950/30 border-purple-600/50' : 'bg-pink-950/30 border-pink-600/50'}`}>
        <div className="text-xs mb-1 font-semibold">
          {isMentor ? '👨‍🏫 YOU ARE A MENTOR' : '👨‍🎓 SEEKING MENTORSHIP'}
        </div>
        <div className={`text-sm font-bold ${isMentor ? 'text-purple-300' : 'text-pink-300'}`}>
          {isMentor
            ? 'Help new recruits develop their skills and grow within the organization'
            : 'Learn from experienced members to accelerate your progression'}
        </div>
      </div>

      {/* Selected Match Details */}
      {selectedMatch && (
        <div className="p-4 bg-green-950/30 border border-green-600/50 rounded space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-white">{selectedMatch.name}</div>
              <div className="text-sm text-green-300">Compatibility: {selectedMatch.compatibility_score}%</div>
            </div>
            <Heart className="w-6 h-6 text-green-400 fill-current" />
          </div>
          <p className="text-sm text-green-200">{selectedMatch.why_match}</p>
          <Button onClick={() => setSelectedMatch(null)} variant="outline" size="sm" className="w-full">
            Clear Selection
          </Button>
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-zinc-400 uppercase">
          {isMentor ? 'Ideal Recruits' : 'Recommended Mentors'}
        </h4>

        {matches.matches?.map((match, idx) => (
          <div
            key={idx}
            className={`p-4 border rounded transition cursor-pointer ${
              selectedMatch?.name === match.name
                ? 'bg-green-950/30 border-green-600/50'
                : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-bold text-white">{match.name}</div>
                <div className="text-xs text-zinc-400">{match.rank}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-blue-400">{match.compatibility_score}%</div>
                <div className="text-xs text-zinc-500">compatibility</div>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-3">{match.why_match}</p>

            {match.focus_areas && match.focus_areas.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-zinc-500 mb-2">Focus Areas:</div>
                <div className="flex flex-wrap gap-1">
                  {match.focus_areas.map((area, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-600/30 text-blue-300 text-xs rounded">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={() => handleConnect(match)}
              disabled={connecting}
              size="sm"
              className="w-full"
              variant={selectedMatch?.name === match.name ? 'default' : 'outline'}
            >
              {connecting ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Connecting...
                </>
              ) : selectedMatch?.name === match.name ? (
                <>
                  <Heart className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  Connect
                </>
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}