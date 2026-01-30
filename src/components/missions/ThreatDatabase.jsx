import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle, Shield } from 'lucide-react';

const THREAT_DATABASE = {
  pirates: [
    {
      faction: 'Cutlass Crime Ring',
      threat_level: 'HIGH',
      sectors: ['Stanton', 'Pyro'],
      capabilities: ['Drake Cutlass Black', 'Coordinated ambush', 'Boarding tactics'],
      countermeasures: 'Travel in groups, maintain comms discipline',
    },
    {
      faction: 'Vanduul Raiders',
      threat_level: 'CRITICAL',
      sectors: ['Far Reach', 'Deep Space'],
      capabilities: ['Military-grade fighters', 'Superior firepower', 'Organized attacks'],
      countermeasures: 'Avoid sector entirely or travel with military escort',
    },
    {
      faction: 'Org Bounty Hunters',
      threat_level: 'MEDIUM',
      sectors: ['UEE Space', 'Lawless Zones'],
      capabilities: ['Specialized hunting gear', 'Target tracking', 'Precision strikes'],
      countermeasures: 'Maintain low profile, use safe passage agreements',
    },
  ],
  environmental: [
    {
      name: 'Electromagnetic Storms',
      threat_level: 'MEDIUM',
      sectors: ['Crusader', 'Yela Orbit'],
      capabilities: ['Navigation disruption', 'Comms interference'],
      countermeasures: 'Minimize flight time, use emergency beacons',
    },
    {
      name: 'Asteroid Field Hazards',
      threat_level: 'LOW',
      sectors: ['Belt of Fire', 'Caliban'],
      capabilities: ['Collision damage', 'Navigation hazards'],
      countermeasures: 'Reduce speed, use scanning equipment',
    },
  ],
};

export default function ThreatDatabase({ selectedLocation }) {
  const [threats, setThreats] = useState([]);
  const [activeTab, setActiveTab] = useState('pirates');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const analyzeThreat = async () => {
      if (!selectedLocation) {
        setThreats(THREAT_DATABASE[activeTab]);
        return;
      }

      setAnalyzing(true);
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `Based on Star Citizen lore and operational security, analyze threats specific to the "${selectedLocation}" sector/location. 
          
          Consider known hostile factions, environmental hazards, and tactical risks. 
          Provide threat assessment with countermeasures.`,
          response_json_schema: {
            type: 'object',
            properties: {
              threats: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    threat_level: { type: 'string' },
                    capabilities: { type: 'array', items: { type: 'string' } },
                    countermeasures: { type: 'string' },
                  },
                },
              },
            },
          },
        });

        setThreats(response.threats || THREAT_DATABASE[activeTab]);
      } catch (err) {
        setThreats(THREAT_DATABASE[activeTab]);
      } finally {
        setAnalyzing(false);
      }
    };

    analyzeThreat();
  }, [selectedLocation, activeTab]);

  const getThreatColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-600 bg-red-950/20';
      case 'HIGH':
        return 'border-orange-600 bg-orange-950/20';
      case 'MEDIUM':
        return 'border-yellow-600 bg-yellow-950/20';
      default:
        return 'border-green-600 bg-green-950/20';
    }
  };

  const getThreatBadgeColor = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-red-600 text-white';
      case 'HIGH':
        return 'bg-orange-600 text-white';
      case 'MEDIUM':
        return 'bg-yellow-600 text-white';
      default:
        return 'bg-green-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-zinc-700">
        {['pirates', 'environmental'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-bold uppercase transition ${
              activeTab === tab
                ? 'text-red-400 border-b-2 border-red-500'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab === 'pirates' ? '🏴‍☠️ Hostile Factions' : '⚠️ Environmental'}
          </button>
        ))}
      </div>

      {/* Location Analysis */}
      {selectedLocation && (
        <div className="bg-blue-950/30 border border-blue-600/50 rounded p-4">
          <p className="text-sm text-blue-300">
            🔍 Analyzing threats for: <span className="font-bold">{selectedLocation}</span>
          </p>
        </div>
      )}

      {/* Threats List */}
      {analyzing ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-red-400 mr-2" />
          <span className="text-zinc-400">Scanning threat database...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {threats.map((threat, idx) => (
            <div key={idx} className={`border rounded p-4 ${getThreatColor(threat.threat_level)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <h4 className="font-bold text-white">{threat.faction || threat.name}</h4>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${getThreatBadgeColor(threat.threat_level)}`}>
                  {threat.threat_level}
                </span>
              </div>

              {threat.sectors && (
                <p className="text-xs text-zinc-400 mb-3">
                  <span className="font-semibold">Active Zones:</span> {threat.sectors.join(', ')}
                </p>
              )}

              <div className="space-y-3">
                <div>
                  <h5 className="text-xs font-bold text-orange-300 uppercase mb-2">Capabilities</h5>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    {threat.capabilities.map((cap, i) => (
                      <li key={i}>• {cap}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-black/30 border-l-2 border-green-500 pl-3 py-2">
                  <h5 className="text-xs font-bold text-green-400 uppercase mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Countermeasures
                  </h5>
                  <p className="text-xs text-zinc-300">{threat.countermeasures}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}