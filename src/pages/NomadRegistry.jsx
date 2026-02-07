import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { createPageUrl, getDisplayCallsign } from '@/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, BarChart3, Clock3, FileText, Handshake, ShieldCheck, Star, Users } from 'lucide-react';

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);
const AVAILABILITY_STATES = ['available', 'focused', 'busy', 'in_operation', 'afk', 'offline'];
const SCORE_OPTIONS = [1, 2, 3, 4, 5];
const DEFAULT_REPUTATION_FORM = { score: '5', category: 'reliability', note: '' };
const DEFAULT_ACHIEVEMENT_FORM = { title: '', description: '', points: '0' };
const DEFAULT_NOTE_FORM = { note: '', visibility: 'private' };
const DEFAULT_TRADITION_FORM = { squadName: 'Nomads', title: '', details: '' };

function parseRegistryState(notes) {
  const raw = String(notes || '');
  const match = raw.match(/\[nomad_registry_state\]([\s\S]*?)\[\/nomad_registry_state\]/i);
  if (!match?.[1]) {
    return {
      reputation_entries: [],
      achievements: [],
      mentor_member_profile_id: null,
      operator_notes: [],
      traditions: [],
      availability_status: null,
    };
  }
  try {
    const parsed = JSON.parse(match[1]);
    return {
      reputation_entries: Array.isArray(parsed?.reputation_entries) ? parsed.reputation_entries : [],
      achievements: Array.isArray(parsed?.achievements) ? parsed.achievements : [],
      mentor_member_profile_id: parsed?.mentor_member_profile_id ? String(parsed.mentor_member_profile_id) : null,
      operator_notes: Array.isArray(parsed?.operator_notes) ? parsed.operator_notes : [],
      traditions: Array.isArray(parsed?.traditions) ? parsed.traditions : [],
      availability_status: parsed?.availability_status ? String(parsed.availability_status).toLowerCase() : null,
    };
  } catch {
    return {
      reputation_entries: [],
      achievements: [],
      mentor_member_profile_id: null,
      operator_notes: [],
      traditions: [],
      availability_status: null,
    };
  }
}

function hasCommandAccess(profile) {
  if (!profile) return false;
  if (Boolean(profile?.is_admin)) return true;
  const rank = String(profile?.rank || '').toUpperCase();
  if (COMMAND_RANKS.has(rank)) return true;
  const roles = Array.isArray(profile?.roles)
    ? profile.roles.map((role) => String(role || '').toLowerCase())
    : [];
  return roles.includes('admin') || roles.includes('command');
}

