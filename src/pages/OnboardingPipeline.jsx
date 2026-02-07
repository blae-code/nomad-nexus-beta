import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/providers/AuthProvider';
import { CheckCircle2, Circle, ClipboardList, GraduationCap, UserPlus } from 'lucide-react';

const DEFAULT_TASKS = [
  { id: 'charter', label: 'Read the Redscar Charter', status: 'pending' },
  { id: 'dossier', label: 'Complete member dossier', status: 'pending' },
  { id: 'training', label: 'Finish basic training', status: 'pending' },
  { id: 'mentor', label: 'Assigned a mentor', status: 'pending' },
  { id: 'first-op', label: 'Participate in first operation', status: 'pending' },
];

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return DEFAULT_TASKS;
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  return DEFAULT_TASKS.map((task) => {
    const incoming = taskMap.get(task.id);
    if (!incoming) return task;
    return {
      id: task.id,
      label: incoming.label || task.label,
      status: incoming.status === 'complete' ? 'complete' : 'pending',
    };
  });
}

function getMentorId(profile) {
  return (
    profile?.onboarding_mentor_member_profile_id ||
    profile?.mentor_member_profile_id ||
    profile?.mentor_id ||
    ''
  );
}

function getMilestones(profile) {
  if (Array.isArray(profile?.training_milestones)) return profile.training_milestones;
  if (Array.isArray(profile?.onboarding_training_milestones)) return profile.onboarding_training_milestones;
  return [];
}

