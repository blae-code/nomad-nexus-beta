import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, Award } from 'lucide-react';

const SKILL_CATEGORIES = {
  COMBAT: { label: 'Combat', color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-600/50' },
  PILOTING: { label: 'Piloting', color: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-600/50' },
  LOGISTICS: { label: 'Logistics', color: 'text-green-400', bg: 'bg-green-950/30', border: 'border-green-600/50' },
  LEADERSHIP: { label: 'Leadership', color: 'text-purple-400', bg: 'bg-purple-950/30', border: 'border-purple-600/50' },
  SURVIVAL: { label: 'Survival', color: 'text-yellow-400', bg: 'bg-yellow-950/30', border: 'border-yellow-600/50' },
};

export default function SkillTree({ member }) {
  const [skills, setSkills] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSkillTree();
  }, [member?.id]);

  const generateSkillTree = async () => {
    setLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a detailed skill tree for this Star Citizen member based on their profile:

        Name: ${member.full_name}
        Callsign: ${member.profile?.callsign || 'N/A'}
        Current Rank: ${member.profile?.rank || 'VAGRANT'}
        Current Roles: ${member.profile?.roles?.join(', ') || 'None'}

        Create a skill tree with 5 categories: Combat, Piloting, Logistics, Leadership, Survival.
        For each category, provide 3-4 skills with:
        - Skill name
        - Current level (1-5)
        - XP progress to next level (0-100)
        - Description

        Format as JSON.`,
        response_json_schema: {
          type: 'object',
          properties: {
            COMBAT: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, level: { type: 'number' }, xp: { type: 'number' }, description: { type: 'string' } } } },
            PILOTING: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, level: { type: 'number' }, xp: { type: 'number' }, description: { type: 'string' } } } },
            LOGISTICS: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, level: { type: 'number' }, xp: { type: 'number' }, description: { type: 'string' } } } },
            LEADERSHIP: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, level: { type: 'number' }, xp: { type: 'number' }, description: { type: 'string' } } } },
            SURVIVAL: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, level: { type: 'number' }, xp: { type: 'number' }, description: { type: 'string' } } } },
          },
        },
      });

      setSkills(response);
    } catch (error) {
      console.error('Failed to generate skill tree:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400 mr-2" />
        <span className="text-zinc-400">Generating skill tree...</span>
      </div>
    );
  }

  if (!skills) {
    return <div className="text-center py-8 text-zinc-500">Unable to generate skill tree</div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(SKILL_CATEGORIES).map(([key, category]) => (
        <div key={key} className={`p-4 border rounded ${category.bg} ${category.border}`}>
          <h4 className={`font-bold text-sm uppercase mb-4 flex items-center gap-2 ${category.color}`}>
            <Zap className="w-4 h-4" />
            {category.label}
          </h4>

          <div className="space-y-3">
            {skills[key]?.map((skill, idx) => (
              <div key={idx} className="bg-zinc-800/50 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">{skill.name}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i < skill.level ? category.color.replace('text-', 'bg-') : 'bg-zinc-700'}`}
                      />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-zinc-400">{skill.description}</p>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>XP Progress</span>
                    <span>{skill.xp}%</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded h-1.5 overflow-hidden">
                    <div
                      className={category.color.replace('text-', 'bg-')}
                      style={{ width: `${skill.xp}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}