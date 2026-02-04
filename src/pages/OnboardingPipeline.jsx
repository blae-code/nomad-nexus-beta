import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react';

const DEFAULT_TASKS = [
  { id: 'charter', label: 'Read the Redscar Charter', status: 'pending' },
  { id: 'dossier', label: 'Complete member dossier', status: 'pending' },
  { id: 'training', label: 'Finish basic training', status: 'pending' },
  { id: 'mentor', label: 'Assigned a mentor', status: 'pending' },
  { id: 'first-op', label: 'Participate in first operation', status: 'pending' },
];

export default function OnboardingPipeline() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPipeline = async () => {
      if (!member?.id) return;
      setLoading(true);
      try {
        const profile = await base44.entities.MemberProfile.get(member.id);
        const storedTasks = Array.isArray(profile?.onboarding_pipeline)
          ? profile.onboarding_pipeline
          : DEFAULT_TASKS;
        setTasks(storedTasks);
      } catch (error) {
        console.error('Failed to load onboarding pipeline:', error);
        setTasks(DEFAULT_TASKS);
      } finally {
        setLoading(false);
      }
    };

    loadPipeline();
  }, [member?.id]);

  const toggleTask = async (taskId) => {
    const next = tasks.map((task) => {
      if (task.id !== taskId) return task;
      return { ...task, status: task.status === 'complete' ? 'pending' : 'complete' };
    });
    setTasks(next);
    try {
      await base44.entities.MemberProfile.update(member.id, { onboarding_pipeline: next });
    } catch (error) {
      console.error('Failed to update onboarding pipeline:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading onboarding tasks...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Onboarding Pipeline</h1>
        <p className="text-zinc-400 text-sm">Track your progress to full Nomad status</p>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
          <ClipboardList className="w-3 h-3" />
          Checklist
        </div>
        {tasks.map((task) => (
          <button
            key={task.id}
            onClick={() => toggleTask(task.id)}
            className="w-full flex items-center gap-3 p-3 border border-zinc-700 rounded bg-zinc-900/40 hover:border-orange-500/40 transition"
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
        <Button variant="outline" onClick={() => setTasks(DEFAULT_TASKS)} className="w-full">
          Reset Checklist
        </Button>
      </div>
    </div>
  );
}
