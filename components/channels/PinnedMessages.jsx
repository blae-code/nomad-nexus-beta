import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Pin } from "lucide-react";

export default function PinnedMessages({ channelId, currentUser }) {
  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ['pinned-messages', channelId],
    queryFn: () => base44.entities.PinnedMessage.filter({ channel_id: channelId }),
    enabled: !!channelId
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['pinned-message-content', channelId],
    queryFn: async () => {
      if (pinnedMessages.length === 0) return [];
      const messageIds = pinnedMessages.map(pm => pm.message_id);
      const allMessages = await Promise.all(
        messageIds.map(id => base44.entities.Message.filter({ id }).catch(() => null))
      );
      return allMessages.flat().filter(Boolean);
    },
    enabled: pinnedMessages.length > 0
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-for-pins'],
    queryFn: () => base44.entities.User.list(),
    initialData: []
  });

  if (pinnedMessages.length === 0) return null;

  const getMessageAuthor = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.callsign || user?.rsi_handle || user?.full_name || "Unknown";
  };

  return (
    <div className="bg-[#ea580c]/10 border-b border-[#ea580c]/30 p-3 space-y-2">
      {messages.map((msg) => {
        if (!msg || msg.is_deleted) return null;
        
        return (
          <div key={msg.id} className="flex items-start gap-2 text-xs">
            <Pin className="w-3 h-3 text-[#ea580c] mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[#ea580c] text-[10px]">
                {getMessageAuthor(msg.user_id)}
              </div>
              <div className="text-zinc-300 truncate">{msg.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}