import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';

export default function CommsDockPollsTab({ user }) {
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data: polls = [], isLoading } = useQuery({
    queryKey: ['polls', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      return base44.entities.Poll.filter(
        { scope: 'ORG' },
        '-created_date',
        15
      );
    },
    staleTime: 10000,
    enabled: !!user?.id
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, optionIds }) => {
      return base44.entities.PollVote.create({
        poll_id: pollId,
        user_id: user.id,
        selected_option_ids: optionIds
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    }
  });

  const openPolls = polls.filter(p => new Date(p.closes_at) > new Date());

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1 p-1">
        {isLoading ? (
          <p className="text-[8px] text-zinc-600">Loading polls...</p>
        ) : openPolls.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No active polls</p>
        ) : (
          openPolls.map(poll => (
            <div key={poll.id} className="px-2 py-1.5 border border-zinc-800 bg-zinc-900/30 rounded-none">
              <p className="text-[8px] font-bold text-zinc-300 mb-1">{poll.question}</p>
              <div className="space-y-0.5">
                {poll.options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => voteMutation.mutate({ pollId: poll.id, optionIds: [opt.id] })}
                    className="w-full text-left px-1.5 py-1 border border-zinc-700 hover:border-[#ea580c] bg-zinc-950/50 hover:bg-zinc-900/50 text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors"
                  >
                    ○ {opt.text}
                  </button>
                ))}
              </div>
              <p className="text-[7px] text-zinc-600 mt-1">{poll.vote_count} votes</p>
            </div>
          ))
        )}
      </div>

      <div className="px-2 py-1.5 border-t border-zinc-800 shrink-0">
        <button className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] transition-colors">
          <Plus className="w-2.5 h-2.5" />
          CREATE POLL
        </button>
      </div>
    </div>
  );
}