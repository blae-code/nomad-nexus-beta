import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const PRESET_BLUEPRINTS = [
  {
    title: 'Combat Assault',
    description: 'High-intensity combat operation with squad coordination',
    tags: ['PVP', 'Combat', 'Squad'],
    objectives: [
      { text: 'Establish forward operating base', is_completed: false },
      { text: 'Eliminate hostile targets', is_completed: false },
      { text: 'Secure objective area', is_completed: false },
    ],
  },
  {
    title: 'Rescue Mission',
    description: 'Search and rescue operation in hostile territory',
    tags: ['Rescue', 'Tactical', 'Urgent'],
    objectives: [
      { text: 'Locate missing personnel', is_completed: false },
      { text: 'Establish perimeter', is_completed: false },
      { text: 'Extract and exfil', is_completed: false },
    ],
  },
  {
    title: 'Industrial Cargo Run',
    description: 'Transport valuable cargo across secure route',
    tags: ['Industry', 'Logistics', 'Trading'],
    objectives: [
      { text: 'Load cargo at origin', is_completed: false },
      { text: 'Navigate to destination', is_completed: false },
      { text: 'Unload and secure payment', is_completed: false },
    ],
  },
  {
    title: 'Training Scenario',
    description: 'Low-pressure training for new recruits',
    tags: ['Training', 'Education', 'Casual'],
    objectives: [
      { text: 'Conduct briefing', is_completed: false },
      { text: 'Execute training drill', is_completed: false },
      { text: 'Debrief and assess', is_completed: false },
    ],
  },
];

export default function MissionBlueprints({ onSelectBlueprint }) {
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatingCustom, setGeneratingCustom] = useState(false);

  const handleSelectPreset = (blueprint) => {
    onSelectBlueprint({
      title: blueprint.title,
      description: blueprint.description,
      tags: blueprint.tags,
      objectives: blueprint.objectives,
      event_type: 'focused',
      priority: 'STANDARD',
    });
  };

  const handleGenerateCustom = async () => {
    if (!customPrompt.trim()) return;

    setGeneratingCustom(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a mission blueprint for Star Citizen operations based on this requirement: "${customPrompt}". 
        
        Respond with a JSON object (no markdown, just raw JSON) with:
        {
          "title": "mission name",
          "description": "brief description",
          "tags": ["tag1", "tag2"],
          "objectives": [
            {"text": "objective 1", "is_completed": false},
            {"text": "objective 2", "is_completed": false}
          ]
        }`,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            objectives: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                  is_completed: { type: 'boolean' },
                },
              },
            },
          },
        },
      });

      onSelectBlueprint({
        ...response,
        event_type: 'focused',
        priority: 'STANDARD',
      });
    } catch (error) {
      console.error('Error generating blueprint:', error);
    } finally {
      setGeneratingCustom(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preset Blueprints */}
      <div>
        <h3 className="text-sm font-bold text-orange-400 uppercase mb-4">Preset Blueprints</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRESET_BLUEPRINTS.map((blueprint, idx) => (
            <div
              key={idx}
              className="bg-zinc-800/50 border border-zinc-700 rounded p-4 hover:border-orange-500/50 transition cursor-pointer"
              onClick={() => handleSelectPreset(blueprint)}
            >
              <h4 className="font-bold text-white mb-2">{blueprint.title}</h4>
              <p className="text-xs text-zinc-400 mb-3">{blueprint.description}</p>
              <div className="flex gap-1 flex-wrap mb-3">
                {blueprint.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-orange-500/20 text-orange-300 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-500">{blueprint.objectives.length} objectives</p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Blueprint Generator */}
      <div className="border-t border-zinc-700 pt-6">
        <h3 className="text-sm font-bold text-purple-400 uppercase mb-4">Generate Custom Blueprint</h3>
        <div className="space-y-3">
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Describe your operation: e.g., 'A three-squad assault on an Org mining site with air support and extraction plan'"
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-orange-500 focus:outline-none"
            rows={3}
            disabled={generatingCustom}
          />
          <Button
            onClick={handleGenerateCustom}
            disabled={!customPrompt.trim() || generatingCustom}
            className="w-full"
          >
            {generatingCustom ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              '✨ Generate Custom Blueprint'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}