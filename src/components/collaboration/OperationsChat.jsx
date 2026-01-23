import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const OPS_CHANNEL_NAME = 'operations-general';

export default function OperationsChat({ user, className }) {
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Get or create operations channel
  const { data: channel } = useQuery({
    queryKey: ['ops-channel'],
    queryFn: async () => {
      const channels = await base44.entities.Channel.filter({ name: OPS_CHANNEL_NAME });
      if (channels.length > 0) return channels[0];
      
      // Create if doesn't exist
      return await base44.entities.Channel.create({
        name: OPS_CHANNEL_NAME,
        description: 'General operations coordination',
        is_private: false
      });
    }
  });

  // Fetch messages
  const { data: messages = [] } = useQuery({
    queryKey: ['ops-messages', channel?.id],
    queryFn: () => base44.entities.Message.filter({ channel_id: channel.id }, '-created_date', 100),
    enabled: !!channel?.id,
    refetchInterval: 3000
  });

  // Real-time subscription
  useEffect(() => {
    if (!channel?.id) return;
    
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel_id === channel.id) {
        queryClient.invalidateQueries(['ops-messages', channel.id]);
      }
    });
    
    return unsubscribe;
  }, [channel?.id, queryClient]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        channel_id: channel.id,
        user_id: user.id,
        content
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries(['ops-messages', channel.id]);
    },
    onError: () => toast.error('Failed to send message')
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  if (!channel) return null;

  return (
    <div className={cn('flex flex-col border border-zinc-800 bg-zinc-950/50', className)}>
      <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-900/50 flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-orange-500" />
        <span className="text-xs font-bold text-zinc-200 uppercase">Operations Chat</span>
      </div>

      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-600">No messages yet</p>
            </div>
          ) : (
            messages.slice().reverse().map((msg) => (
              <MessageBubble key={msg.id} message={msg} currentUserId={user?.id} />
            ))
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="p-2 border-t border-zinc-800">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="bg-zinc-900 border-zinc-800 text-xs"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || sendMutation.isPending}
            className="shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message, currentUserId }) {
  const isOwn = message.user_id === currentUserId;
  
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] p-2 text-xs',
        isOwn 
          ? 'bg-orange-950/50 border border-orange-900/50 text-orange-100' 
          : 'bg-zinc-900 border border-zinc-800 text-zinc-200'
      )}>
        {!isOwn && (
          <div className="text-[10px] text-zinc-500 mb-1 font-bold">
            {message.created_by || 'Unknown'}
          </div>
        )}
        <div className="break-words">{message.content}</div>
        <div className="text-[9px] text-zinc-600 mt-1">
          {new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}