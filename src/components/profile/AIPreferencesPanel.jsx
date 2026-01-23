import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Zap, Brain, Gauge, Eye, Music } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AIPreferencesPanel({ user, onUpdate }) {
  const [aiPrefs, setAiPrefs] = useState(user?.ai_preferences || {
    enabled: false,
    playstyle: 'balanced', // aggressive, tactical, balanced, casual
    difficulty: 'medium',
    immersion_level: 'high', // low, medium, high
    ui_animations: true,
    voice_feedback: true,
    personalized_recommendations: false,
    ai_can_suggest_loadouts: false,
    ai_can_suggest_routes: false,
    ai_threat_assessment: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate({ ai_preferences: aiPrefs });
      setIsEditing(false);
      toast.success('AI preferences updated');
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const playstyleDescriptions = {
    aggressive: 'Prioritize offense, high-risk tactics, action-focused scenarios',
    tactical: 'Balanced offense/defense, strategic planning, tactical depth',
    balanced: 'Even split between action and planning, flexible adaptation',
    casual: 'Relaxed pace, exploration-focused, low-pressure decisions'
  };

  const difficultyDescriptions = {
    easy: 'Guided decisions, frequent suggestions, safety-focused AI',
    medium: 'Balanced challenge and support, selective guidance',
    hard: 'Minimal interference, trust your decisions, emergent challenges'
  };

  return (
    <div className="space-y-6">
      {/* Master AI Toggle */}
      <Card className="bg-gradient-to-r from-purple-950/30 to-zinc-950 border-purple-800/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-purple-400" />
              <div>
                <CardTitle className="text-lg">AI Learning & Personalization</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Allow the AI system to learn your preferences and tailor the experience
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={aiPrefs.enabled}
              onCheckedChange={(checked) => {
                setAiPrefs({ ...aiPrefs, enabled: checked });
                setIsEditing(true);
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {aiPrefs.enabled && (
        <>
          {/* Playstyle Selection */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Playstyle Profile
              </CardTitle>
              <CardDescription className="text-xs">
                How the AI adapts suggestions and challenges to match your style
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(playstyleDescriptions).map(([style, desc]) => (
                <div
                  key={style}
                  onClick={() => {
                    setAiPrefs({ ...aiPrefs, playstyle: style });
                    setIsEditing(true);
                  }}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    aiPrefs.playstyle === style
                      ? 'bg-amber-950/40 border-amber-600 ring-1 ring-amber-600/50'
                      : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-sm capitalize">{style}</div>
                    {aiPrefs.playstyle === style && <Badge variant="outline" className="bg-amber-500/20">Selected</Badge>}
                  </div>
                  <div className="text-xs text-zinc-400">{desc}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Difficulty Level */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-500" />
                Difficulty & AI Involvement
              </CardTitle>
              <CardDescription className="text-xs">
                How much the AI assists and how much you decide
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(difficultyDescriptions).map(([level, desc]) => (
                <div
                  key={level}
                  onClick={() => {
                    setAiPrefs({ ...aiPrefs, difficulty: level });
                    setIsEditing(true);
                  }}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    aiPrefs.difficulty === level
                      ? 'bg-cyan-950/40 border-cyan-600 ring-1 ring-cyan-600/50'
                      : 'bg-zinc-900/30 border-zinc-800/50 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-sm capitalize">{level}</div>
                    {aiPrefs.difficulty === level && <Badge variant="outline" className="bg-cyan-500/20">Selected</Badge>}
                  </div>
                  <div className="text-xs text-zinc-400">{desc}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Immersion & UI Settings */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                Immersion & Interface
              </CardTitle>
              <CardDescription className="text-xs">
                Visual and auditory feedback preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold">UI Animations</Label>
                  <p className="text-xs text-zinc-500 mt-1">Enable smooth transitions and motion effects</p>
                </div>
                <Switch
                  checked={aiPrefs.ui_animations}
                  onCheckedChange={(checked) => {
                    setAiPrefs({ ...aiPrefs, ui_animations: checked });
                    setIsEditing(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Music className="w-4 h-4 text-purple-500" />
                    Voice Feedback
                  </Label>
                  <p className="text-xs text-zinc-500 mt-1">AI provides audio cues and alerts</p>
                </div>
                <Switch
                  checked={aiPrefs.voice_feedback}
                  onCheckedChange={(checked) => {
                    setAiPrefs({ ...aiPrefs, voice_feedback: checked });
                    setIsEditing(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold">Immersion Level</Label>
                  <p className="text-xs text-zinc-500 mt-1">
                    {aiPrefs.immersion_level === 'high' && 'Full immersion mode with contextual UI'}
                    {aiPrefs.immersion_level === 'medium' && 'Balanced immersion with helpful overlays'}
                    {aiPrefs.immersion_level === 'low' && 'Minimal UI, clean interface'}
                  </p>
                </div>
                <select
                  value={aiPrefs.immersion_level}
                  onChange={(e) => {
                    setAiPrefs({ ...aiPrefs, immersion_level: e.target.value });
                    setIsEditing(true);
                  }}
                  className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* AI Feature Permissions */}
          <Card className="bg-zinc-950 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-sm">AI Feature Permissions</CardTitle>
              <CardDescription className="text-xs">
                Allow AI to make specific suggestions or analyses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold">Personalized Recommendations</Label>
                  <p className="text-xs text-zinc-500 mt-1">Suggest missions, events, and activities based on history</p>
                </div>
                <Switch
                  checked={aiPrefs.personalized_recommendations}
                  onCheckedChange={(checked) => {
                    setAiPrefs({ ...aiPrefs, personalized_recommendations: checked });
                    setIsEditing(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold">Loadout Suggestions</Label>
                  <p className="text-xs text-zinc-500 mt-1">AI recommends ship/equipment based on mission type</p>
                </div>
                <Switch
                  checked={aiPrefs.ai_can_suggest_loadouts}
                  onCheckedChange={(checked) => {
                    setAiPrefs({ ...aiPrefs, ai_can_suggest_loadouts: checked });
                    setIsEditing(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold">Route Planning</Label>
                  <p className="text-xs text-zinc-500 mt-1">AI suggests optimal routes and waypoints</p>
                </div>
                <Switch
                  checked={aiPrefs.ai_can_suggest_routes}
                  onCheckedChange={(checked) => {
                    setAiPrefs({ ...aiPrefs, ai_can_suggest_routes: checked });
                    setIsEditing(true);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded">
                <div className="flex-1">
                  <Label className="text-sm font-bold">Threat Assessment</Label>
                  <p className="text-xs text-zinc-500 mt-1">AI analyzes combat scenarios and threat levels</p>
                </div>
                <Switch
                  checked={aiPrefs.ai_threat_assessment}
                  onCheckedChange={(checked) => {
                    setAiPrefs({ ...aiPrefs, ai_threat_assessment: checked });
                    setIsEditing(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Notice */}
          <Card className="bg-blue-950/20 border-blue-800/30">
            <CardContent className="p-4">
              <p className="text-xs text-blue-300">
                <strong>Privacy:</strong> Your preferences and playstyle data help improve AI recommendations. 
                No personal data is shared externally. You can disable AI learning at any time.
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          {isEditing && (
            <div className="flex gap-2 justify-end pt-4 border-t border-zinc-800">
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}