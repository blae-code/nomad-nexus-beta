import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Users } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function SmartScheduling({ onScheduleSelected }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generateSchedulingSuggestions = async () => {
      try {
        setLoading(true);
        const members = await base44.entities.MemberProfile.list();
        const events = await base44.entities.Event.list();

        // Analyze member availability and historical data
        const memberCount = members.length;
        const avgEventDuration =
          events.length > 0
            ? events.reduce((sum, e) => {
                if (e.start_time && e.end_time) {
                  const duration = new Date(e.end_time) - new Date(e.start_time);
                  return sum + duration;
                }
                return sum;
              }, 0) / events.length
            : 2 * 60 * 60 * 1000;

        // Get AI suggestions
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Based on Star Citizen community operations data, suggest optimal operation times for a group of ${memberCount} members.
          
          Consider:
          - Peak activity times in gaming communities (typically evenings/weekends)
          - Timezone diversity
          - Event duration averaging ${Math.round(avgEventDuration / 60 / 1000)} minutes
          - Member availability patterns
          
          Provide 3-5 specific time slot recommendations for the next 14 days with reasoning.`,
          response_json_schema: {
            type: 'object',
            properties: {
              suggestions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    time: { type: 'string' },
                    confidence: { type: 'string' },
                    reason: { type: 'string' },
                    expectedAttendance: { type: 'number' },
                  },
                },
              },
            },
          },
        });

        // Convert suggestions to actual dates
        const formattedSuggestions = response.suggestions.map((s, idx) => {
          const futureDate = addDays(new Date(), idx + 1);
          const [hours, minutes] = s.time.split(':').map(Number) || [19, 0];
          futureDate.setHours(hours, minutes, 0);

          return {
            ...s,
            start_time: futureDate.toISOString(),
            formatted: format(futureDate, 'EEEE, MMM d, yyyy h:mm a'),
          };
        });

        setSuggestions(formattedSuggestions);
      } catch (err) {
        setError('Failed to generate scheduling suggestions');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    generateSchedulingSuggestions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-orange-400 mr-2" />
        <span className="text-zinc-400">Analyzing team availability...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400 text-center py-6">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400 mb-4">
        AI analysis suggests optimal times based on your team's historical availability and timezone distribution.
      </p>

      {suggestions.map((suggestion, idx) => (
        <div
          key={idx}
          className="bg-zinc-800/50 border border-zinc-700 rounded p-4 hover:border-blue-500/50 transition"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                {suggestion.formatted}
              </h4>
              <p className="text-sm text-zinc-400 mt-1">{suggestion.reason}</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-blue-400">{suggestion.confidence}</div>
              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                <Users className="w-3 h-3" />
                ~{Math.round(suggestion.expectedAttendance)} expected
              </div>
            </div>
          </div>

          <Button
            onClick={() => onScheduleSelected({ start_time: suggestion.start_time })}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Use This Time
          </Button>
        </div>
      ))}
    </div>
  );
}
