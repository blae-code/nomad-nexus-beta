import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, User, Hash, Lock, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRankColorClass } from "@/components/utils/rankUtils";

export default function ChatInterface({ channel, user }) {
  const scrollRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const queryClient = useQueryClient();

  // Fetch Messages with Real-Time Subscription
  const { data: messages } = useQuery({
    queryKey: ['channel-messages', channel.id],
    queryFn: () => base44.entities.Message.list({
      filter: { channel_id: channel.id },
      sort: { created_date: 1 },
      limit: 100
    }),
    initialData: []
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!channel?.id) return;
    
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data.channel_id === channel.id) {
        queryClient.invalidateQueries(['channel-messages', channel.id]);
      }
    });
    
    return unsubscribe;
  }, [channel?.id, queryClient]);

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

  // Fetch Authors (for names)
  const { data: authors } = useQuery({
    queryKey: ['chat-authors', messages],
    queryFn: async () => {
      const userIds = [...new Set(messages.map(m => m.user_id))];
      if (userIds.length === 0) return {};
      
      // In a real app we might batch fetch or use a cache
      // For now we'll just list all users and map them (inefficient but works for small scale)
      const allUsers = await base44.entities.User.list(); 
      const authorMap = {};
      allUsers.forEach(u => {
         authorMap[u.id] = u;
      });
      return authorMap;
    },
    enabled: messages.length > 0,
    initialData: {}
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: (content) => base44.entities.Message.create({
      channel_id: channel.id,
      user_id: user.id,
      content: content,
      attachments: []
    }),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries(['channel-messages', channel.id]);
    }
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
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
             {channel.description || "Ready Room Channel"}
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
            Live Feed
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
             <p className="text-xs font-mono uppercase">Channel Empty. Initialize Comms.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.user_id === user?.id;
            const author = authors[msg.user_id] || { full_name: 'Unknown', callsign: 'Unknown' };
            const showHeader = idx === 0 || messages[idx-1].user_id !== msg.user_id || (new Date(msg.created_date) - new Date(messages[idx-1].created_date) > 300000);
            const isOnline = onlineUsers.includes(msg.user_id);

            return (
              <div key={msg.id} className="flex gap-3 group hover:bg-zinc-900/30 -mx-2 px-2 py-1 rounded transition-colors">
                {/* Avatar */}
                {showHeader ? (
                  <div className="relative shrink-0 mt-1">
                    <Avatar className="w-8 h-8 border border-zinc-800">
                      <AvatarFallback className={cn(
                        "text-xs font-bold",
                        isMe ? "bg-emerald-950 text-emerald-400" : "bg-zinc-900 text-zinc-400"
                      )}>
                        {(author.callsign || author.full_name || 'U')[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                    )}
                  </div>
                ) : (
                  <div className="w-8 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {showHeader && (
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={cn(
                        "text-sm font-bold", 
                        isMe ? "text-emerald-400" : getRankColorClass(author.rank, 'text')
                      )}>
                        {author.callsign || author.full_name}
                      </span>
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {new Date(msg.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}
                      </span>
                    </div>
                  )}
                  <div className={cn(
                    "text-sm text-zinc-200 break-words",
                    !showHeader && "pl-0"
                  )}>
                    {msg.content}
                  </div>
                </div>

                {/* Timestamp on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-zinc-600 font-mono self-start mt-1">
                  {new Date(msg.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
        <form onSubmit={handleSend} className="flex gap-2">
           <Input 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${channel.name}...`}
              className="bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-[#ea580c]"
           />
           <Button 
              type="submit" 
              size="icon"
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              className="bg-[#ea580c] hover:bg-[#c2410c] text-white shrink-0"
           >
              <Send className="w-4 h-4" />
           </Button>
        </form>
        <div className="text-[9px] text-zinc-600 font-mono mt-2 flex justify-between">
           <span>SECURE CHANNEL // ENCRYPTION: STANDARD</span>
           <span>RETURN TO SEND</span>
        </div>
      </div>
    </div>
  );
}