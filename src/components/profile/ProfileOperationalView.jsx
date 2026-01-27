import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Radio, Swords, Edit2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ProfileOperationalView({ user, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [operationalData, setOperationalData] = useState(user?.operational_profile || {
    motto: '',
    preferred_role: 'pilot', // pilot, support, tactical, specialist
    combat_preference: 'balanced', // aggressive, defensive, balanced
    specializations: [], // array of specializations
    preferred_squad_role: '',
    call_pattern: '', // comms style
    preferred_nets: [], // preferred voice channels
    reputation_tags: [],
    mission_history_summary: ''
  });

  const handleSave = async () => {
    try {
      await onUpdate({ operational_profile: operationalData });
      setIsEditing(false);
      toast.success('Operational profile updated');
    } catch (err) {
      toast.error('Failed to save operational profile');
    }
  };

  const specializations = [
    'Combat Pilot',
    'Rescue Specialist',
    'Heavy Transport',
    'Recon & Scanning',
    'Salvage Expert',
    'Medical Officer',
    'Communications',
    'Leadership',
    'Logistics',
    'Engineering'
  ];

  const roleDescriptions = {
    pilot: 'Flight operations and piloting',
    support: 'Support and logistics roles',
    tactical: 'Tactical planning and execution',
    specialist: 'Specialized skills and expertise'
  };

  return (
    <div className="space-y-4">
      {/* Operational Header Card */}
      <Card className="bg-gradient-to-r from-amber-950/40 to-zinc-950 border-amber-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <CardTitle>Operational Profile</CardTitle>
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
                <Button size="sm" onClick={handleSave} className="bg-amber-600 hover:bg-amber-700">
                  <Save className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative z-10 space-y-4">
          {/* Motto */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold text-amber-400">Personal Motto / Callsign Tagline</Label>
            {isEditing ? (
              <Input
                value={operationalData.motto}
                onChange={(e) => setOperationalData({ ...operationalData, motto: e.target.value })}
                placeholder="e.g., 'Eyes in the sky', 'Never leave a pilot behind'"
                className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm italic"
              />
            ) : (
              <div className="text-sm italic text-amber-300 border border-amber-800/30 bg-amber-950/20 p-2">
                {operationalData.motto || 'No motto set'}
              </div>
            )}
          </div>

          {/* Preferred Role */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold">Primary Operational Role</Label>
            {isEditing ? (
              <select
                value={operationalData.preferred_role}
                onChange={(e) => setOperationalData({ ...operationalData, preferred_role: e.target.value })}
                className="bg-zinc-900 border border-zinc-700 text-white p-2 text-sm rounded"
              >
                {Object.entries(roleDescriptions).map(([role, desc]) => (
                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)} - {desc}</option>
                ))}
              </select>
            ) : (
              <Badge className="w-fit bg-amber-600/30 text-amber-300 border-amber-600">
                {operationalData.preferred_role?.charAt(0).toUpperCase() + operationalData.preferred_role?.slice(1)}
              </Badge>
            )}
          </div>

          {/* Specializations */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold">Specializations</Label>
            {isEditing ? (
              <div className="grid grid-cols-2 gap-2">
                {specializations.map((spec) => (
                  <button
                    key={spec}
                    onClick={() => {
                      const updated = operationalData.specializations.includes(spec)
                        ? operationalData.specializations.filter(s => s !== spec)
                        : [...operationalData.specializations, spec];
                      setOperationalData({ ...operationalData, specializations: updated });
                    }}
                    className={`p-2 text-xs border rounded text-left transition-all ${
                      operationalData.specializations.includes(spec)
                        ? 'bg-amber-600/40 border-amber-500 text-amber-200'
                        : 'bg-zinc-900/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {operationalData.specializations.length > 0 ? (
                  operationalData.specializations.map((spec) => (
                    <Badge key={spec} className="bg-amber-600/30 text-amber-300 border-amber-600">
                      {spec}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-zinc-500">No specializations selected</span>
                )}
              </div>
            )}
          </div>

          {/* Combat Preference */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold flex items-center gap-2">
              <Swords className="w-3 h-3" />
              Combat Preference
            </Label>
            {isEditing ? (
              <select
                value={operationalData.combat_preference}
                onChange={(e) => setOperationalData({ ...operationalData, combat_preference: e.target.value })}
                className="bg-zinc-900 border border-zinc-700 text-white p-2 text-sm rounded"
              >
                <option value="aggressive">Aggressive - High risk, high reward</option>
                <option value="defensive">Defensive - Protect and preserve</option>
                <option value="balanced">Balanced - Tactical approach</option>
              </select>
            ) : (
              <div className="text-xs text-zinc-300 capitalize">{operationalData.combat_preference}</div>
            )}
          </div>

          {/* Comms Call Pattern */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold flex items-center gap-2">
              <Radio className="w-3 h-3" />
              Comms Call Pattern
            </Label>
            {isEditing ? (
              <Input
                value={operationalData.call_pattern}
                onChange={(e) => setOperationalData({ ...operationalData, call_pattern: e.target.value })}
                placeholder="e.g., 'Ghost Lead', 'Actual', 'Zulu 2'"
                className="bg-zinc-900 border-zinc-700 text-white font-mono text-sm"
              />
            ) : (
              <div className="text-xs text-zinc-300 font-mono">
                {operationalData.call_pattern || 'Standard callsign'}
              </div>
            )}
          </div>

          {/* Mission History Summary */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold">Operational Summary</Label>
            {isEditing ? (
              <Textarea
                value={operationalData.mission_history_summary}
                onChange={(e) => setOperationalData({ ...operationalData, mission_history_summary: e.target.value })}
                placeholder="Highlight your major operations, achievements, and experience..."
                className="bg-zinc-900 border-zinc-700 text-white text-sm min-h-[80px]"
              />
            ) : (
              <div className="text-xs text-zinc-400 bg-zinc-900/30 border border-zinc-800 p-2 rounded">
                {operationalData.mission_history_summary || 'No summary provided'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}