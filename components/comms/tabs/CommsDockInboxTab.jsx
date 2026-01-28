import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AtSign, MessageCircle, PieChart } from 'lucide-react';

export default function CommsDockInboxTab({ user }) {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['inbox-notifications', user?.id],
    queryFn: () => {
      if (!user?.id) return [];
      // In a real impl, would have a Notification entity
      // For now, show recent mentions and replies
      return base44.entities.CommsPost.filter(
        { content: { $regex: `@${user.id}` } },
        '-created_date',
        10
      );
    },
    staleTime: 10000,
    enabled: !!user?.id
  });

  const getIcon = (type) => {
    switch (type) {
      case 'mention':
        return <AtSign className="w-2.5 h-2.5 text-blue-400" />;
      case 'reply':
        return <MessageCircle className="w-2.5 h-2.5 text-green-400" />;
      case 'poll':
        return <PieChart className="w-2.5 h-2.5 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-1 p-1">
        {isLoading ? (
          <p className="text-[8px] text-zinc-600">Loading inbox...</p>
        ) : notifications.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No notifications</p>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className="px-2 py-1 border border-zinc-800 bg-zinc-900/30 text-[8px] cursor-pointer hover:bg-zinc-900/60 transition-colors">
              <div className="flex items-start gap-1">
                <AtSign className="w-2.5 h-2.5 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300 truncate">{notif.content}</p>
                  <p className="text-[7px] text-zinc-600 mt-0.5">
                    {new Date(notif.created_date).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}