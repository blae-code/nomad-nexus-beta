import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function DMTab({ user, recipientId, recipientName }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: dmChannel } = useQuery({
    queryKey: ['dm-channel', user?.id, recipientId],
    queryFn: async () => {
      const channelName = `dm-${[user.id, recipientId].sort().join('-')}`;
      let existing = await base44.entities.Channel.filter({ name: channelName });
      
      if (existing.length > 0) return existing[0];
      
      return await base44.entities.Channel.create({
        name: channelName,
        type: 'text',
        category: 'casual',
        is_private: true
      });
    },
    enabled: !!user?.id && !!recipientId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['dm-messages', dmChannel?.id],
    queryFn: () => {
      if (!dmChannel?.id) return [];
      return base44.entities.Message.filter(
        { channel_id: dmChannel.id },
        '-created_date',
        50
      );
    },
    enabled: !!dmChannel?.id,
    refetchInterval: 2000
  });

  useEffect(() => {
    if (!dmChannel?.id) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel_id === dmChannel.id) {
        queryClient.invalidateQueries(['dm-messages', dmChannel.id]);
      }
    });
    return unsubscribe;
  }, [dmChannel?.id, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        channel_id: dmChannel.id,
        user_id: user.id,
        content: message,
        attachments: attachments.length > 0 ? attachments : undefined
      });
    },
    onSuccess: () => {
      setMessage('');
      setAttachments([]);
      queryClient.invalidateQueries(['dm-messages', dmChannel.id]);
    },
    onError: () => toast.error('Failed to send message')
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() && attachments.length === 0) return;
    sendMutation.mutate();
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const response = await base44.integrations.Core.UploadFile({ file });
      setAttachments([...attachments, response.file_url]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      <ScrollArea className="flex-1 p-3 border-b border-zinc-800">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-600">
              Start a conversation with {recipientName}
            </div>
          ) : (
            messages.slice().reverse().map((msg) => (
              <div key={msg.id} className={cn('flex', msg.user_id === user.id ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-xs text-xs p-2 rounded',
                  msg.user_id === user.id
                    ? 'bg-[#ea580c]/20 border border-[#ea580c]/30 text-[#ea580c]'
                    : 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                )}>
                  {msg.content}
                  {msg.attachments?.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-[9px] underline opacity-75 hover:opacity-100">
                          📎 File
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="flex gap-1 p-2 border-t border-zinc-800">
        <input
          type="file"
          id="dm-file-input"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <label htmlFor="dm-file-input">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-zinc-300">
            <Paperclip className="w-3.5 h-3.5" />
          </Button>
        </label>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message..."
          className="bg-zinc-900 border-zinc-800 text-xs h-7 py-1"
        />
        <Button type="submit" size="icon" className="h-7 w-7 bg-[#ea580c] hover:bg-[#c2410c]">
          <Send className="w-3 h-3" />
        </Button>
      </form>
    </div>
  );
}