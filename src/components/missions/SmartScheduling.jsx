import { useState, useEffect } from 'react';
import { Calendar, Brain, Users, Zap, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const SmartScheduling = ({ onScheduleSelected }) => {
  const [members, setMembers] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [minParticipants, setMinParticipants] = useState(5);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [users, events] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Event.list(),
      ]);
      setMembers(users);
      setPastEvents(events.filter(e => e.status === 'completed' || e.status === 'active'));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const analyzeMemberAvailability = async () => {
    setAnalyzing(true);

    try {
      // Analyze member activity patterns and availability
      const memberStats = members.map(m => ({
        id: m.id,
        name: m.full_name,
        participations: pastEvents.filter(e => e.assigned_user_ids?.includes(m.id)).length,
        lastSeen: m.last_seen || null,
      }));

      // Use AI to suggest optimal times
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on ${members.length} team members with varying activity patterns, analyze availability and suggest 5 optimal operation times for the next 7 days. Consider: (1) member participation history (${memberStats.map(m => `${m.name}: ${m.participations} ops`).join(', ')}), (2) typical engagement patterns, (3) timezone diversity. Return JSON with array of suggestions, each with: dayOfWeek (0-6), time24h (e.g. "19:00"), reason (why optimal), expectedTurnout (number), confidence (0-100).`,
        response_json_schema: {
          type: 'object',
          properties: {
            suggestions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dayOfWeek: { type: 'integer' },
                  time24h: { type: 'string' },
                  reason: { type: 'string' },
                  expectedTurnout: { type: 'integer' },
                  confidence: { type: 'integer' }
                }
              }
            }
          }
        }
      });

      setSuggestions(response.suggestions || []);
    } catch (error) {
      console.error('Failed to analyze availability:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getDayName = (dayOfWeek) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  };

  const selectSuggestion = (suggestion) => {
    const now = new Date();
    const daysUntil = (suggestion.dayOfWeek - now.getDay() + 7) % 7 || 7;
    const scheduledDate = new Date(now);
    scheduledDate.setDate(scheduledDate.getDate() + daysUntil);
    
    const [hours, minutes] = suggestion.time24h.split(':');
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0);

    onScheduleSelected({
      start_time: scheduledDate.toISOString(),
      expectedTurnout: suggestion.expectedTurnout,
    });
  };

  return (
    <div className="space-y-6">
      {/* Analysis Settings */}
      <div className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-blue-300">Analyze Team Availability</h3>
        </div>
        
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-zinc-400 block mb-1">Minimum Participants</label>
            <input
              type="number"
              min="1"
              max={members.length}
              value={minParticipants}
              onChange={(e) => setMinParticipants(Math.min(members.length, Math.max(1, parseInt(e.target.value))))}
              className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
            />
          </div>
          
          <button
            onClick={analyzeMemberAvailability}
            disabled={analyzing}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50 transition"
          >
            {analyzing ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        <div className="flex gap-2 mt-2 text-xs text-zinc-400">
          <Users className="w-3 h-3 flex-shrink-0 mt-0.5" />
          <span>{members.length} active members • {pastEvents.length} completed ops</span>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white">Recommended Operation Times</h4>
          {suggestions.map((suggestion, idx) => (
            <div
              key={idx}
              onClick={() => selectSuggestion(suggestion)}
              className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 hover:border-orange-500/50 p-4 rounded-lg cursor-pointer transition group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="font-bold text-white">{getDayName(suggestion.dayOfWeek)} {suggestion.time24h}</span>
                  </div>
                  <p className="text-xs text-zinc-300 ml-6">{suggestion.reason}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-green-400">{suggestion.confidence}%</div>
                  <div className="text-[10px] text-zinc-500">confidence</div>
                </div>
              </div>

              <div className="flex gap-4 ml-6 text-xs">
                <div>
                  <span className="text-zinc-400">Expected:</span>
                  <span className="font-bold text-cyan-400 ml-1">{suggestion.expectedTurnout}+ members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : analyzing ? (
        <div className="p-6 text-center text-zinc-400 flex items-center justify-center gap-2">
          <div className="animate-spin">
            <Zap className="w-4 h-4" />
          </div>
          Analyzing team patterns...
        </div>
      ) : (
        <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Click "Analyze" to get smart scheduling suggestions
        </div>
      )}
    </div>
  );
};

export default SmartScheduling;