export default function OnboardingPipeline() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [milestones, setMilestones] = useState([]);
  const [members, setMembers] = useState([]);
  const [mentorMemberProfileId, setMentorMemberProfileId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTasks, setSavingTasks] = useState(false);
  const [assigningMentor, setAssigningMentor] = useState(false);
  const [milestoneDraft, setMilestoneDraft] = useState({ title: '', notes: '' });
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  const isCommandStaff = useMemo(
    () => COMMAND_RANKS.has(String(member?.rank || '').toUpperCase()),
    [member?.rank]
  );

  const mentorOptions = useMemo(
    () =>
      members.filter((profile) => {
        const rank = String(profile?.rank || '').toUpperCase();
        const roles = Array.isArray(profile?.roles)
          ? profile.roles.map((role) => String(role || '').toLowerCase())
          : [];
        return (
          COMMAND_RANKS.has(rank) ||
          roles.includes('mentor') ||
          roles.includes('training') ||
          roles.includes('admin')
        );
      }),
    [members]
  );

  const mentorLabelMap = useMemo(() => {
    const map = {};
    for (const profile of members) {
      map[profile.id] =
        profile.display_callsign || profile.callsign || profile.full_name || profile.email || profile.id;
    }
    if (member?.id) {
      map[member.id] =
        map[member.id] || member.display_callsign || member.callsign || member.full_name || member.email || member.id;
    }
    return map;
  }, [members, member?.id, member?.display_callsign, member?.callsign, member?.full_name, member?.email]);

  const completedCount = tasks.filter((task) => task.status === 'complete').length;
  const completionPct = Math.round((completedCount / tasks.length) * 100);

  const loadPipeline = async () => {
    if (!member?.id) return;
    setLoading(true);
    try {
      const [profile, memberList] = await Promise.all([
        base44.entities.MemberProfile.get(member.id),
        base44.entities.MemberProfile.list('-created_date', 300).catch(() => []),
      ]);
      setTasks(normalizeTasks(profile?.onboarding_pipeline));
      setMentorMemberProfileId(getMentorId(profile));
      setMilestones(getMilestones(profile));
      setMembers(memberList || []);
    } catch (error) {
      console.error('Failed to load onboarding pipeline:', error);
      setTasks(DEFAULT_TASKS);
      setMilestones([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [member?.id]);

  const savePipeline = async (nextTasks) => {
    try {
      setSavingTasks(true);
      setTasks(nextTasks);
      const response = await invokeMemberFunction('updateOnboardingPipeline', {
        action: 'set_pipeline',
        targetMemberProfileId: member?.id,
        pipelineTasks: nextTasks,
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setStatusBanner({ type: 'success', message: 'Checklist updated.' });
      } else {
        setStatusBanner({ type: 'error', message: payload?.error || 'Failed to update checklist.' });
      }
    } catch (error) {
      console.error('Failed to update onboarding pipeline:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to update checklist.',
      });
      await loadPipeline();
    } finally {
      setSavingTasks(false);
    }
  };

  const toggleTask = async (taskId) => {
    if (!taskId) return;
    const nextTasks = tasks.map((task) => {
      if (task.id !== taskId) return task;
      return { ...task, status: task.status === 'complete' ? 'pending' : 'complete' };
    });
    await savePipeline(nextTasks);
  };

  const assignMentor = async () => {
    try {
      setAssigningMentor(true);
      const response = await invokeMemberFunction('updateOnboardingPipeline', {
        action: 'assign_mentor',
        targetMemberProfileId: member?.id,
        mentorMemberProfileId: mentorMemberProfileId || null,
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setTasks(normalizeTasks(payload.pipeline));
        setMentorMemberProfileId(payload.mentorMemberProfileId || '');
        setStatusBanner({ type: 'success', message: 'Mentor assignment updated.' });
      } else {
        setStatusBanner({ type: 'error', message: payload?.error || 'Failed to assign mentor.' });
      }
      await loadPipeline();
    } catch (error) {
      console.error('Failed to assign mentor:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to assign mentor.',
      });
    } finally {
      setAssigningMentor(false);
    }
  };

  const addMilestone = async () => {
    if (!milestoneDraft.title.trim()) return;
    try {
      setSavingMilestone(true);
      const response = await invokeMemberFunction('updateOnboardingPipeline', {
        action: 'upsert_milestone',
        targetMemberProfileId: member?.id,
        milestone: {
          title: milestoneDraft.title.trim(),
          notes: milestoneDraft.notes.trim(),
          status: 'pending',
        },
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setTasks(normalizeTasks(payload.pipeline));
        setMilestones(payload.milestones || []);
        setMilestoneDraft({ title: '', notes: '' });
        setStatusBanner({ type: 'success', message: 'Training milestone added.' });
      } else {
        setStatusBanner({ type: 'error', message: payload?.error || 'Failed to add milestone.' });
      }
    } catch (error) {
      console.error('Failed to add milestone:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to add milestone.',
      });
    } finally {
      setSavingMilestone(false);
    }
  };

  const toggleMilestone = async (milestone) => {
    try {
      const response = await invokeMemberFunction('updateOnboardingPipeline', {
        action: 'upsert_milestone',
        targetMemberProfileId: member?.id,
        milestone: {
          id: milestone.id,
          title: milestone.title,
          notes: milestone.notes || '',
          status: milestone.status === 'complete' ? 'pending' : 'complete',
        },
      });
      const payload = response?.data || response;
      if (payload?.success) {
        setTasks(normalizeTasks(payload.pipeline));
        setMilestones(payload.milestones || []);
      } else {
        setStatusBanner({ type: 'error', message: payload?.error || 'Failed to update milestone.' });
      }
    } catch (error) {
      console.error('Failed to update milestone:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Failed to update milestone.',
      });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading onboarding tasks...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Onboarding Pipeline</h1>
        <p className="text-zinc-400 text-sm">Checklist progression, mentor assignment, and training milestones</p>
        {statusBanner && (
          <div
            role={statusBanner.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-xs ${
              statusBanner.type === 'error'
                ? 'border-red-500/40 text-red-300 bg-red-500/10'
                : 'border-green-500/40 text-green-300 bg-green-500/10'
            }`}
          >
            {statusBanner.message}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-widest">
          <span>Onboarding Completion</span>
          <span>{completionPct}%</span>
        </div>
        <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-orange-500 transition-all duration-200" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <ClipboardList className="w-3 h-3" />
              Checklist
            </div>
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => toggleTask(task.id)}
                disabled={savingTasks}
                className="w-full flex items-center gap-3 p-3 border border-zinc-700 rounded bg-zinc-900/40 hover:border-orange-500/40 transition disabled:opacity-60"
              >
                {task.status === 'complete' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-500" />
                )}
                <span className={`text-sm ${task.status === 'complete' ? 'text-green-300 line-through' : 'text-white'}`}>
                  {task.label}
                </span>
              </button>
            ))}
            <Button variant="outline" onClick={() => savePipeline(DEFAULT_TASKS)} className="w-full" disabled={savingTasks}>
              Reset Checklist
            </Button>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <GraduationCap className="w-3 h-3" />
              Training Milestones
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                aria-label="Milestone title"
                value={milestoneDraft.title}
                onChange={(e) => setMilestoneDraft((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Milestone title"
              />
              <Input
                aria-label="Milestone notes"
                value={milestoneDraft.notes}
                onChange={(e) => setMilestoneDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes (optional)"
              />
            </div>
            <Button size="sm" variant="outline" onClick={addMilestone} disabled={savingMilestone || !milestoneDraft.title.trim()}>
              {savingMilestone ? 'Saving...' : 'Add Milestone'}
            </Button>

            <div className="space-y-2">
              {milestones.length === 0 ? (
                <div className="text-xs text-zinc-500">No training milestones added yet.</div>
              ) : (
                milestones.map((milestone) => (
                  <button
                    key={milestone.id}
                    onClick={() => toggleMilestone(milestone)}
                    className="w-full text-left border border-zinc-700 rounded p-3 bg-zinc-900/40 hover:border-orange-500/40 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-white">{milestone.title}</div>
                      <div
                        className={`text-[10px] uppercase px-2 py-1 rounded border ${
                          milestone.status === 'complete'
                            ? 'text-green-300 border-green-500/30 bg-green-500/10'
                            : 'text-zinc-300 border-zinc-500/30 bg-zinc-500/10'
                        }`}
                      >
                        {milestone.status === 'complete' ? 'Complete' : 'Pending'}
                      </div>
                    </div>
                    {milestone.notes && <div className="text-xs text-zinc-400 mt-1">{milestone.notes}</div>}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <UserPlus className="w-3 h-3" />
              Mentor Assignment
            </div>
            <select
              aria-label="Select mentor"
              value={mentorMemberProfileId}
              onChange={(e) => setMentorMemberProfileId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="">No mentor assigned</option>
              {mentorOptions.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {mentorLabelMap[profile.id] || profile.id}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={assignMentor} disabled={assigningMentor}>
              {assigningMentor ? 'Updating...' : 'Assign Mentor'}
            </Button>
            {!isCommandStaff && (
              <div className="text-[10px] text-zinc-500">
                Mentor list is filtered to command/training staff to match onboarding policy.
              </div>
            )}
            {mentorMemberProfileId && (
              <div className="text-xs text-zinc-400">
                Current mentor: <span className="text-zinc-200">{mentorLabelMap[mentorMemberProfileId] || mentorMemberProfileId}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
