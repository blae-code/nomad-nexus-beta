import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Edit2, Save, X, Palette, Music, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePersonalizationPanel({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [personalization, setPersonalization] = useState(user?.personalization || {
    theme_color: '#ea580c',
    nickname: user?.callsign || '',
    personal_bio: '',
    interests: [],
    favorite_music: '',
    favorite_quote: '',
    profile_banner_color: 'from-zinc-900 to-[#ea580c]',
    personality_tags: [],
    background_story: ''
  });

  const handleSave = async () => {
    try {
      await onUpdate({ personalization });
      setIsEditing(false);
      toast.success('Personalization updated');
    } catch (err) {
      toast.error('Failed to save personalization');
    }
  };

  const interestOptions = [
    'Racing', 'Combat', 'Exploration', 'Trading', 'Rescue Ops', 'Piracy',
    'Bounty Hunting', 'Mining', 'Salvage', 'Research', 'PvP', 'PvE',
    'Roleplaying', 'Squad Ops', 'Solo Missions', 'Multiplayer Events'
  ];

  const personalityTags = [
    'Friendly', 'Competitive', 'Strategic', 'Aggressive', 'Defensive',
    'Casual', 'Hardcore', 'Leader', 'Follower', 'Support', 'DPS',
    'Tank', 'Scout', 'Reliable', 'Risk-Taker', 'Cautious'
  ];

  return (
    <Card className="bg-gradient-to-r from-purple-950/40 to-zinc-950 border-purple-800/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <CardTitle>Personalization & Identity</CardTitle>
          </div>
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-3 h-3 mr-1" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Personal Bio */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Personal Bio</Label>
          {isEditing ? (
            <Textarea
              value={personalization.personal_bio}
              onChange={(e) => setPersonalization({ ...personalization, personal_bio: e.target.value })}
              placeholder="Write about yourself, your background, style, preferences..."
              className="bg-zinc-900 border-zinc-700 text-white text-sm min-h-[80px]"
            />
          ) : (
            <div className="text-xs text-zinc-300 bg-zinc-900/30 border border-zinc-800 p-3 rounded">
              {personalization.personal_bio || 'No bio set'}
            </div>
          )}
        </div>

        {/* Theme Color */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold flex items-center gap-2">
            <Palette className="w-3 h-3" />
            Theme Color
          </Label>
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={personalization.theme_color}
                onChange={(e) => setPersonalization({ ...personalization, theme_color: e.target.value })}
                className="w-12 h-10 border border-zinc-700 rounded cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-400">{personalization.theme_color}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border border-zinc-700 rounded" style={{ backgroundColor: personalization.theme_color }} />
              <span className="text-xs text-zinc-400">{personalization.theme_color}</span>
            </div>
          )}
        </div>

        {/* Favorite Quote */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Favorite Quote</Label>
          {isEditing ? (
            <Input
              value={personalization.favorite_quote}
              onChange={(e) => setPersonalization({ ...personalization, favorite_quote: e.target.value })}
              placeholder="A quote that resonates with you..."
              className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm italic"
            />
          ) : (
            <div className="text-sm italic text-purple-300 border border-purple-800/30 bg-purple-950/20 p-2">
              {personalization.favorite_quote || 'No quote set'}
            </div>
          )}
        </div>

        {/* Favorite Music */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold flex items-center gap-2">
            <Music className="w-3 h-3" />
            Favorite Music / Atmosphere
          </Label>
          {isEditing ? (
            <Input
              value={personalization.favorite_music}
              onChange={(e) => setPersonalization({ ...personalization, favorite_music: e.target.value })}
              placeholder="Your favorite music, artist, or vibe"
              className="bg-zinc-900 border-zinc-700 text-white text-sm"
            />
          ) : (
            <div className="text-xs text-zinc-300">{personalization.favorite_music || 'Not set'}</div>
          )}
        </div>

        {/* Interests */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Interests & Specialties</Label>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    const updated = personalization.interests.includes(interest)
                      ? personalization.interests.filter(i => i !== interest)
                      : [...personalization.interests, interest];
                    setPersonalization({ ...personalization, interests: updated });
                  }}
                  className={`p-2 text-xs border rounded text-left transition-all ${
                    personalization.interests.includes(interest)
                      ? 'bg-purple-600/40 border-purple-500 text-purple-200'
                      : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {personalization.interests.length > 0 ? (
                personalization.interests.map((interest) => (
                  <Badge key={interest} className="bg-purple-600/30 text-purple-300 border-purple-600">
                    {interest}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-zinc-500">No interests selected</span>
              )}
            </div>
          )}
        </div>

        {/* Personality Tags */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Personality Tags</Label>
          {isEditing ? (
            <div className="grid grid-cols-2 gap-2">
              {personalityTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const updated = personalization.personality_tags.includes(tag)
                      ? personalization.personality_tags.filter(t => t !== tag)
                      : [...personalization.personality_tags, tag];
                    setPersonalization({ ...personalization, personality_tags: updated });
                  }}
                  className={`p-2 text-xs border rounded text-left transition-all ${
                    personalization.personality_tags.includes(tag)
                      ? 'bg-pink-600/40 border-pink-500 text-pink-200'
                      : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {personalization.personality_tags.length > 0 ? (
                personalization.personality_tags.map((tag) => (
                  <Badge key={tag} className="bg-pink-600/30 text-pink-300 border-pink-600">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-zinc-500">No tags selected</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}