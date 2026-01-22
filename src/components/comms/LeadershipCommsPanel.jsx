import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Lock, Send, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function LeadershipCommsPanel({ eventId }) {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [showCompose, setShowCompose] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [classLevel, setClassLevel] = useState('secret');
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['leadership-comms', eventId],
    queryFn: async () => {
      const results = await base44.entities.LeadershipComms.filter({ event_id: eventId });
      return results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    refetchInterval: 3000
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-leadership'],
    queryFn: () => base44.entities.User.list()
  });

  const sendMutation = useMutation({
    mutationFn: async (msg) => {
      return base44.entities.LeadershipComms.create({
        sender_id: currentUser.id,
        recipient_ids: selectedRecipients,
        message: msg,
        classification_level: classLevel,
        event_id: eventId,
        requires_acknowledgment: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-comms'] });
      setMessageText('');
      setSelectedRecipients([]);
      setShowCompose(false);
    }
  });

  const ackMutation = useMutation({
    mutationFn: async (msgId) => {
      const msg = messages.find(m => m.id === msgId);
      const newAcked = [...(msg.acknowledged_by || []), currentUser.id];
      return base44.entities.LeadershipComms.update(msgId, {
        acknowledged_by: newAcked
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadership-comms'] });
    }
  });

  const classLevelColors = {
    confidential: 'text-yellow-500',
    secret: 'text-orange-500',
    'top-secret': 'text-red-500'
  };

  const filteredMessages = messages.filter(m =>
    m.sender_id === currentUser?.id || m.recipient_ids?.includes(currentUser?.id)
  );

  return (
    <div className="border border-zinc-800 bg-zinc-950/50 p-2 space-y-2">
      <div className="flex items-center justify-between px-2 py-1 bg-zinc-900/50 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] font-bold text-amber-400 uppercase">Leadership Comms</span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCompose(!showCompose)}
          className="h-6 px-2 text-[8px] bg-amber-900/50 hover:bg-amber-900 border border-amber-700 text-amber-300"
        >
          COMPOSE
        </Button>
      </div>

      {showCompose && (
        <div className="space-y-1.5 p-2 bg-zinc-900/50 border border-zinc-700">
          <div className="space-y-1">
            <label className="text-[8px] text-zinc-400">RECIPIENTS:</label>
            <div className="grid grid-cols-2 gap-1">
              {users.filter(u => u.id !== currentUser?.id).map(u => (
                <button
                  key={u.id}
                  onClick={() =>
                    setSelectedRecipients(
                      selectedRecipients.includes(u.id)
                        ? selectedRecipients.filter(id => id !== u.id)
                        : [...selectedRecipients, u.id]
                    )
                  }
                  className={cn(
                    'px-1.5 py-0.5 text-[8px] text-left border transition-colors',
                    selectedRecipients.includes(u.id)
                      ? 'bg-blue-900 border-blue-700 text-blue-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  )}
                >
                  {u.full_name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] text-zinc-400">CLASSIFICATION:</label>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 text-[8px] px-1.5 py-0.5 text-white"
            >
              <option value="confidential">CONFIDENTIAL</option>
              <option value="secret">SECRET</option>
              <option value="top-secret">TOP SECRET</option>
            </select>
          </div>

          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Encrypted message..."
            className="w-full bg-zinc-900 border border-zinc-700 text-[9px] p-1.5 text-white placeholder-zinc-600 font-mono"
            rows="3"
          />

          <div className="flex gap-1">
            <Button
              onClick={() => sendMutation.mutate(messageText)}
              disabled={!messageText.trim() || selectedRecipients.length === 0}
              className="flex-1 h-6 text-[8px] bg-emerald-900 hover:bg-emerald-800 text-emerald-300 disabled:opacity-50"
            >
              <Send className="w-2.5 h-2.5 mr-1" /> SEND
            </Button>
            <Button
              onClick={() => setShowCompose(false)}
              variant="outline"
              className="flex-1 h-6 text-[8px]"
            >
              CANCEL
            </Button>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {filteredMessages.length === 0 ? (
          <div className="text-[8px] text-zinc-600 text-center py-3">No secure messages</div>
        ) : (
          filteredMessages.slice(0, 10).map(msg => {
            const sender = users.find(u => u.id === msg.sender_id);
            const isUnacked = !msg.acknowledged_by?.includes(currentUser?.id);
            return (
              <div
                key={msg.id}
                className={cn(
                  'p-1.5 border-l-2 text-[8px] space-y-1',
                  msg.sender_id === currentUser?.id
                    ? 'bg-blue-950/30 border-l-blue-600'
                    : 'bg-amber-950/30 border-l-amber-600'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Lock className={cn('w-2.5 h-2.5', classLevelColors[msg.classification_level])} />
                    <span className="font-bold text-zinc-300">{sender?.full_name}</span>
                  </div>
                  <span className={cn('font-mono text-[7px]', classLevelColors[msg.classification_level])}>
                    {msg.classification_level.toUpperCase()}
                  </span>
                </div>
                <p className="text-zinc-400 break-words">{msg.message}</p>
                {isUnacked && msg.sender_id !== currentUser?.id && (
                  <Button
                    onClick={() => ackMutation.mutate(msg.id)}
                    className="w-full h-5 text-[7px] bg-emerald-900/50 hover:bg-emerald-900 text-emerald-300"
                  >
                    <Check className="w-2 h-2 mr-1" /> ACKNOWLEDGE
                  </Button>
                )}
                {msg.sender_id === currentUser?.id && (
                  <div className="text-[7px] text-zinc-600">
                    {msg.acknowledged_by?.length || 0} / {msg.recipient_ids?.length || 0} acked
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}