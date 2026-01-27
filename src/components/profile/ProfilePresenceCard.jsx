import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X, Heart, Radio, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePresenceCard({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [presenceData, setPresenceData] = useState(user?.presence_profile || {
    status_message: '',
    current_location: '',
    availability: 'available', // available, busy, dnd, away
    preferred_squad_id: '',
    voice_preference: 'voice', // voice, text, hybrid
    lfg_enabled: false,
    activity_mood: 'operational' // operational, social, training, downtime
  });

  const handleSave = async () => {
    try {
      await onUpdate({ presence_profile: presenceData });
      setIsEditing(false);
      toast.success('Presence settings updated');
    } catch (err) {
      toast.error('Failed to save presence settings');
    }
  };

  const moodOptions = {
    operational: { label: 'Operational', color: 'bg-red-600/30 text-red-300' },
    social: { label: 'Social', color: 'bg-blue-600/30 text-blue-300' },
    training: { label: 'Training', color: 'bg-yellow-600/30 text-yellow-300' },
    downtime: { label: 'Downtime', color: 'bg-purple-600/30 text-purple-300' }
  };

  const availabilityOptions = {
    available: { label: 'Available', color: 'bg-green-600/30 text-green-300', dot: 'bg-green-500' },
    busy: { label: 'Busy', color: 'bg-yellow-600/30 text-yellow-300', dot: 'bg-yellow-500' },
    dnd: { label: 'Do Not Disturb', color: 'bg-red-600/30 text-red-300', dot: 'bg-red-500' },
    away: { label: 'Away', color: 'bg-zinc-600/30 text-zinc-300', dot: 'bg-zinc-500' }
  };

  return (
    <Card className="bg-gradient-to-r from-cyan-950/40 to-zinc-950 border-cyan-800/50 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-cyan-400" />
            <CardTitle>Presence & Availability</CardTitle>
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
              <Button size="sm" onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 space-y-4">
        {/* Availability Status */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Current Status</Label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(availabilityOptions).map(([status, { label, color }]) => (
                <button
                  key={status}
                  onClick={() => setPresenceData({ ...presenceData, availability: status })}
                  className={`px-3 py-1.5 text-xs border rounded transition-all ${
                    presenceData.availability === status
                      ? `${color} border-cyan-500`
                      : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${availabilityOptions[presenceData.availability]?.dot || 'bg-green-500'}`} />
              <Badge className={availabilityOptions[presenceData.availability]?.color || 'bg-green-600/30'}>
                {availabilityOptions[presenceData.availability]?.label || 'Available'}
              </Badge>
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Status Message</Label>
          {isEditing ? (
            <Input
              value={presenceData.status_message}
              onChange={(e) => setPresenceData({ ...presenceData, status_message: e.target.value })}
              placeholder="What are you up to? (Max 60 chars)"
              maxLength={60}
              className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
            />
          ) : (
            <div className="text-sm text-cyan-300 border border-cyan-800/30 bg-cyan-950/20 p-2 italic">
              {presenceData.status_message || 'No status set'}
            </div>
          )}
        </div>

        {/* Activity Mood */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold">Activity Mood</Label>
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(moodOptions).map(([mood, { label, color }]) => (
                <button
                  key={mood}
                  onClick={() => setPresenceData({ ...presenceData, activity_mood: mood })}
                  className={`px-3 py-1.5 text-xs border rounded transition-all ${
                    presenceData.activity_mood === mood
                      ? `${color} border-current`
                      : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <Badge className={moodOptions[presenceData.activity_mood]?.color || moodOptions.operational.color}>
              {moodOptions[presenceData.activity_mood]?.label || 'Operational'}
            </Badge>
          )}
        </div>

        {/* Voice Preference */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold flex items-center gap-2">
            <Radio className="w-3 h-3" />
            Voice Preference
          </Label>
          {isEditing ? (
            <select
              value={presenceData.voice_preference}
              onChange={(e) => setPresenceData({ ...presenceData, voice_preference: e.target.value })}
              className="bg-zinc-900 border border-zinc-700 text-white p-2 text-sm rounded"
            >
              <option value="voice">Voice Priority</option>
              <option value="text">Text Priority</option>
              <option value="hybrid">Hybrid (Voice + Text)</option>
            </select>
          ) : (
            <div className="text-xs text-zinc-300 capitalize">{presenceData.voice_preference.replace('_', ' ')}</div>
          )}
        </div>

        {/* LFG Toggle */}
        <div className="grid gap-2">
          <Label className="text-xs font-bold flex items-center gap-2">
            <Users className="w-3 h-3" />
            Looking For Group
          </Label>
          {isEditing ? (
            <button
              onClick={() => setPresenceData({ ...presenceData, lfg_enabled: !presenceData.lfg_enabled })}
              className={`px-3 py-1.5 text-xs border rounded transition-all ${
                presenceData.lfg_enabled
                  ? 'bg-green-600/30 text-green-300 border-green-500'
                  : 'bg-zinc-900/50 text-zinc-400 border-zinc-700'
              }`}
            >
              {presenceData.lfg_enabled ? 'ACTIVE - Looking for teammates' : 'INACTIVE - Not looking'}
            </button>
          ) : (
            <Badge className={presenceData.lfg_enabled ? 'bg-green-600/30 text-green-300' : 'bg-zinc-600/30 text-zinc-300'}>
              {presenceData.lfg_enabled ? 'LFG Active' : 'Solo/Private'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}