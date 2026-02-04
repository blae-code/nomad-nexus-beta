import React, { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Award, Medal, Calendar } from 'lucide-react';

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

export default function MemberDossier({ member, participationHistory = [], onMemberUpdate }) {
  const profile = member?.profile || {};
  const [certInput, setCertInput] = useState('');
  const [medalInput, setMedalInput] = useState('');

  const certifications = useMemo(() => {
    return normalizeArray(profile.certifications || profile.certification_list || profile.certification_ids);
  }, [profile.certifications, profile.certification_list, profile.certification_ids]);

  const medals = useMemo(() => {
    return normalizeArray(profile.medals || profile.medal_list || profile.awards);
  }, [profile.medals, profile.medal_list, profile.awards]);

  const updateProfileList = async (field, values) => {
    if (!profile?.id) return;
    try {
      await base44.entities.MemberProfile.update(profile.id, { [field]: values });
      onMemberUpdate?.();
    } catch (error) {
      console.error('Profile update failed:', error);
    }
  };

  const addCertification = () => {
    if (!certInput.trim()) return;
    const next = [...certifications, certInput.trim()];
    setCertInput('');
    updateProfileList('certifications', next);
  };

  const addMedal = () => {
    if (!medalInput.trim()) return;
    const next = [...medals, medalInput.trim()];
    setMedalInput('');
    updateProfileList('medals', next);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Award className="w-3 h-3" />
            Certifications
          </div>
          <div className="flex flex-wrap gap-2">
            {certifications.length === 0 ? (
              <span className="text-xs text-zinc-500">No certifications yet.</span>
            ) : (
              certifications.map((cert, idx) => (
                <span key={`${cert}-${idx}`} className="text-[10px] uppercase px-2 py-1 border border-zinc-600 text-zinc-300 rounded">
                  {cert}
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              placeholder="Add certification"
            />
            <Button size="sm" onClick={addCertification}>Add</Button>
          </div>
        </div>

        <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <Medal className="w-3 h-3" />
            Medals & Ribbons
          </div>
          <div className="flex flex-wrap gap-2">
            {medals.length === 0 ? (
              <span className="text-xs text-zinc-500">No medals awarded.</span>
            ) : (
              medals.map((medal, idx) => (
                <span key={`${medal}-${idx}`} className="text-[10px] uppercase px-2 py-1 border border-orange-500/40 text-orange-300 rounded">
                  {medal}
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={medalInput}
              onChange={(e) => setMedalInput(e.target.value)}
              placeholder="Add medal"
            />
            <Button size="sm" onClick={addMedal}>Add</Button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 mb-3">
          <Calendar className="w-3 h-3" />
          Operation Timeline
        </div>
        {participationHistory.length === 0 ? (
          <div className="text-xs text-zinc-500">No operations logged yet.</div>
        ) : (
          <div className="space-y-2">
            {participationHistory.map((event) => (
              <div key={event.id} className="flex items-center justify-between text-xs text-zinc-300">
                <div>
                  <div className="font-semibold text-white">{event.title}</div>
                  <div className="text-[10px] text-zinc-500">{event.event_type} • {event.status}</div>
                </div>
                <div className="text-[10px] text-zinc-500">
                  {event.start_time ? new Date(event.start_time).toLocaleDateString() : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
