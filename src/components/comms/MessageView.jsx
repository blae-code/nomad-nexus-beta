/**
 * MessageView — Display messages for selected channel
 */

import React, { useEffect, useRef } from 'react';
import { format } from 'date-fns';

export default function MessageView({ messages, loading, onMarkRead }) {
  const endRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark channel as read when viewing
  useEffect(() => {
    if (messages.length > 0 && !loading) {
      onMarkRead?.();
    }
  }, [messages, loading, onMarkRead]);

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950/60 p-3 space-y-2">
      {loading ? (
        <div className="text-xs text-zinc-500 text-center py-4">Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="text-xs text-zinc-500 text-center py-4">No messages yet</div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className="text-xs space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-zinc-300">{msg.authorCallsign}</span>
              <span className="text-zinc-600">{format(new Date(msg.createdAt), 'HH:mm')}</span>
            </div>
            <div className="text-zinc-400 pl-2">{msg.body}</div>
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  );
}