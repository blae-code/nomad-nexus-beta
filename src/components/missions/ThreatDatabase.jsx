import { useState, useEffect } from 'react';
import { AlertTriangle, Zap, Shield, TrendingUp, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ThreatDatabase = () => {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');

  useEffect(() => {
    loadThreats();
  }, []);

  const loadThreats = async () => {
    setLoading(true);
    try {
      // Generate threat intelligence using AI
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a threat database for Star Citizen operations with 8 known hostile entities/sectors. Return JSON array with objects containing: name (entity/faction/pirate group name), type (NPC_FACTION|PIRATE_GROUP|ANOMALY|HAZARD), threatLevel (LOW|MEDIUM|HIGH|CRITICAL), location (space region/sector), description (2 sentences), capabilities (array: COMBAT|EW|STEALTH|COORDINATED_SWARMS), knownWeapons (array), lastSighted (date string), operationalStatus (ACTIVE|DORMANT|CONTAINED).`,
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
                  threatLevel: { type: 'string' },
                  location: { type: 'string' },
                  description: { type: 'string' },
                  capabilities: { type: 'array', items: { type: 'string' } },
                  knownWeapons: { type: 'array', items: { type: 'string' } },
                  lastSighted: { type: 'string' },
                  operationalStatus: { type: 'string' }
                }
              }
            }
          }
        }
      });

      setThreats(response.threats || []);
    } catch (error) {
      console.error('Failed to load threat database:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatColor = (level) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'HIGH': return 'text-orange-500 bg-orange-500/20 border-orange-500/30';
      case 'MEDIUM': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
      case 'LOW': return 'text-green-500 bg-green-500/20 border-green-500/30';
      default: return 'text-zinc-500 bg-zinc-500/20 border-zinc-500/30';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'NPC_FACTION': return '👾';
      case 'PIRATE_GROUP': return '🏴';
      case 'ANOMALY': return '⚡';
      case 'HAZARD': return '⚠️';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    return status === 'ACTIVE' ? 'text-red-400' : status === 'DORMANT' ? 'text-yellow-400' : 'text-green-400';
  };

  const filtered = threats.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterLevel === 'all' || t.threatLevel === filterLevel;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-red-300">Threat Intelligence Database</h3>
          </div>
          <button
            onClick={loadThreats}
            disabled={loading}
            className="text-xs bg-red-600/40 hover:bg-red-600/60 text-red-300 px-3 py-1 rounded transition disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              placeholder="Search threats or sectors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-700 text-white pl-8 pr-3 py-1.5 rounded text-sm"
            />
          </div>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-zinc-900/50 border border-zinc-700 text-white px-3 py-1.5 rounded text-sm"
          >
            <option value="all">All Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Threats Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-8 text-zinc-400">
          <Zap className="w-4 h-4 mr-2 animate-spin" />
          Analyzing threat intelligence...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filtered.map((threat, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-3 bg-zinc-900/40 transition hover:bg-zinc-900/60 ${getThreatColor(threat.threatLevel).split(' ')[2]}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getTypeIcon(threat.type)}</span>
                    <div>
                      <div className="font-bold text-white text-sm">{threat.name}</div>
                      <div className="text-[10px] text-zinc-400">{threat.type.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                </div>
                <div className={`text-[10px] font-bold px-2 py-1 rounded border ${getThreatColor(threat.threatLevel)}`}>
                  {threat.threatLevel}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-zinc-300 mb-2 line-clamp-2">{threat.description}</p>

              {/* Location & Status */}
              <div className="flex items-center justify-between text-[10px] mb-2">
                <div className="text-zinc-400">
                  <span className="text-zinc-500">Sector:</span> {threat.location}
                </div>
                <div className={`font-bold ${getStatusColor(threat.operationalStatus)}`}>
                  {threat.operationalStatus}
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-2">
                <div className="text-[10px] text-zinc-500 mb-1">Capabilities:</div>
                <div className="flex flex-wrap gap-1">
                  {threat.capabilities.slice(0, 3).map((cap, i) => (
                    <span key={i} className="text-[9px] bg-zinc-700/50 text-zinc-300 px-1.5 py-0.5 rounded">
                      {cap}
                    </span>
                  ))}
                  {threat.capabilities.length > 3 && (
                    <span className="text-[9px] text-zinc-500">+{threat.capabilities.length - 3}</span>
                  )}
                </div>
              </div>

              {/* Last Sighted */}
              <div className="text-[10px] text-zinc-500 border-t border-zinc-700/50 pt-1.5">
                Last sighted: {new Date(threat.lastSighted).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-6 text-center text-zinc-400 text-sm">
          No threats match your search
        </div>
      )}

      {/* Summary Stats */}
      {threats.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pt-4 border-t border-zinc-700">
          <div className="bg-zinc-800/50 p-2 rounded text-center">
            <div className="text-xs text-zinc-400">Total Threats</div>
            <div className="font-bold text-orange-400">{threats.length}</div>
          </div>
          <div className="bg-zinc-800/50 p-2 rounded text-center">
            <div className="text-xs text-zinc-400">Active</div>
            <div className="font-bold text-red-400">{threats.filter(t => t.operationalStatus === 'ACTIVE').length}</div>
          </div>
          <div className="bg-zinc-800/50 p-2 rounded text-center">
            <div className="text-xs text-zinc-400">Contained</div>
            <div className="font-bold text-green-400">{threats.filter(t => t.operationalStatus === 'CONTAINED').length}</div>
          </div>
          <div className="bg-zinc-800/50 p-2 rounded text-center">
            <div className="text-xs text-zinc-400">Critical</div>
            <div className="font-bold text-red-500">{threats.filter(t => t.threatLevel === 'CRITICAL').length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreatDatabase;