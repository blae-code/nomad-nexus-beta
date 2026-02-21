import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Users, Target, Clock, CheckCircle2, MessageSquare, Radio } from 'lucide-react';
import { NexusBadge, NexusButton } from '../primitives';
import { useActiveOp } from '@/components/ops/ActiveOpProvider';

export default function OperationModeFocus() {
  const activeOp = useActiveOp();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!activeOp?.activeEvent?.id) return;
    
    const loadOpData = async () => {
      try {
        const taskList = await base44.entities.Task?.filter({ operation_id: activeOp.activeEvent.id }).catch(() => []);
        setTasks(taskList || []);
      } catch (err) {
        console.error('Failed to load operation data:', err);
      }
    };

    loadOpData();
  }, [activeOp?.activeEvent?.id]);

  if (!activeOp?.activeEvent) {
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

  const event = activeOp.activeEvent;
  const participants = activeOp?.participants || [];
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full flex gap-3">
      {/* Main Operation Overview */}
      <div className="flex-1 rounded-lg border border-zinc-800/60 bg-zinc-950/80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/60 bg-zinc-900/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-orange-400 uppercase tracking-wide">{event.title}</h2>
              <p className="text-xs text-zinc-400 mt-1">{event.description || 'No description'}</p>
            </div>
            <NexusBadge tone="active" className="text-xs">
              {event.phase || 'ACTIVE'}
            </NexusBadge>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="px-4 py-3 border-b border-zinc-800/40 grid grid-cols-4 gap-3">
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
              <Users className="w-3 h-3" />
              Team
            </div>
            <div className="text-xl font-bold text-zinc-100">{participants.length}</div>
          </div>
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
              <Target className="w-3 h-3" />
              Tasks
            </div>
            <div className="text-xl font-bold text-zinc-100">{completedTasks}/{totalTasks}</div>
          </div>
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
              <Target className="w-3 h-3" />
              Progress
            </div>
            <div className="text-xl font-bold text-zinc-100">{progress}%</div>
          </div>
          <div className="rounded border border-zinc-800/60 bg-zinc-900/30 px-3 py-2">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-wider mb-1">
              <Clock className="w-3 h-3" />
              Duration
            </div>
            <div className="text-xl font-bold text-zinc-100">
              {event.start_time ? Math.round((Date.now() - new Date(event.start_time).getTime()) / 60000) : '0'}m
            </div>
          </div>
        </div>

        {/* Objectives */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-2 border-b border-zinc-800/40 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Objectives</h3>
            <NexusButton size="sm" intent="subtle">Add Objective</NexusButton>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(event.objectives || []).map((obj, i) => (
              <div key={obj.id || i} className="rounded border border-zinc-800/60 bg-zinc-900/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {obj.is_completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-zinc-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-sm ${obj.is_completed ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                        {obj.text}
                      </p>
                      {obj.sub_tasks?.length > 0 && (
                        <div className="mt-2 space-y-1 pl-2 border-l border-zinc-800">
                          {obj.sub_tasks.map((sub, j) => (
                            <div key={sub.id || j} className="flex items-center gap-2">
                              {sub.is_completed ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                              ) : (
                                <div className="w-3 h-3 rounded-full border border-zinc-600 flex-shrink-0" />
                              )}
                              <span className={`text-xs ${sub.is_completed ? 'text-zinc-600 line-through' : 'text-zinc-400'}`}>
                                {sub.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!event.objectives || event.objectives.length === 0) && (
              <div className="text-center py-8 text-zinc-600 text-xs">
                No objectives defined
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Panel - Team & Tasks */}
      <div className="w-80 flex-shrink-0 rounded-lg border border-zinc-800/60 bg-zinc-950/80 flex flex-col overflow-hidden">
        {/* Team */}
        <div className="flex-shrink-0 border-b border-zinc-800/60">
          <div className="px-3 py-2 bg-zinc-900/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Team ({participants.length})</h3>
          </div>
          <div className="p-2 space-y-1">
            {participants.slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-zinc-800/40 transition-colors">
                <span className="text-xs text-zinc-300 truncate">{p.callsign || p.name || 'Unknown'}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">{p.role || 'Member'}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-zinc-800/40 bg-zinc-900/30">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">Tasks</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {tasks.slice(0, 10).map(task => (
              <div key={task.id} className="rounded border border-zinc-800/60 bg-zinc-900/30 px-2 py-1.5">
                <div className="flex items-start gap-2">
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-zinc-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-xs ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                      {task.title}
                    </p>
                    {task.priority && (
                      <NexusBadge 
                        tone={task.priority === 'critical' ? 'danger' : task.priority === 'high' ? 'warning' : 'neutral'} 
                        className="text-[9px] mt-1"
                      >
                        {task.priority}
                      </NexusBadge>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-6 text-zinc-600 text-xs">
                No tasks yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}