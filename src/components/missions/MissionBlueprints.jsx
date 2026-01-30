import { useState } from 'react';
import { Zap, Plus, Copy, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MissionBlueprints = ({ onSelectBlueprint }) => {
  const [blueprints, setBlueprints] = useState([
    {
      id: 'rescue-op',
      name: 'Search & Rescue',
      description: 'Coordinated rescue operation for downed pilots or stranded crew',
      difficulty: 'High',
      roles: ['PILOT', 'MEDIC', 'SCOUT'],
      duration: '2-4 hours',
      template: {
        title: 'Search & Rescue Operation',
        event_type: 'focused',
        priority: 'CRITICAL',
        description: 'Coordinated rescue operation. Roles: Lead (Command), Medic (Support), Pilots (Search)',
        tags: ['Rescue', 'Training', 'PVE'],
      }
    },
    {
      id: 'cargo-haul',
      name: 'Cargo Hauling',
      description: 'Large-scale cargo transport with escort and security',
      difficulty: 'Medium',
      roles: ['PILOT', 'LOGISTICS', 'GUNNER'],
      duration: '3-5 hours',
      template: {
        title: 'Cargo Transport Mission',
        event_type: 'casual',
        priority: 'STANDARD',
        description: 'Cargo hauling mission. Roles: Lead (Command), Hauler (Logistics), Escort (Gunner)',
        tags: ['Industry', 'PVE'],
      }
    },
    {
      id: 'pvp-skirmish',
      name: 'PvP Skirmish',
      description: 'Squad vs squad combat training with rules of engagement',
      difficulty: 'High',
      roles: ['PILOT', 'GUNNER', 'SCOUT'],
      duration: '1-2 hours',
      template: {
        title: 'Squad Combat Training',
        event_type: 'focused',
        priority: 'HIGH',
        description: 'Organized PvP skirmish. All participants briefed on ROE.',
        tags: ['PVP', 'Combat', 'Training'],
      }
    },
    {
      id: 'mining-op',
      name: 'Mining Operation',
      description: 'Asteroid mining with hauling and security escort',
      difficulty: 'Low',
      roles: ['PILOT', 'LOGISTICS', 'SCOUT'],
      duration: '2-3 hours',
      template: {
        title: 'Mining Expedition',
        event_type: 'casual',
        priority: 'STANDARD',
        description: 'Group mining operation. Roles: Miners, Security, Haulers',
        tags: ['Industry', 'PVE'],
      }
    }
  ]);

  const [generating, setGenerating] = useState(false);
  const [customName, setCustomName] = useState('');

  const generateCustomBlueprint = async () => {
    if (!customName) return;
    setGenerating(true);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a mission blueprint for Star Citizen called "${customName}". Return JSON with: name, description (2 sentences), difficulty (Low/Medium/High), roles (array of: PILOT, GUNNER, MEDIC, SCOUT, LOGISTICS, MARINE), duration (e.g. "2-3 hours"), and template with title, event_type (casual/focused), priority (LOW/STANDARD/HIGH/CRITICAL), description, tags (array).`,
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            difficulty: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            duration: { type: 'string' },
            template: { type: 'object' }
          }
        }
      });

      const newBlueprint = {
        id: `custom-${Date.now()}`,
        ...response
      };

      setBlueprints([...blueprints, newBlueprint]);
      setCustomName('');
    } catch (error) {
      console.error('Failed to generate blueprint:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Custom Blueprint Generator */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 p-4 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-bold text-purple-300">AI Blueprint Generator</h3>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Describe your mission idea..."
            className="flex-1 bg-zinc-800 border border-zinc-700 text-white p-2 rounded text-sm"
          />
          <button
            onClick={generateCustomBlueprint}
            disabled={!customName || generating}
            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-bold text-sm disabled:opacity-50 transition"
          >
            {generating ? 'Generating...' : <Plus className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Blueprint Grid */}
      <div className="grid grid-cols-2 gap-4">
        {blueprints.map((bp) => (
          <div
            key={bp.id}
            className="bg-zinc-800/50 border border-zinc-700 hover:border-orange-500/50 rounded-lg p-4 transition cursor-pointer group"
            onClick={() => onSelectBlueprint(bp.template)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-bold text-white group-hover:text-orange-400 transition">{bp.name}</h4>
                <p className="text-xs text-zinc-400 mt-1">{bp.description}</p>
              </div>
              <Copy className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 transition ml-2 flex-shrink-0" />
            </div>

            <div className="space-y-2 mt-3">
              <div className="flex gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                  bp.difficulty === 'Low' ? 'bg-green-500/20 text-green-400' :
                  bp.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {bp.difficulty}
                </span>
                <span className="text-[10px] text-zinc-400 px-2 py-1">{bp.duration}</span>
              </div>

              <div className="text-[10px] text-zinc-500">
                <strong>Roles:</strong> {bp.roles.join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MissionBlueprints;