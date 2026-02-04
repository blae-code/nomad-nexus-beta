import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';
import { Award } from 'lucide-react';

const DEFAULT_FORM = {
  medal_type: '',
  citation: '',
};

export default function MemberCommendations({ memberId }) {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [commendations, setCommendations] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);

  const awarderIds = useMemo(
    () => commendations.map((c) => c.awarded_by_member_profile_id || c.awarded_by_user_id).filter(Boolean),
    [commendations]
  );
  const { memberMap } = useMemberProfileMap(awarderIds);

  const loadCommendations = async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      let results = [];
      try {
        results = await base44.entities.Commendation.filter({ recipient_member_profile_id: memberId }, '-created_date', 100);
      } catch {
        results = await base44.entities.Commendation.filter({ member_profile_id: memberId }, '-created_date', 100);
      }
      setCommendations(results || []);
    } catch (error) {
      console.error('Failed to load commendations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommendations();
  }, [memberId]);

  const submitCommendation = async () => {
    if (!form.medal_type.trim()) return;
    try {
      await base44.entities.Commendation.create({
        recipient_member_profile_id: memberId,
        awarded_by_member_profile_id: member?.id || null,
        medal_type: form.medal_type.trim(),
        citation: form.citation.trim(),
        awarded_at: new Date().toISOString(),
      });
      setForm(DEFAULT_FORM);
      loadCommendations();
    } catch (error) {
      console.error('Failed to award commendation:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <Award className="w-3 h-3" />
          Award Commendation
        </div>
        <Input
          value={form.medal_type}
          onChange={(e) => setForm((prev) => ({ ...prev, medal_type: e.target.value }))}
          placeholder="Medal or ribbon name"
        />
        <Textarea
          value={form.citation}
          onChange={(e) => setForm((prev) => ({ ...prev, citation: e.target.value }))}
          placeholder="Citation or reason"
          className="min-h-[80px]"
        />
        <Button onClick={submitCommendation} disabled={!form.medal_type.trim()}>
          Award
        </Button>
      </div>

      {loading ? (
        <div className="text-xs text-zinc-500">Loading commendations...</div>
      ) : commendations.length === 0 ? (
        <div className="text-xs text-zinc-500">No commendations yet.</div>
      ) : (
        <div className="space-y-2">
          {commendations.map((commendation) => (
            <div key={commendation.id} className="bg-zinc-800/50 border border-zinc-700 rounded p-3">
              <div className="text-sm font-semibold text-orange-300">{commendation.medal_type || 'Commendation'}</div>
              {commendation.citation && (
                <div className="text-xs text-zinc-400 mt-1">{commendation.citation}</div>
              )}
              <div className="text-[10px] text-zinc-500 mt-2">
                Awarded by {memberMap[commendation.awarded_by_member_profile_id]?.label || commendation.awarded_by_member_profile_id || 'Unknown'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
