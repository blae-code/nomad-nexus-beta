import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Command } from 'lucide-react';
import { cn } from '@/lib/utils';

const COMMAND_SETS = {
  PLANNED: [
    { id: 'start', label: 'START OPERATION', icon: '▶', color: 'text-emerald-400' },
    { id: 'lock_plan', label: 'LOCK PLAN', icon: '🔒', color: 'text-amber-400' },
    { id: 'load_brief', label: 'LOAD BRIEF', icon: '📋', color: 'text-cyan-400' }
  ],
  RUNNING: [
    { id: 'declare_hot', label: 'DECLARE HOT ZONE', icon: '🔴', color: 'text-red-400' },
    { id: 'request_support', label: 'REQUEST SUPPORT', icon: '📡', color: 'text-yellow-400' },
    { id: 'update_status', label: 'UPDATE SQUAD STATUS', icon: '🎯', color: 'text-blue-400' },
    { id: 'broadcast', label: 'BROADCAST COMMAND', icon: '📢', color: 'text-orange-400' },
    { id: 'end_op', label: 'END OPERATION', icon: '⏹', color: 'text-red-500' }
  ],
  CLOSING: [
    { id: 'complete_aar', label: 'COMPLETE AAR', icon: '✓', color: 'text-emerald-400' },
    { id: 'settle_treasury', label: 'SETTLE TREASURY', icon: '💰', color: 'text-yellow-400' },
    { id: 'archive', label: 'ARCHIVE OPERATION', icon: '📦', color: 'text-purple-400' }
  ],
  CLOSED: [
    { id: 'view_archive', label: 'VIEW ARCHIVED OP', icon: '📂', color: 'text-zinc-400' },
    { id: 'export_report', label: 'EXPORT REPORT', icon: '📄', color: 'text-cyan-400' }
  ]
};

export default function OpsCommandPalette({ session, user, onNotification, isCommandRole }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const commandsMutation = useMutation({
    mutationFn: async (commandId) => {
      const actionMap = {
        start: () => {
          base44.entities.OpsSession.update(session.id, {
            status: 'RUNNING',
            started_at: new Date().toISOString(),
            operation_log: [
              ...(session.operation_log || []),
              {
                timestamp: new Date().toISOString(),
                type: 'status_update',
                actor_id: user.id,
                content: 'OPERATION STARTED'
              }
            ]
          });
          onNotification?.({
            type: 'success',
            title: 'Operation Started',
            message: `Operation transitioned to RUNNING status`,
            autoClose: 3000
          });
        },
        declare_hot: () => {
          base44.entities.OpsSession.update(session.id, {
            operation_log: [
              ...(session.operation_log || []),
              {
                timestamp: new Date().toISOString(),
                type: 'command',
                actor_id: user.id,
                content: 'HOT ZONE DECLARED - All squads maintain defensive posture'
              }
            ]
          });
          onNotification?.({
            type: 'alert',
            title: 'HOT ZONE ACTIVE',
            message: 'Combat zone declared - all units respond',
            autoClose: 5000
          });
        },
        broadcast: () => {
          onNotification?.({
            type: 'command',
            title: 'Command Broadcast',
            message: 'Broadcasting tactical update to all nets...',
            autoClose: 2000
          });
        },
        end_op: () => {
          base44.entities.OpsSession.update(session.id, {
            status: 'CLOSING',
            operation_log: [
              ...(session.operation_log || []),
              {
                timestamp: new Date().toISOString(),
                type: 'status_update',
                actor_id: user.id,
                content: 'OPERATION ENDING - Transitioning to closeout'
              }
            ]
          });
          onNotification?.({
            type: 'info',
            title: 'Closing Operation',
            message: 'Operation transitioned to CLOSING status',
            autoClose: 3000
          });
        },
        archive: () => {
          onNotification?.({
            type: 'success',
            title: 'Operation Archived',
            message: 'Operation moved to archive and locked',
            autoClose: 3000
          });
        }
      };

      actionMap[commandId]?.();
    }
  });

  const availableCommands = COMMAND_SETS[session?.status] || [];
  const filteredCommands = isCommandRole
    ? availableCommands
    : availableCommands.filter(cmd => !['declare_hot', 'broadcast', 'end_op'].includes(cmd.id));

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-zinc-900 border border-zinc-700 hover:border-[#ea580c] text-[9px] font-bold uppercase text-zinc-400 hover:text-[#ea580c] transition-all rounded-none z-50"
        title="Ops Command Palette (Space)"
      >
        <Command className="w-3 h-3" />
        OPS COMMANDS
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-96 bg-zinc-900 border border-zinc-700 rounded-none shadow-xl">
        <div className="px-4 py-3 border-b border-zinc-800">
          <p className="text-[10px] font-bold uppercase text-zinc-400">
            OPERATION: {session?.status}
          </p>
          <p className="text-[8px] text-zinc-600 mt-1">
            {filteredCommands.length} available actions
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => {
                commandsMutation.mutate(cmd.id);
                setOpen(false);
              }}
              disabled={commandsMutation.isPending}
              className="w-full px-4 py-2.5 text-left border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors text-[9px] font-mono"
            >
              <span className={cn('font-bold', cmd.color)}>{cmd.icon}</span>
              <span className="ml-2 text-zinc-300">{cmd.label}</span>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-zinc-800 text-[8px] text-zinc-600">
          <button
            onClick={() => setOpen(false)}
            className="text-zinc-500 hover:text-zinc-400"
          >
            Press ESC or click to close
          </button>
        </div>
      </div>
    </div>
  );
}