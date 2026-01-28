import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Radio, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Floor Control Panel
 * Allows command to enforce PTT (Push-to-Talk) or open-mic discipline
 * Discipline type depends on event type (Focused = PTT, Casual = open-mic)
 */
export default function FloorControlPanel({ eventId, user, event }) {
  const queryClient = useQueryClient();

  // Determine if user can control floor
  const canControlFloor = user?.rank === 'Founder' || user?.role === 'admin';

  // Get event discipline from event type
  const discipline = event?.event_type === 'focused' ? 'PTT' : 'OPEN_MIC';
  const isDisciplined = discipline === 'PTT';

  // Update event discipline mutation
  const updateDisciplineMutation = useMutation({
    mutationFn: (newDiscipline) =>
      base44.entities.Event.update(eventId, {
        metadata: {
          ...event?.metadata,
          floor_discipline: newDiscipline
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    }
  });

  if (!canControlFloor) {
    return (
      <div className="border border-zinc-800/50 bg-zinc-950/50 rounded-sm p-2">
        <div className="flex items-center gap-2 mb-2">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">FLOOR CONTROL</span>
        </div>
        <div className={cn(
          'flex items-center justify-between px-2 py-1.5 rounded-sm text-[8px] font-bold uppercase',
          isDisciplined
            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
            : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
        )}>
          <span>{isDisciplined ? 'PTT Mode' : 'Open Mic'}</span>
          {isDisciplined ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </div>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800/50 bg-zinc-950/50 rounded-sm">
      <div className="p-2 space-y-2">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider">FLOOR CONTROL</span>
        </div>

        <div className="space-y-1">
          <div className={cn(
            'flex items-center justify-between px-2 py-1.5 rounded-sm text-[8px] font-bold uppercase transition-all',
            isDisciplined
              ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
              : 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
          )}>
            <span>{isDisciplined ? 'PTT Mode' : 'Open Mic'}</span>
            {isDisciplined ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </div>

          <div className="text-[7px] text-zinc-500 px-1 py-0.5">
            {isDisciplined
              ? 'Users must press & hold to speak'
              : 'Users can speak freely (casual)'}
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-2 mt-2 flex gap-1">
          <button
            onClick={() => updateDisciplineMutation.mutate('PTT')}
            disabled={isDisciplined || updateDisciplineMutation.isPending}
            className={cn(
              'flex-1 px-2 py-1 text-[8px] font-bold uppercase border transition-all',
              isDisciplined
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 cursor-default'
                : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:border-amber-500/30 hover:text-amber-400'
            )}
          >
            <Lock className="w-2.5 h-2.5 inline mr-1" />
            PTT
          </button>
          <button
            onClick={() => updateDisciplineMutation.mutate('OPEN_MIC')}
            disabled={!isDisciplined || updateDisciplineMutation.isPending}
            className={cn(
              'flex-1 px-2 py-1 text-[8px] font-bold uppercase border transition-all',
              !isDisciplined
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 cursor-default'
                : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:border-emerald-500/30 hover:text-emerald-400'
            )}
          >
            <Unlock className="w-2.5 h-2.5 inline mr-1" />
            Open
          </button>
        </div>
      </div>
    </div>
  );
}