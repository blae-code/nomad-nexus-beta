import { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Database, Zap, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ThreatDatabase = ({ selectedLocation }) => {
  const [threats, setThreats] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState(null);
  const [searchLocation, setSearchLocation] = useState(selectedLocation || '');

  const analyzeThreatLevel = async (location) => {
    if (!location) return;
    setAnalyzing(true);

    try {
      // AI analysis of threats in sector
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze the "${location}" sector in Star Citizen for potential threats and hostile entities. Return JSON array of threats, each with: name (entity/faction), type (pirate/hostile faction/environmental hazard), threat_level (LOW/MEDIUM/HIGH/CRITICAL), location (specific area), population (estimated count), tactics (how they attack), recommendations (countermeasures), recentActivity (true/false). Include 3-5 realistic threats.`,
        response_json_schema: {
          type: 'object',
          properties: {
            threats: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  type: { type: 'string' },
                  threat_level: { type: 'string' },
                  location: { type: 'string' },
                  population: { type: 'string' },
                  tactics: { type: 'string' },
                  recommendations: { type: 'string' },
                  recentActivity: { type: 'boolean' }
                }
              }
            }
          }
        }
      });

      setThreats(response.threats || []);
      setSearchLocation(location);
    } catch (error) {
      console.error('Failed to analyze threats:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedLocation && !searchLocation) {
      analyzeThreatLevel(selectedLocation);
    }
  }, [selectedLocation]);

  const getThreatColor = (level) => {
    switch (level) {
      case 'LOW':
        return 'from-green-500/10 to-green-600/5 border-green-500/30 text-green-400';
      case 'MEDIUM':
        return 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/30 text-yellow-400';
      case 'HIGH':
        return 'from-orange-500/10 to-orange-600/5 border-orange-500/30 text-orange-400';
      case 'CRITICAL':
        return 'from-red-500/10 to-red-600/5 border-red-500/30 text-red-400';
      default:
        return 'from-zinc-500/10 to-zinc-600/5 border-zinc-500/30';
    }
  };

  const getThreatIcon = (level) => {
    if (level === 'CRITICAL') return '🚨';
    if (level === 'HIGH') return '⚠️';
    if (level === 'MEDIUM') return '⚡';
    return '📍';
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-red-400" />
          <h3 className="text-sm font-bold text-red-300">Threat Assessment</h3>
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            placeholder="Enter sector name (e.g., Stanton, Crusader)..."
            className="flex-1 bg-zinc-900 border border-zinc-700 text-white p-2 rounded text-sm"
            onKeyDown={(e) => e.key === 'Enter' && analyzeThreatLevel(searchLocation)}
          />
          <button
            onClick={() => analyzeThreatLevel(searchLocation)}
            disabled={analyzing || !searchLocation}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50 transition"
          >
            {analyzing ? 'Scanning...' : <Database className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Threat List */}
      {threats.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Threats in {searchLocation}</h4>
            <span className="text-xs text-zinc-500">{threats.length} identified</span>
          </div>

          {threats.map((threat, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedThreat(selectedThreat?.name === threat.name ? null : threat)}
              className={`p-4 rounded-lg border-2 cursor-pointer transition bg-gradient-to-r ${getThreatColor(threat.threat_level)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-xl">{getThreatIcon(threat.threat_level)}</span>
                  <div>
                    <h5 className="font-bold text-white">{threat.name}</h5>
                    <p className="text-xs text-zinc-300 opacity-80">{threat.type}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    threat.threat_level === 'CRITICAL' ? 'bg-red-500/30' :
                    threat.threat_level === 'HIGH' ? 'bg-orange-500/30' :
                    threat.threat_level === 'MEDIUM' ? 'bg-yellow-500/30' :
                    'bg-green-500/30'
                  }`}>
                    {threat.threat_level}
                  </span>
                  {threat.recentActivity && (
                    <div className="text-[10px] text-red-400 font-bold mt-1">ACTIVE</div>
                  )}
                </div>
              </div>

              {selectedThreat?.name === threat.name && (
                <div className="mt-3 pt-3 border-t border-current/20 space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-400 font-semibold">Location:</span>
                    <span className="text-white ml-2">{threat.location}</span>
                  </div>
                  
                  <div>
                    <span className="text-zinc-400 font-semibold">Strength:</span>
                    <span className="text-white ml-2">{threat.population}</span>
                  </div>
                  
                  <div>
                    <span className="text-zinc-400 font-semibold">Attack Pattern:</span>
                    <p className="text-white mt-1">{threat.tactics}</p>
                  </div>
                  
                  <div className="bg-black/30 p-2 rounded">
                    <span className="text-zinc-400 font-semibold">Countermeasures:</span>
                    <p className="text-white mt-1">{threat.recommendations}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : analyzing ? (
        <div className="p-6 text-center text-zinc-400 flex items-center justify-center gap-2">
          <div className="animate-spin">
            <Zap className="w-4 h-4" />
          </div>
          Scanning sector...
        </div>
      ) : (
        <div className="p-4 bg-zinc-800/30 border border-zinc-700 rounded text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Enter a sector to analyze threats
        </div>
      )}
    </div>
  );
};

export default ThreatDatabase;