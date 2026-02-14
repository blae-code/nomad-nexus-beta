import React, { useState, useEffect } from 'react';
import { Inbox, X, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PriorityMessageQueue({ widgetId, onRemove, isDragging }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const notifs = await base44.entities.Notification.list('-created_date', 15);
      setMessages(notifs || []);
    } catch (err) {
      console.error('Messages load failed:', err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-black/95 border border-red-700/40 relative overflow-hidden">
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(220,38,38,0.01)_0px,transparent_3px)] pointer-events-none" />
      
      <div className="widget-drag-handle flex-shrink-0 px-3 py-2 bg-gradient-to-r from-red-950/60 to-black/60 border-b border-red-700/40 flex items-center justify-between cursor-move backdrop-blur-sm relative z-10">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-red-400">Priority Queue</span>
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 text-[9px] font-bold">
              {messages.length}
            </span>
          )}
        </div>
        <Button size="icon" variant="ghost" onClick={onRemove} className="h-6 w-6 text-zinc-500 hover:text-red-400 hover:bg-red-500/10">
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 relative z-10">
        {messages.map((msg, i) => (
          <div key={i} className="p-2 bg-zinc-900/40 border border-zinc-700/40 rounded hover:border-red-700/40 transition-colors cursor-pointer">
            <div className="flex items-start gap-2">
              <Flag className={`w-3 h-3 mt-0.5 ${
                msg.priority === 'high' ? 'text-red-500' : 'text-zinc-600'
              }`} />
              <div className="flex-1">
                <div className="text-xs font-semibold text-zinc-300 line-clamp-2">{msg.title || msg.message}</div>
                <div className="text-[9px] text-zinc-600 mt-0.5">
                  {new Date(msg.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center py-6 text-[10px] text-zinc-600 uppercase tracking-wider">
            Inbox clear
          </div>
        )}
      </div>
    </div>
  );
}