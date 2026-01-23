import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Send, MessageCircle, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DirectMessaging({ user, recipientId, recipientName, trigger }) {
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Create or get DM channel
  const { data: dmChannel } = useQuery({
    queryKey: ['dm-channel', user?.id, recipientId],
    queryFn: async () => {
      const channelName = `dm-${[user.id, recipientId].sort().join('-')}`;
      const existing = await base44.entities.Channel.filter({ name: channelName });
      
      if (existing.length > 0) return existing[0];
      
      return await base44.entities.Channel.create({
        name: channelName,
        description: `Direct message between ${user.full_name} and ${recipientName}`,
        is_private: true
      });
    },
    enabled: !!user && !!recipientId && open
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['dm-messages', dmChannel?.id],
    queryFn: () => base44.entities.Message.filter({ channel_id: dmChannel.id }, '-created_date', 50),
    enabled: !!dmChannel?.id && open,
    refetchInterval: 2000
  });

  useEffect(() => {
    if (!dmChannel?.id || !open) return;
    
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel_id === dmChannel.id) {
        queryClient.invalidateQueries(['dm-messages', dmChannel.id]);
      }
    });
    
    return unsubscribe;
  }, [dmChannel?.id, open, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Message.create({
        channel_id: dmChannel.id,
        user_id: user.id,
        content
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries(['dm-messages', dmChannel.id]);
    },
    onError: () => toast.error('Failed to send message')
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMutation.mutate(message);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-2">
            <MessageCircle className="w-3 h-3" />
            Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-zinc-950 border-zinc-800 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-200 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            Direct Message — {recipientName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[400px]">
          <ScrollArea className="flex-1 p-3 border border-zinc-800 bg-zinc-900/30" ref={scrollRef}>
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <User className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-600">Start a conversation</p>
                </div>
              ) : (
                messages.slice().reverse().map((msg) => (
                  <DMBubble key={msg.id} message={msg} currentUserId={user?.id} />
                ))
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSend} className="flex gap-2 mt-3">
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
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DMBubble({ message, currentUserId }) {
  const isOwn = message.user_id === currentUserId;
  
  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[80%] p-2 text-xs',
        isOwn 
          ? 'bg-blue-950/50 border border-blue-900/50 text-blue-100' 
          : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
      )}>
        <div className="break-words">{message.content}</div>
        <div className="text-[9px] text-zinc-600 mt-1">
          {new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}