function formatDate(value) {
  if (!value) return 'Unknown';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function serviceDays(profile) {
  const start = profile?.joined_date || profile?.created_date;
  if (!start) return null;
  const ms = Date.now() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function StatCard({ label, value, color = 'text-zinc-200' }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Panel({ title, icon: Icon, className = '', children }) {
  return (
    <div className={`bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3 ${className}`}>
      <div className="text-xs uppercase tracking-widest text-zinc-500 flex items-center gap-2">
        {Icon ? <Icon className="w-3 h-3" /> : null}
        {title}
      </div>
      {children}
    </div>
  );
}

export default function NomadRegistry() {
  const { user } = useAuth();
  const currentMember = user?.member_profile_data || user;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profiles');
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [availabilityDraft, setAvailabilityDraft] = useState('available');
  const [reputationForm, setReputationForm] = useState(DEFAULT_REPUTATION_FORM);
  const [achievementForm, setAchievementForm] = useState(DEFAULT_ACHIEVEMENT_FORM);
  const [mentorDraft, setMentorDraft] = useState('');
  const [noteForm, setNoteForm] = useState(DEFAULT_NOTE_FORM);
  const [traditionForm, setTraditionForm] = useState(DEFAULT_TRADITION_FORM);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const commandAccess = useMemo(() => hasCommandAccess(currentMember), [currentMember]);
  const selectedMember = useMemo(
    () => members.find((profile) => profile.id === selectedMemberId) || members[0] || null,
    [members, selectedMemberId]
  );
  const selectedState = useMemo(() => parseRegistryState(selectedMember?.notes), [selectedMember]);

  const selectedReliability = useMemo(() => {
    if (typeof selectedMember?.reliability_score === 'number') return selectedMember.reliability_score;
    const entries = selectedState.reputation_entries || [];
    if (!entries.length) return 0;
    const total = entries.reduce((sum, entry) => sum + Number(entry?.score || 0), 0);
    return Math.round((total / entries.length) * 100) / 100;
  }, [selectedMember, selectedState.reputation_entries]);

  const mentorProfile = useMemo(() => {
    const mentorId =
      selectedState.mentor_member_profile_id ||
      selectedMember?.mentor_member_profile_id ||
      selectedMember?.onboarding_mentor_member_profile_id ||
      selectedMember?.mentor_id ||
      null;
    return members.find((profile) => profile.id === mentorId) || null;
  }, [members, selectedMember, selectedState.mentor_member_profile_id]);

  const analytics = useMemo(() => {
    const parsed = members.map((profile) => ({ profile, state: parseRegistryState(profile?.notes) }));
    const reliabilitySamples = parsed
      .map((entry) => {
        if (typeof entry.profile?.reliability_score === 'number') return Number(entry.profile.reliability_score);
        const reps = entry.state.reputation_entries;
        if (!reps.length) return null;
        const total = reps.reduce((sum, rep) => sum + Number(rep?.score || 0), 0);
        return total / reps.length;
      })
      .filter((value) => value !== null);

    const availabilityBreakdown = parsed.reduce((acc, entry) => {
      const status = String(entry.state.availability_status || entry.profile?.availability_status || 'unknown').toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      totalMembers: members.length,
      totalReputation: parsed.reduce((sum, entry) => sum + entry.state.reputation_entries.length, 0),
      totalAchievements: parsed.reduce((sum, entry) => sum + entry.state.achievements.length, 0),
      avgReliability: reliabilitySamples.length
        ? Math.round((reliabilitySamples.reduce((sum, value) => sum + Number(value), 0) / reliabilitySamples.length) * 100) / 100
        : 0,
      availabilityBreakdown,
    };
  }, [members]);

  const loadRegistry = async () => {
    setLoading(true);
    try {
      const profileList = await base44.entities.MemberProfile.list('-created_date', 350).catch(() => []);
      setMembers(profileList || []);
      if (!selectedMemberId) {
        const preferred = (profileList || []).find((profile) => profile.id === currentMember?.id) || profileList?.[0];
        if (preferred?.id) setSelectedMemberId(preferred.id);
      }
    } catch (error) {
      console.error('NomadRegistry load failed:', error);
      setBanner({ type: 'error', message: 'Failed to load registry data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  useEffect(() => {
    const status = String(selectedState?.availability_status || selectedMember?.availability_status || 'available').toLowerCase();
    setAvailabilityDraft(AVAILABILITY_STATES.includes(status) ? status : 'available');
    const mentorId =
      selectedState?.mentor_member_profile_id ||
      selectedMember?.mentor_member_profile_id ||
      selectedMember?.onboarding_mentor_member_profile_id ||
      selectedMember?.mentor_id ||
      '';
    setMentorDraft(mentorId);
  }, [selectedMember, selectedState?.availability_status, selectedState?.mentor_member_profile_id]);

  const runAction = async (payload, successMessage) => {
    try {
      setActionBusy(true);
      const response = await invokeMemberFunction('updateNomadRegistry', payload);
      const result = response?.data || response;
      if (!result?.success) setBanner({ type: 'error', message: result?.error || 'Registry update failed.' });
      else setBanner({ type: 'success', message: successMessage || 'Registry updated.' });
      await loadRegistry();
      return result;
    } catch (error) {
      console.error('NomadRegistry action failed:', error);
      setBanner({ type: 'error', message: error?.data?.error || error?.message || 'Registry update failed.' });
      return null;
    } finally {
      setActionBusy(false);
    }
  };

  const submitAvailability = async () => {
    if (!selectedMember?.id) return;
    await runAction(
      { action: 'set_availability', targetMemberProfileId: selectedMember.id, availability: availabilityDraft },
      'Availability status updated.'
    );
  };

  const submitReputation = async () => {
    if (!selectedMember?.id) return;
    const result = await runAction(
      {
        action: 'submit_reputation',
        targetMemberProfileId: selectedMember.id,
        score: Number(reputationForm.score),
        category: reputationForm.category,
        note: reputationForm.note.trim(),
      },
      'Reputation entry submitted.'
    );
    if (result?.success) setReputationForm(DEFAULT_REPUTATION_FORM);
  };

  const submitAchievement = async () => {
    if (!selectedMember?.id || !achievementForm.title.trim()) return;
    const result = await runAction(
      {
        action: 'award_achievement',
        targetMemberProfileId: selectedMember.id,
        title: achievementForm.title.trim(),
        description: achievementForm.description.trim(),
        points: Number(achievementForm.points || 0),
      },
      'Achievement awarded.'
    );
    if (result?.success) setAchievementForm(DEFAULT_ACHIEVEMENT_FORM);
  };

  const submitMentor = async () => {
    if (!selectedMember?.id) return;
    await runAction(
      {
        action: 'set_mentor_relationship',
        targetMemberProfileId: selectedMember.id,
        mentorMemberProfileId: mentorDraft || null,
      },
      mentorDraft ? 'Mentor relationship updated.' : 'Mentor relationship cleared.'
    );
  };

  const submitNote = async () => {
    if (!selectedMember?.id || !noteForm.note.trim()) return;
    const result = await runAction(
      {
        action: 'add_operator_note',
        targetMemberProfileId: selectedMember.id,
        note: noteForm.note.trim(),
        visibility: noteForm.visibility,
      },
      'Operator note added.'
    );
    if (result?.success) setNoteForm(DEFAULT_NOTE_FORM);
  };

  const submitTradition = async () => {
    if (!selectedMember?.id || !traditionForm.title.trim()) return;
    const result = await runAction(
      {
        action: 'add_tradition',
        targetMemberProfileId: selectedMember.id,
        squadName: traditionForm.squadName.trim() || 'Nomads',
        title: traditionForm.title.trim(),
        details: traditionForm.details.trim(),
      },
      'Squad tradition recorded.'
    );
    if (result?.success) setTraditionForm(DEFAULT_TRADITION_FORM);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-zinc-500 text-sm">Loading Nomad Registry...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-wider text-white">Nomad Registry</h1>
          <p className="text-zinc-400 text-sm">Member profiles, availability, reputation, achievements, mentorship, and squad traditions</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={createPageUrl('MissionControl')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Operations</a>
          <a href={createPageUrl('MissionBoard')} className="text-xs border border-zinc-700 rounded px-3 py-1.5 text-zinc-300 hover:text-white hover:border-orange-500/60">Contracts</a>
        </div>
      </div>

      {banner && (
        <div
          role={banner.type === 'error' ? 'alert' : 'status'}
          className={`inline-flex rounded border px-3 py-1 text-xs ${
            banner.type === 'error' ? 'border-red-500/40 text-red-300 bg-red-500/10' : 'border-green-500/40 text-green-300 bg-green-500/10'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Members" value={analytics.totalMembers} color="text-cyan-300" />
        <StatCard label="Reputation Entries" value={analytics.totalReputation} color="text-orange-300" />
        <StatCard label="Achievements" value={analytics.totalAchievements} color="text-yellow-300" />
        <StatCard label="Avg Reliability" value={analytics.avgReliability} color="text-green-300" />
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-3 flex items-center gap-3">
        <label htmlFor="registry-member" className="text-xs uppercase tracking-widest text-zinc-500">Member</label>
        <select
          id="registry-member"
          value={selectedMember?.id || ''}
          onChange={(event) => setSelectedMemberId(event.target.value)}
          className="bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded min-w-[300px]"
        >
          {members.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {getDisplayCallsign(profile) || profile.full_name || profile.id}
            </option>
          ))}
        </select>
        <div className="text-[10px] text-zinc-500 uppercase">
          Command Access: <span className={commandAccess ? 'text-green-400' : 'text-zinc-400'}>{commandAccess ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="reputation">Reputation</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
          <TabsTrigger value="notes">Operator Notes</TabsTrigger>
          <TabsTrigger value="traditions">Traditions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="Member Profile" icon={Users} className="col-span-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50"><span className="text-zinc-500">Callsign</span><div className="text-white text-sm">{getDisplayCallsign(selectedMember) || selectedMember?.callsign || 'Unknown'}</div></div>
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50"><span className="text-zinc-500">Rank</span><div className="text-zinc-200 text-sm">{selectedMember?.rank || 'VAGRANT'}</div></div>
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50"><span className="text-zinc-500">Reliability</span><div className="text-orange-300 text-sm">{selectedReliability}</div></div>
                <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50"><span className="text-zinc-500">Service</span><div className="text-cyan-300 text-sm">{serviceDays(selectedMember) === null ? 'Unknown' : `${serviceDays(selectedMember)} days`}</div></div>
              </div>
            </Panel>

            <Panel title="Availability Tracking" icon={ShieldCheck}>
              <select value={availabilityDraft} onChange={(event) => setAvailabilityDraft(event.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                {AVAILABILITY_STATES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <Button onClick={submitAvailability} disabled={actionBusy || !selectedMember}>Update Availability</Button>
              <div className="text-[10px] text-zinc-500">Non-command members can update only their own availability.</div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="reputation" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="Reputation System" icon={Star}>
              <select value={reputationForm.score} onChange={(event) => setReputationForm((prev) => ({ ...prev, score: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                {SCORE_OPTIONS.map((score) => <option key={score} value={String(score)}>{score}/5</option>)}
              </select>
              <Input value={reputationForm.category} onChange={(event) => setReputationForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="Category" />
              <Textarea value={reputationForm.note} onChange={(event) => setReputationForm((prev) => ({ ...prev, note: event.target.value }))} className="min-h-[80px]" placeholder="Mission context notes" />
              <Button onClick={submitReputation} disabled={actionBusy || !selectedMember || selectedMember?.id === currentMember?.id}>Submit Reputation</Button>
              {selectedMember?.id === currentMember?.id ? <div className="text-[10px] text-zinc-500">Self-reviews are blocked.</div> : null}
            </Panel>

            <Panel title="Reputation Entries" className="col-span-2">
              {selectedState.reputation_entries.length === 0 ? <div className="text-xs text-zinc-500">No entries.</div> : selectedState.reputation_entries.slice().reverse().slice(0, 12).map((entry) => (
                <div key={entry.id || `${entry.created_at}-${entry.score}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                  <div className="flex items-center justify-between"><span className="text-sm text-white">{Number(entry.score || 0)}/5</span><span className="text-[10px] text-zinc-500">{formatDate(entry.created_at)}</span></div>
                  <div className="text-[10px] text-zinc-500 uppercase">{entry.category || 'reliability'}</div>
                  {entry.note ? <div className="text-xs text-zinc-300">{String(entry.note)}</div> : null}
                </div>
              ))}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="Achievement System" icon={Award}>
              <Input value={achievementForm.title} onChange={(event) => setAchievementForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Achievement title" />
              <Textarea value={achievementForm.description} onChange={(event) => setAchievementForm((prev) => ({ ...prev, description: event.target.value }))} className="min-h-[80px]" placeholder="Description" />
              <Input type="number" value={achievementForm.points} onChange={(event) => setAchievementForm((prev) => ({ ...prev, points: event.target.value }))} placeholder="Points" />
              <Button onClick={submitAchievement} disabled={actionBusy || !commandAccess || !selectedMember || !achievementForm.title.trim()}>Award Achievement</Button>
              {!commandAccess ? <div className="text-[10px] text-zinc-500">Command privileges are required.</div> : null}
            </Panel>

            <Panel title="Achievement Log" className="col-span-2">
              {selectedState.achievements.length === 0 ? <div className="text-xs text-zinc-500">No achievements recorded.</div> : selectedState.achievements.slice().reverse().map((achievement) => (
                <div key={achievement.id || `${achievement.title}-${achievement.awarded_at}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                  <div className="flex items-center justify-between"><span className="text-sm text-white">{String(achievement.title || 'Achievement')}</span><span className="text-[10px] text-yellow-300">{Number(achievement.points || 0)} pts</span></div>
                  {achievement.description ? <div className="text-xs text-zinc-300">{String(achievement.description)}</div> : null}
                  <div className="text-[10px] text-zinc-500">{formatDate(achievement.awarded_at)}</div>
                </div>
              ))}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="mentorship" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Panel title="Mentor/Mentee Relationships" icon={Handshake}>
              <select value={mentorDraft} onChange={(event) => setMentorDraft(event.target.value)} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="">No mentor assigned</option>
                {members.filter((profile) => profile.id !== selectedMember?.id).map((profile) => (
                  <option key={profile.id} value={profile.id}>{getDisplayCallsign(profile) || profile.full_name || profile.id}</option>
                ))}
              </select>
              <Button onClick={submitMentor} disabled={actionBusy || !selectedMember}>Save Mentor Relationship</Button>
              <div className="text-[10px] text-zinc-500">Non-command members can only edit their own profile relationship.</div>
            </Panel>
            <Panel title="Current Relationship">
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs"><span className="text-zinc-500 uppercase">Trainee</span><div className="text-white text-sm">{getDisplayCallsign(selectedMember) || selectedMember?.full_name || selectedMember?.id || 'Unknown'}</div></div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 text-xs"><span className="text-zinc-500 uppercase">Mentor</span><div className="text-cyan-300 text-sm">{mentorProfile ? (getDisplayCallsign(mentorProfile) || mentorProfile.full_name || mentorProfile.id) : 'None assigned'}</div></div>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="Personal Notes on Operators" icon={FileText}>
              <Textarea value={noteForm.note} onChange={(event) => setNoteForm((prev) => ({ ...prev, note: event.target.value }))} className="min-h-[100px]" placeholder="Performance, behavior, or comms notes" />
              <select value={noteForm.visibility} onChange={(event) => setNoteForm((prev) => ({ ...prev, visibility: event.target.value }))} className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded">
                <option value="private">Private</option>
                <option value="command">Command</option>
                <option value="public">Public</option>
              </select>
              <Button onClick={submitNote} disabled={actionBusy || !selectedMember || !noteForm.note.trim()}>Save Note</Button>
            </Panel>
            <Panel title="Operator Notes" className="col-span-2">
              {selectedState.operator_notes.length === 0 ? <div className="text-xs text-zinc-500">No notes recorded.</div> : selectedState.operator_notes.slice().reverse().slice(0, 20).map((entry) => (
                <div key={entry.id || `${entry.created_at}-${entry.note}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500"><span className="uppercase">{String(entry.visibility || 'private')}</span><span>{formatDate(entry.created_at)}</span></div>
                  <div className="text-xs text-zinc-300">{String(entry.note || '')}</div>
                </div>
              ))}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="traditions" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Panel title="Squad Traditions & Rituals" icon={Clock3}>
              <Input value={traditionForm.squadName} onChange={(event) => setTraditionForm((prev) => ({ ...prev, squadName: event.target.value }))} placeholder="Squad name" />
              <Input value={traditionForm.title} onChange={(event) => setTraditionForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Tradition title" />
              <Textarea value={traditionForm.details} onChange={(event) => setTraditionForm((prev) => ({ ...prev, details: event.target.value }))} className="min-h-[90px]" placeholder="Describe the ritual/tradition" />
              <Button onClick={submitTradition} disabled={actionBusy || !commandAccess || !selectedMember || !traditionForm.title.trim()}>Save Tradition</Button>
              {!commandAccess ? <div className="text-[10px] text-zinc-500">Command privileges are required.</div> : null}
            </Panel>
            <Panel title="Recorded Traditions" className="col-span-2">
              {selectedState.traditions.length === 0 ? <div className="text-xs text-zinc-500">No traditions recorded for this profile.</div> : selectedState.traditions.slice().reverse().map((tradition) => (
                <div key={tradition.id || `${tradition.squad_name}-${tradition.title}`} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50">
                  <div className="flex items-center justify-between"><div><div className="text-sm text-white">{String(tradition.title || 'Tradition')}</div><div className="text-[10px] text-zinc-500 uppercase">{String(tradition.squad_name || 'Nomads')}</div></div><div className="text-[10px] text-zinc-500">{formatDate(tradition.created_at)}</div></div>
                  {tradition.details ? <div className="text-xs text-zinc-300">{String(tradition.details)}</div> : null}
                </div>
              ))}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Panel title="Member Analytics" icon={BarChart3}>
              {Object.entries(analytics.availabilityBreakdown).length === 0 ? <div className="text-xs text-zinc-500">No availability records yet.</div> : Object.entries(analytics.availabilityBreakdown).map(([status, count]) => (
                <div key={status} className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50 flex items-center justify-between">
                  <span className="text-xs text-zinc-300 uppercase">{status}</span>
                  <span className="text-xs text-orange-300 font-semibold">{count}</span>
                </div>
              ))}
            </Panel>
            <Panel title="Time in Service Counter">
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50"><div className="text-[10px] uppercase text-zinc-500">Selected Member</div><div className="text-lg text-cyan-300 font-semibold">{serviceDays(selectedMember) === null ? 'Unknown' : `${serviceDays(selectedMember)} days in service`}</div></div>
              <div className="border border-zinc-700/70 rounded p-2 bg-zinc-950/50"><div className="text-[10px] uppercase text-zinc-500">Registry Joined</div><div className="text-sm text-zinc-300">{formatDate(selectedMember?.joined_date || selectedMember?.created_date)}</div></div>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
