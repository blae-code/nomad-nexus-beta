import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Hash, Users } from "lucide-react";
import MessageBubble from "@/components/comms/MessageBubble";
import WhisperDisplay from "@/components/comms/WhisperDisplay";
import FileUploadButton from "@/components/comms/FileUploadButton";
import AIResponseSuggestions from "@/components/comms/AIResponseSuggestions";
import { useUserDirectory } from "@/components/hooks/useUserDirectory";

export default function ChatInterface({ channel, user }) {
  const scrollRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const queryClient = useQueryClient();

  // Fetch Messages with Real-Time Subscription (reduced polling)
  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['channel-messages', channel.id],
    queryFn: () => base44.entities.Message.filter(
      { channel_id: channel.id },
      'created_date',
      100
    ),
    initialData: [],
    refetchInterval: 10000
  });

  // Real-time subscription for new messages and updates
  useEffect(() => {
    if (!channel?.id) return;
    
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if ((event.type === 'create' || event.type === 'update') && event.data.channel_id === channel.id) {
        queryClient.invalidateQueries({ queryKey: ['channel-messages', channel.id] });
      }
    });
    
    return unsubscribe;
  }, [channel?.id, queryClient]);

  // Mark messages as read
  useEffect(() => {
    if (!messages.length || !user?.id) return;

    const markAsRead = async () => {
      const unreadMessages = messages.filter(
        msg => msg.user_id !== user.id && (!msg.read_by || !msg.read_by.includes(user.id))
      );

      for (const msg of unreadMessages) {
        const readBy = msg.read_by || [];
        if (!readBy.includes(user.id)) {
          await base44.entities.Message.update(msg.id, {
            read_by: [...readBy, user.id]
          }).catch(() => {});
        }
      }
    };

    markAsRead();
  }, [messages, user?.id]);

  // Update presence - mark user as online in this channel
  useEffect(() => {
    if (!channel?.id || !user?.id) return;
    
    // Simulate online presence by storing timestamp
    const markPresence = () => {
      localStorage.setItem(`presence_${channel.id}_${user.id}`, Date.now().toString());
    };
    
    markPresence();
    const interval = setInterval(markPresence, 30000); // Update every 30s
    
    return () => clearInterval(interval);
  }, [channel?.id, user?.id]);

  // Track online users (based on recent activity)
  useEffect(() => {
    if (!channel?.id || !messages) return;
    
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    
    // Get unique users who sent messages in the last 5 minutes
    const recentUsers = new Set();
    messages.forEach(msg => {
      const msgTime = new Date(msg.created_date).getTime();
      if (msgTime > fiveMinutesAgo) {
        recentUsers.add(msg.user_id);
      }
    });
    
    setOnlineUsers(Array.from(recentUsers));
  }, [messages, channel?.id]);

  const { userById } = useUserDirectory();

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (payload) => base44.entities.Message.create({
      channel_id: channel.id,
      user_id: user.id,
      content: payload.content,
      attachments: payload.attachments,
      read_by: [user.id]
    }),
    onSuccess: () => {
      setNewMessage("");
      setAttachments([]);
      // Optimistic update: refetch after send completes
      queryClient.invalidateQueries({ queryKey: ['channel-messages', channel.id] });
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;
    sendMessageMutation.mutate({
      content: newMessage || "(File only)",
      attachments: attachments
    });
  };

  const handleFilesSelected = (fileUrls) => {
    setAttachments(prev => [...prev, ...fileUrls]);
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/50">
      {/* Channel Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
        <div>
          <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
            <Hash className="w-5 h-5 text-zinc-500" />
            {channel.name}
          </div>
          <div className="text-xs text-zinc-500 font-mono uppercase tracking-wider mt-1">
             {channel.description || "PUBLIC CHANNEL"}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase">
            <Users className="w-3 h-3" />
            <span className="text-emerald-500 font-bold">{onlineUsers.length}</span>
            <span>Online</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase border border-zinc-800 px-2 py-1 rounded bg-zinc-950">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            ACTIVE
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
             <Hash className="w-12 h-12 mb-2" />
             <p className="text-xs font-mono uppercase">NO COMMUNICATIONS</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user?.id;
            const author = userById[msg.user_id] || { full_name: 'Unknown', callsign: 'Unknown' };
            const isOnline = onlineUsers.includes(msg.user_id);
            const isRead = msg.read_by && msg.read_by.includes(user?.id);

            return msg.whisper_metadata?.is_whisper ? (
              <WhisperDisplay key={msg.id} message={msg} currentUserId={user?.id} />
            ) : (
              <MessageBubble
                key={msg.id}
                message={msg}
                author={author}
                isMe={isMe}
                isOnline={isOnline}
                isRead={isRead}
                onlineUsers={onlineUsers}
              />
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 space-y-2">
        {/* Manual Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={() => refetchMessages()}
            className="text-[9px] text-zinc-600 hover:text-zinc-400 font-mono uppercase transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* AI Response Suggestions */}
        {messages.length >= 2 && (
          <AIResponseSuggestions
            recentMessages={messages.slice(-5)}
            context={`#${channel.name}`}
            onSelectSuggestion={(text) => setNewMessage(text)}
          />
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((url, idx) => (
              <div key={idx} className="relative inline-flex items-center gap-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[11px] text-zinc-400">
                <span className="truncate max-w-[100px]">{url.split('/').pop()}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="text-zinc-600 hover:text-[#ea580c]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
           <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${channel.name}...`}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-[#ea580c]"
           />
           <FileUploadButton 
              onFilesSelected={handleFilesSelected}
              disabled={sendMessageMutation.isPending}
           />
           <Button 
              type="submit" 
              size="icon"
              disabled={(!newMessage.trim() && attachments.length === 0) || sendMessageMutation.isPending}
              className="bg-[#ea580c] hover:bg-[#c2410c] text-white shrink-0"
           >
              <Send className="w-4 h-4" />
           </Button>
        </form>
        <div className="text-[9px] text-zinc-600 font-mono flex justify-between">
           <span>ENCRYPTION: ACTIVE</span>
           <span>ENTER TO SEND</span>
        </div>
      </div>
    </div>
  );
}