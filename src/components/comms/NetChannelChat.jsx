import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function NetChannelChat({ channel, netCode, user }) {
  const [messageContent, setMessageContent] = useState('');
  const [userMap, setUserMap] = useState({});
  const scrollRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch messages for this channel (limit to 25, no polling)
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['net-channel-messages', channel?.id],
    queryFn: async () => {
      if (!channel?.id) return [];
      const msgs = await base44.entities.Message.filter(
        { channel_id: channel.id },
        '-created_date',
        25 // Reduced from 50
      );
      return msgs.reverse();
    },
    enabled: !!channel?.id,
    staleTime: 8000,
    refetchInterval: false, // Real-time sub below handles updates
    gcTime: 20000
  });

  // Subscribe to real-time message updates via WebSocket
  useEffect(() => {
    if (!channel?.id) return;

    const unsubscribe = base44.entities.Message.subscribe((event) => {
      // Only invalidate if message belongs to current channel
      if (event.data?.channel_id === channel.id) {
        queryClient.invalidateQueries({ queryKey: ['net-channel-messages', channel.id] });
      }
    });

    return () => unsubscribe?.();
  }, [channel?.id, queryClient]);

  // Fetch user details for messages
  useEffect(() => {
    const fetchUsers = async () => {
      const userIds = [...new Set(messages.map(m => m.user_id))];
      const users = {};
      
      for (const userId of userIds) {
        if (!userMap[userId]) {
          try {
            const userData = await base44.entities.User.get(userId);
            users[userId] = userData;
          } catch (error) {
            users[userId] = { id: userId, full_name: 'Unknown' };
          }
        }
      }
      
      setUserMap(prev => ({ ...prev, ...users }));
    };

    if (messages.length > 0) {
      fetchUsers();
    }
  }, [messages, userMap]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (content) =>
      base44.entities.Message.create({
        channel_id: channel.id,
        user_id: user.id,
        content
      }),
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['net-channel-messages', channel.id] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to send message');
    }
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    
    await sendMutation.mutateAsync(messageContent.trim());
  };

  if (!channel) {
    return (
      <Card className="bg-zinc-900 border-zinc-800 h-full">
        <CardContent className="flex items-center justify-center h-full text-zinc-500">
          Select a channel to start messaging
        </CardContent>
      </Card>
    );
  }

  const isReadOnly = channel.is_read_only && user?.role !== 'admin';

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full flex flex-col">
      {/* Header */}
      <CardHeader className="shrink-0 border-b border-zinc-800">
        <CardTitle className="text-sm">
          <span className="text-zinc-500"># {channel.name}</span>
          <span className="text-xs text-zinc-600 ml-3">in {netCode}</span>
        </CardTitle>
        {channel.description && (
          <p className="text-xs text-zinc-400 mt-2">{channel.description}</p>
        )}
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-zinc-500 text-xs">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-xs">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(msg => {
              const msgUser = userMap[msg.user_id];
              const isOwnMessage = msg.user_id === user.id;
              
              return (
                <div key={msg.id} className={cn(
                  'group p-2 rounded hover:bg-zinc-800/30 transition-colors',
                  isOwnMessage && 'bg-emerald-950/20'
                )}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-300">
                          {msgUser?.callsign || msgUser?.rsi_handle || msgUser?.full_name || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {msg.created_date ? new Date(msg.created_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 break-words">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="shrink-0 border-t border-zinc-800 p-3">
        {isReadOnly ? (
          <div className="flex items-center gap-2 p-3 bg-amber-950/20 border border-amber-900/30 rounded text-xs text-amber-400">
            <AlertCircle className="w-3 h-3 shrink-0" />
            This is a read-only channel
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-xs"
              disabled={sendMutation.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!messageContent.trim() || sendMutation.isPending}
              className="bg-emerald-900 hover:bg-emerald-800 shrink-0"
            >
              <Send className="w-3 h-3" />
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}