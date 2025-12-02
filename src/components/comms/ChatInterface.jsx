import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, User, Hash, Lock, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRankColorClass } from "@/components/utils/rankUtils";

export default function ChatInterface({ channel, user }) {
  const scrollRef = useRef(null);
  const [newMessage, setNewMessage] = useState("");
  const queryClient = useQueryClient();

  // Fetch Messages
  const { data: messages } = useQuery({
    queryKey: ['channel-messages', channel.id],
    queryFn: () => base44.entities.Message.list({
      filter: { channel_id: channel.id },
      sort: { created_date: 1 },
      limit: 50
    }),
    refetchInterval: 3000,
    initialData: []
  });

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
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-600 uppercase border border-zinc-800 px-2 py-1 rounded bg-zinc-950">
           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           Live Feed
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

            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                {showHeader && (
                   <div className="flex items-center gap-2 mb-1 mt-2">
                      <span className={cn(
                         "text-xs font-bold", 
                         isMe ? "text-emerald-500" : getRankColorClass(author.rank, 'text')
                      )}>
                         {author.callsign || author.full_name}
                      </span>
                      <span className="text-[9px] text-zinc-600 font-mono">
                         {new Date(msg.created_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                   </div>
                )}
                <div className={cn(
                   "px-3 py-2 max-w-[80%] text-sm break-words",
                   isMe 
                     ? "bg-emerald-900/20 text-emerald-100 border border-emerald-900/50 rounded-l-lg rounded-tr-lg" 
                     : "bg-zinc-900 text-zinc-300 border border-zinc-800 rounded-r-lg rounded-tl-lg"
                )}>
                   {msg.content}
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