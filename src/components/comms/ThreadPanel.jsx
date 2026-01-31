/**
 * ThreadPanel — Side panel for viewing and replying to message threads
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import MessageItem from './MessageItem';
import MessageComposer from './MessageComposer';

export default function ThreadPanel({ parentMessage, onClose, currentUserId, isAdmin }) {
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const repliesEndRef = useRef(null);

  useEffect(() => {
    if (!parentMessage) return;

    const loadReplies = async () => {
      setLoading(true);
      try {
        const threadReplies = await base44.entities.Message.filter(
          { parent_message_id: parentMessage.id },
          'created_date',
          100
        );
        setReplies(threadReplies);
      } catch (error) {
        console.error('Failed to load thread replies:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReplies();

    // Subscribe to new replies in this thread
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.type === 'create' && event.data?.parent_message_id === parentMessage.id) {
        setReplies(prev => [...prev, event.data]);
      }
    });

    return () => unsubscribe();
  }, [parentMessage]);

  // Auto-scroll to bottom on new replies
  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  if (!parentMessage) return null;

  const handleSendReply = async (messageData) => {
    try {
      // Create reply with parent reference
      await base44.entities.Message.create({
        ...messageData,
        parent_message_id: parentMessage.id,
      });

      // Update parent message thread count and participants
      const updatedParticipants = Array.from(
        new Set([...(parentMessage.thread_participants || []), messageData.user_id])
      );

      await base44.entities.Message.update(parentMessage.id, {
        thread_message_count: (parentMessage.thread_message_count || 0) + 1,
        thread_participants: updatedParticipants,
      });

      // Create notification for parent message author (if not self-reply)
      if (parentMessage.user_id !== messageData.user_id) {
        await base44.entities.Notification.create({
          user_id: parentMessage.user_id,
          type: 'thread_reply',
          title: 'New thread reply',
          message: `Someone replied to your message in #${parentMessage.channel_id}`,
          related_entity_type: 'message',
          related_entity_id: parentMessage.id,
          is_read: false,
        });
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  return (
    <div className="w-96 border-l border-orange-500/20 flex flex-col bg-zinc-950 h-full">
      {/* Header */}
      <div className="border-b border-orange-500/10 p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <CornerDownRight className="w-4 h-4 text-orange-500" />
          <span className="text-xs font-bold text-white uppercase">Thread</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-6 w-6">
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="border-b border-orange-500/10 p-3 bg-zinc-900/40">
        <MessageItem
          message={parentMessage}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      </div>

      {/* Thread Replies */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-xs">Loading replies...</div>
          </div>
        ) : replies.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-600">
            <div className="text-xs text-center">
              No replies yet.<br />Be the first to reply!
            </div>
          </div>
        ) : (
          <>
            {replies.map(reply => (
              <MessageItem
                key={reply.id}
                message={reply}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onEdit={() => {
                  // Refresh replies after edit
                  const loadReplies = async () => {
                    const threadReplies = await base44.entities.Message.filter(
                      { parent_message_id: parentMessage.id },
                      'created_date',
                      100
                    );
                    setReplies(threadReplies);
                  };
                  loadReplies();
                }}
                onDelete={() => {}}
              />
            ))}
            <div ref={repliesEndRef} />
          </>
        )}
      </div>

      {/* Reply Composer */}
      <MessageComposer
        channelId={parentMessage.channel_id}
        userId={currentUserId}
        onSendMessage={handleSendReply}
        placeholder="Reply to thread..."
      />
    </div>
  );
}