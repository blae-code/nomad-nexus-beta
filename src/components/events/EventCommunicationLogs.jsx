import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageCircle, Clock } from "lucide-react";

export default function EventCommunicationLogs({ eventId }) {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['event-comms-logs', eventId],
    queryFn: async () => {
      const channels = await base44.entities.Channel.list();
      const allMessages = await base44.entities.Message.list();
      if (!Array.isArray(allMessages)) return [];
      return allMessages.filter(m => channels.some(c => c.id === m.channel_id)).slice(0, 20);
    },
    enabled: !!eventId,
    initialData: []
  });

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-zinc-200 uppercase tracking-wide flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> Communication Logs
        </CardTitle>
      </CardHeader>
      <CardContent className="text-zinc-400">
        {isLoading ? (
          <div className="text-center py-4 text-zinc-500 text-sm">Loading comms...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-4 text-zinc-500 text-sm">No communication records</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map(msg => (
              <div key={msg.id} className="p-2 bg-zinc-950/50 border border-zinc-800/50 rounded text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-zinc-300">{msg.user_id.slice(0, 8)}</span>
                  <span className="text-zinc-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.created_date).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-zinc-400 line-clamp-2">{msg.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}