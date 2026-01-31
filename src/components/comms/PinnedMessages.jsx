/**
 * PinnedMessages — Display and manage pinned messages in a channel
 */

import React, { useState, useEffect } from 'react';
import { Pin, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function PinnedMessages({ channelId, onJumpToMessage }) {
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!channelId) return;

    const loadPinnedMessages = async () => {
      setLoading(true);
      try {
        const pinned = await base44.entities.PinnedMessage.filter(
          { channel_id: channelId },
          'pin_order',
          10
        );

        // Load message content for each pin
        const messagesWithContent = await Promise.all(
          pinned.map(async (pin) => {
            const message = await base44.entities.Message.get(pin.message_id);
            return { ...pin, message };
          })
        );

        setPinnedMessages(messagesWithContent.filter(p => p.message));
      } catch (error) {
        console.error('Failed to load pinned messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPinnedMessages();
  }, [channelId]);

  if (loading || pinnedMessages.length === 0) return null;

  return (
    <div className="border-b border-orange-500/10 bg-amber-950/20">
      {/* Collapsed Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-zinc-900/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Pin className="w-3 h-3 text-amber-400" />
          <span className="text-xs text-amber-400 font-semibold">
            {pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-3 h-3 text-amber-400" />
        ) : (
          <ChevronDown className="w-3 h-3 text-amber-400" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 max-h-64 overflow-y-auto">
          {pinnedMessages.map((pin) => (
            <div
              key={pin.id}
              className="p-2 bg-zinc-900/60 rounded border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer"
              onClick={() => onJumpToMessage?.(pin.message_id)}
            >
              <div className="text-[10px] text-zinc-500 mb-1">
                {new Date(pin.message.created_date).toLocaleDateString()}
              </div>
              <div className="text-xs text-zinc-300 line-clamp-2">
                {pin.message.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}