import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function GroupChatTab({ user, groupId, groupName }) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: groupChannel } = useQuery({
    queryKey: ['group-channel', groupId],
    queryFn: async () => {
      const channelName = `squad-${groupId}`;
      let existing = await base44.entities.Channel.filter({ name: channelName });
      
      if (existing.length > 0) return existing[0];
      
      return await base44.entities.Channel.create({
        name: channelName,
        type: 'text',
        category: 'squad',
        squad_id: groupId
      });
    },
    enabled: !!groupId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['group-messages', groupChannel?.id],
    queryFn: () => {
      if (!groupChannel?.id) return [];
      return base44.entities.Message.filter(
        { channel_id: groupChannel.id },
        '-created_date',
        50
      );
    },
    enabled: !!groupChannel?.id,
    refetchInterval: 2000
  });

  const { data: members = [] } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: () => base44.entities.SquadMembership.filter({ squad_id: groupId }),
    enabled: !!groupId
  });

  useEffect(() => {
    if (!groupChannel?.id) return;
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.channel_id === groupChannel.id) {
        queryClient.invalidateQueries(['group-messages', groupChannel.id]);
      }
    });
    return unsubscribe;
  }, [groupChannel?.id, queryClient]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Message.create({
        channel_id: groupChannel.id,
        user_id: user.id,
        content: message,
        attachments: attachments.length > 0 ? attachments : undefined
      });
    },
    onSuccess: () => {
      setMessage('');
      setAttachments([]);
      queryClient.invalidateQueries(['group-messages', groupChannel.id]);
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
      <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-900/30">
        <Users className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-400 font-mono">{groupName}</span>
        <span className="text-[9px] text-zinc-600 ml-auto">{members.length} members</span>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-3 border-b border-zinc-800">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-600">
              Start chatting in {groupName}
            </div>
          ) : (
            messages.slice().reverse().map((msg) => (
              <div key={msg.id}>
                <div className="text-[9px] text-zinc-500 mb-0.5 font-bold">{msg.created_by || 'Unknown'}</div>
                <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs p-2 rounded">
                  {msg.content}
                  {msg.attachments?.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {msg.attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-[8px] underline opacity-75 hover:opacity-100">
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
          id="group-file-input"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <label htmlFor="group-file-input">
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-zinc-300">
            <Paperclip className="w-3.5 h-3.5" />
          </Button>
        </label>
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message squad..."
          className="bg-zinc-900 border-zinc-800 text-xs h-7 py-1"
        />
        <Button type="submit" size="icon" className="h-7 w-7 bg-[#ea580c] hover:bg-[#c2410c]">
          <Send className="w-3 h-3" />
        </Button>
      </form>
    </div>
  );
}