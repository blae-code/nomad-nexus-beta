import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MessageSquare, Send, Users, Shield, Swords, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function WhisperInterface({ user, eventId, netId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState('role'); // role, rank, squad
  const [selectedTargets, setSelectedTargets] = useState([]);
  const queryClient = useQueryClient();

  // Check if user has whisper permissions
  const allowedRanks = ['Pioneer', 'Founder', 'Voyager'];
  const canWhisper = allowedRanks.includes(user?.rank);

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => base44.entities.Role.list(),
    enabled: isOpen && targetType === 'role'
  });

  // Fetch squads
  const { data: squads = [] } = useQuery({
    queryKey: ['squads'],
    queryFn: () => base44.entities.Squad.list(),
    enabled: isOpen && targetType === 'squad'
  });

  const whisperMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('sendWhisper', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Whisper sent to ${data.recipients_count} personnel`);
      setMessage('');
      setSelectedTargets([]);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send whisper');
    }
  });

  const handleSend = () => {
    if (!message.trim() || selectedTargets.length === 0) {
      toast.error('Select targets and enter a message');
      return;
    }

    whisperMutation.mutate({
      message: message.trim(),
      targetType,
      targetIds: selectedTargets,
      eventId,
      netId
    });
  };

  const toggleTarget = (targetId) => {
    setSelectedTargets(prev =>
      prev.includes(targetId)
        ? prev.filter(id => id !== targetId)
        : [...prev, targetId]
    );
  };

  const ranks = ['Vagrant', 'Scout', 'Voyager', 'Founder', 'Pioneer'];

  if (!canWhisper) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 bg-purple-950/30 border-purple-900/50 text-purple-300 hover:bg-purple-950/50"
      >
        <MessageSquare className="w-3 h-3" />
        WHISPER
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-zinc-950 border-purple-900/50 text-zinc-200 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-400">
              <MessageSquare className="w-5 h-5" />
              COMMAND WHISPER
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Send private message to specific roles, ranks, or squads
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Target Type Selector */}
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">
                Target Type
              </label>
              <div className="flex gap-2">
                <Button
                  variant={targetType === 'role' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setTargetType('role'); setSelectedTargets([]); }}
                  className={cn(
                    'gap-2',
                    targetType === 'role' && 'bg-purple-600'
                  )}
                >
                  <Shield className="w-3 h-3" />
                  Roles
                </Button>
                <Button
                  variant={targetType === 'rank' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setTargetType('rank'); setSelectedTargets([]); }}
                  className={cn(
                    'gap-2',
                    targetType === 'rank' && 'bg-purple-600'
                  )}
                >
                  <Users className="w-3 h-3" />
                  Ranks
                </Button>
                <Button
                  variant={targetType === 'squad' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setTargetType('squad'); setSelectedTargets([]); }}
                  className={cn(
                    'gap-2',
                    targetType === 'squad' && 'bg-purple-600'
                  )}
                >
                  <Swords className="w-3 h-3" />
                  Squads
                </Button>
              </div>
            </div>

            {/* Target Selection */}
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">
                Select Recipients
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 bg-zinc-900/50 border border-zinc-800">
                {targetType === 'role' && roles.map(role => (
                  <div
                    key={role.id}
                    onClick={() => toggleTarget(role.id)}
                    className={cn(
                      'p-2 border cursor-pointer transition-all',
                      selectedTargets.includes(role.id)
                        ? 'bg-purple-950/50 border-purple-700 text-purple-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    )}
                  >
                    <div className="text-xs font-bold">{role.name}</div>
                    <div className="text-[9px] opacity-70">{role.description}</div>
                  </div>
                ))}

                {targetType === 'rank' && ranks.map(rank => (
                  <div
                    key={rank}
                    onClick={() => toggleTarget(rank)}
                    className={cn(
                      'p-2 border cursor-pointer transition-all',
                      selectedTargets.includes(rank)
                        ? 'bg-purple-950/50 border-purple-700 text-purple-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    )}
                  >
                    <div className="text-xs font-bold">{rank}</div>
                  </div>
                ))}

                {targetType === 'squad' && squads.map(squad => (
                  <div
                    key={squad.id}
                    onClick={() => toggleTarget(squad.id)}
                    className={cn(
                      'p-2 border cursor-pointer transition-all',
                      selectedTargets.includes(squad.id)
                        ? 'bg-purple-950/50 border-purple-700 text-purple-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    )}
                  >
                    <div className="text-xs font-bold">{squad.name}</div>
                    <div className="text-[9px] opacity-70">{squad.hierarchy_level}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Targets Display */}
            {selectedTargets.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedTargets.map(targetId => {
                  let name = targetId;
                  if (targetType === 'role') {
                    name = roles.find(r => r.id === targetId)?.name || targetId;
                  } else if (targetType === 'squad') {
                    name = squads.find(s => s.id === targetId)?.name || targetId;
                  }
                  return (
                    <Badge
                      key={targetId}
                      className="bg-purple-900/50 text-purple-200 border-purple-700 gap-1"
                    >
                      {name}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-white"
                        onClick={() => toggleTarget(targetId)}
                      />
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Message Input */}
            <div>
              <label className="text-xs font-bold uppercase text-zinc-400 mb-2 block">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter private message..."
                className="bg-zinc-900 border-zinc-800 min-h-[100px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={whisperMutation.isPending || !message.trim() || selectedTargets.length === 0}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                {whisperMutation.isPending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-3 h-3" />
                    Send Whisper
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}