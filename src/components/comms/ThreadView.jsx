/**
 * ThreadView — Display and manage active message threads
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MessageCircle, Loader, CornerDownRight } from 'lucide-react';

export default function ThreadView({ user, onOpenThread }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadThreads = async () => {
      try {
        if (!user?.id) return;

        // Get messages where user is a thread participant
        const allMessages = await base44.entities.Message.list('-created_date', 100);
        
        // Filter to parent messages with threads where user participated
        const userThreads = allMessages.filter(msg => 
          !msg.parent_message_id && 
          msg.thread_message_count > 0 &&
          (msg.thread_participants || []).includes(user.id)
        );

        setThreads(userThreads);
      } catch (error) {
        console.error('Error loading threads:', error);
      } finally {
        setLoading(false);
      }
    };

    loadThreads();

    // Subscribe to thread updates
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'update' && event.data?.thread_message_count > 0) {
        loadThreads();
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-4 h-4 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold text-white uppercase">Your Threads</h3>
      </div>

      {threads.length === 0 ? (
        <div className="text-xs text-zinc-600 text-center py-8">
          No active threads. Reply to messages to start one.
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => onOpenThread?.(thread)}
              className="w-full text-left p-3 rounded bg-zinc-900/40 hover:bg-zinc-800/60 border border-zinc-800 hover:border-orange-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="text-xs text-zinc-400 font-semibold truncate flex-1">
                  #{thread.channel_id}
                </div>
                <div className="text-[10px] text-zinc-600 flex-shrink-0">
                  {new Date(thread.created_date).toLocaleDateString()}
                </div>
              </div>
              
              <div className="text-xs text-zinc-300 line-clamp-2 mb-2">
                {thread.content}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                <CornerDownRight className="w-3 h-3" />
                <span>
                  {thread.thread_message_count} {thread.thread_message_count === 1 ? 'reply' : 'replies'}
                </span>
                <span>•</span>
                <span>
                  {(thread.thread_participants || []).length} {(thread.thread_participants || []).length === 1 ? 'participant' : 'participants'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}