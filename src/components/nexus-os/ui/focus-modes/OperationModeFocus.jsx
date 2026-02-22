import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, MessageSquare, Radio, Target, Users } from 'lucide-react';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';
import { NexusBadge, NexusButton } from '../primitives';
import { listBase44OperationTasks } from '@/components/nexus-os/services';

const PAGE_SIZE = 6;

function pageSlice(items, page, pageSize = PAGE_SIZE) {
  return items.slice(page * pageSize, page * pageSize + pageSize);
}

function pageCount(items, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(items.length / pageSize));
}

function Pager({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-1.5">
      <NexusButton size="sm" intent="subtle" onClick={onPrev} disabled={page === 0}>
        Prev
      </NexusButton>
      <NexusBadge tone="neutral">{page + 1}/{totalPages}</NexusBadge>
      <NexusButton size="sm" intent="subtle" onClick={onNext} disabled={page >= totalPages - 1}>
        Next
      </NexusButton>
    </div>
  );
}

export default function OperationModeFocus() {
  const activeOp = useActiveOp();
  const [tasks, setTasks] = useState([]);
  const [phase, setPhase] = useState('brief');
  const [surfaceMode, setSurfaceMode] = useState('standard');

  const [objectivePage, setObjectivePage] = useState(0);
  const [taskPage, setTaskPage] = useState(0);
  const [teamPage, setTeamPage] = useState(0);

  useEffect(() => {
    if (!activeOp?.activeEvent?.id) {
      setTasks([]);
      return;
    }

    const loadOpData = async () => {
      try {
        const taskList = await listBase44OperationTasks(activeOp.activeEvent.id).catch(() => []);
        setTasks(taskList || []);
      } catch (err) {
        console.error('Failed to load operation data:', err);
      }
    };

    loadOpData();
  }, [activeOp?.activeEvent?.id]);

  const event = activeOp?.activeEvent || null;
  const participants = activeOp?.participants || [];
  const objectives = Array.isArray(event?.objectives) ? event.objectives : [];
  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const commsScopeLabel = participants.length > 0 ? 'Team scoped' : 'Unassigned';

  const objectivePages = pageCount(objectives);
  const taskPages = pageCount(tasks);
  const teamPages = pageCount(participants);

  useEffect(() => {
    setObjectivePage((current) => Math.min(current, objectivePages - 1));
  }, [objectivePages]);

  useEffect(() => {
    setTaskPage((current) => Math.min(current, taskPages - 1));
  }, [taskPages]);

  useEffect(() => {
    setTeamPage((current) => Math.min(current, teamPages - 1));
  }, [teamPages]);

  const visibleObjectives = useMemo(() => pageSlice(objectives, objectivePage), [objectives, objectivePage]);
  const visibleTasks = useMemo(() => pageSlice(tasks, taskPage), [tasks, taskPage]);
  const visibleTeam = useMemo(() => pageSlice(participants, teamPage), [participants, teamPage]);

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Calendar className="w-12 h-12 text-zinc-700 mx-auto" />
          <p className="text-sm text-zinc-500">No active operation</p>
          <NexusButton size="sm" intent="primary">
            Create Operation
          </NexusButton>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-3">
      <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-orange-400 uppercase tracking-wide truncate">{event.title}</h2>
            <p className="text-xs text-zinc-400 truncate">{event.description || 'No description'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NexusBadge tone="active">{event.phase || 'ACTIVE'}</NexusBadge>
            <button
              type="button"
              onClick={() => setSurfaceMode('standard')}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${surfaceMode === 'standard' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setSurfaceMode('command')}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${surfaceMode === 'command' ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
            >
              Command
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">
              <Users className="w-3 h-3" /> Team
            </div>
            <div className="text-lg font-bold text-zinc-100">{participants.length}</div>
          </div>
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">
              <Target className="w-3 h-3" /> Objectives
            </div>
            <div className="text-lg font-bold text-zinc-100">{objectives.length}</div>
          </div>
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">
              <CheckCircle2 className="w-3 h-3" /> Progress
            </div>
            <div className="text-lg font-bold text-zinc-100">{progress}%</div>
          </div>
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-0.5">
              <Clock className="w-3 h-3" /> Duration
            </div>
            <div className="text-lg font-bold text-zinc-100">
              {event.start_time ? Math.round((Date.now() - new Date(event.start_time).getTime()) / 60000) : 0}m
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 px-3 py-2 flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setPhase('brief')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded ${phase === 'brief' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
        >
          Brief
        </button>
        <button
          type="button"
          onClick={() => setPhase('execute')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded ${phase === 'execute' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
        >
          Execute
        </button>
        <button
          type="button"
          onClick={() => setPhase('comms')}
          className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wide rounded ${phase === 'comms' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'text-zinc-500 hover:text-zinc-300 border border-zinc-700'}`}
        >
          Comms
        </button>
      </div>

      <div className={`flex-1 min-h-0 grid gap-3 ${surfaceMode === 'command' ? 'xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]' : 'grid-cols-1'}`}>
        <section className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3 flex flex-col gap-2 min-h-0">
          {phase === 'brief' ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Mission Objectives</h3>
                <Pager
                  page={objectivePage}
                  totalPages={objectivePages}
                  onPrev={() => setObjectivePage((current) => Math.max(0, current - 1))}
                  onNext={() => setObjectivePage((current) => Math.min(objectivePages - 1, current + 1))}
                />
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {visibleObjectives.map((objective, index) => (
                  <div key={objective.id || `${objective.text}-${index}`} className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2">
                    <div className="flex items-start gap-2">
                      {objective.is_completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 mt-0.5" />
                      )}
                      <div className="text-xs text-zinc-300">{objective.text || 'Objective'}</div>
                    </div>
                  </div>
                ))}
                {visibleObjectives.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 text-xs text-zinc-500">
                    No objectives defined.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {phase === 'execute' ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Execution Tasks</h3>
                <Pager
                  page={taskPage}
                  totalPages={taskPages}
                  onPrev={() => setTaskPage((current) => Math.max(0, current - 1))}
                  onNext={() => setTaskPage((current) => Math.min(taskPages - 1, current + 1))}
                />
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {visibleTasks.map((task) => (
                  <div key={task.id} className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`text-xs ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>{task.title || 'Untitled task'}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{task.assignee || 'Unassigned'}</div>
                      </div>
                      {task.priority ? (
                        <NexusBadge tone={task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'neutral'}>
                          {task.priority}
                        </NexusBadge>
                      ) : null}
                    </div>
                  </div>
                ))}
                {visibleTasks.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 text-xs text-zinc-500">
                    No tasks currently queued.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {phase === 'comms' ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Operation Team Net</h3>
                <Pager
                  page={teamPage}
                  totalPages={teamPages}
                  onPrev={() => setTeamPage((current) => Math.max(0, current - 1))}
                  onNext={() => setTeamPage((current) => Math.min(teamPages - 1, current + 1))}
                />
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {visibleTeam.map((member) => (
                  <div key={member.id} className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-zinc-200 truncate">{member.callsign || member.name || 'Unknown'}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{member.role || 'Member'}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-[10px] text-zinc-400">Assigned</span>
                    </div>
                  </div>
                ))}
                {visibleTeam.length === 0 ? (
                  <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 text-xs text-zinc-500">
                    Team roster unavailable.
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </section>

        {surfaceMode === 'command' ? (
          <aside className="rounded-lg border border-zinc-800/60 bg-zinc-950/80 p-3 flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Command Actions</h3>
            <div className="grid grid-cols-1 gap-1.5">
              <NexusButton size="sm" intent="subtle" disabled>Issue Tactical Order</NexusButton>
              <NexusButton size="sm" intent="subtle" disabled>Broadcast Check-In</NexusButton>
              <NexusButton size="sm" intent="subtle" disabled>Sync Voice Lanes</NexusButton>
              <NexusButton size="sm" intent="subtle" disabled>Open Ops Report</NexusButton>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 text-[11px] text-zinc-500">
              Command mode exposes high-frequency controls. Standard mode keeps this surface clean for at-a-glance operation flow.
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 text-[11px] text-zinc-400">
              <div className="flex items-center justify-between gap-2"><span>Open tasks</span><span className="text-zinc-200">{Math.max(0, totalTasks - completedTasks)}</span></div>
              <div className="flex items-center justify-between gap-2"><span>Completed</span><span className="text-zinc-200">{completedTasks}</span></div>
              <div className="flex items-center justify-between gap-2"><span>Participants</span><span className="text-zinc-200">{participants.length}</span></div>
              <div className="flex items-center justify-between gap-2"><span>Comms scope</span><span className="text-zinc-200">{commsScopeLabel}</span></div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900/35 px-2.5 py-2 text-[11px] text-zinc-500 flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-orange-400" />
              Keep comms discipline in sync with current phase before issuing escalations.
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
