/**
 * MentionsView — Display messages that mention the current user
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AtSign, Loader, Hash } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useMemberProfileMap } from '@/components/hooks/useMemberProfileMap';

export default function MentionsView({ user, onJumpToMessage }) {
  const { user: authUser } = useAuth();
  const currentUser = user || authUser?.member_profile_data || authUser;
  const [mentions, setMentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState({});
  const [messageMap, setMessageMap] = useState({});

  useEffect(() => {
    const loadMentions = async () => {
      try {
        if (!currentUser?.id) return;
        setLoading(true);
        const results = await base44.entities.Notification.filter(
          { user_id: currentUser.id, type: 'mention' },
          '-created_date',
          50
        );
        setMentions(results || []);
      } catch (error) {
        console.error('Error loading mentions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMentions();
  }, [currentUser?.id]);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const list = await base44.entities.Channel.list();
        const map = {};
        list.forEach((ch) => {
          map[ch.id] = ch;
        });
        setChannels(map);
      } catch (error) {
        console.error('Failed to load channels for mentions:', error);
      }
    };

    if (mentions.length > 0) {
      loadChannels();
    }
  }, [mentions.length]);

  useEffect(() => {
    const loadMessages = async () => {
      const ids = mentions.map((m) => m.related_entity_id).filter(Boolean);
      if (ids.length === 0) return;

      const map = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const msg = await base44.entities.Message.get(id);
            if (msg) map[id] = msg;
          } catch {
            // ignore
          }
        })
      );
      setMessageMap(map);
    };

    loadMessages();
  }, [mentions]);

  const messageUserIds = Array.from(
    new Set(Object.values(messageMap).map((msg) => msg?.user_id).filter(Boolean))
  );
  const { memberMap } = useMemberProfileMap(messageUserIds);

  const handleOpenMention = async (mention) => {
    if (!mention) return;
    if (!mention.is_read) {
      try {
        await base44.entities.Notification.update(mention.id, {
          is_read: true,
          read_at: new Date().toISOString(),
        });
        setMentions((prev) =>
          prev.map((item) => (item.id === mention.id ? { ...item, is_read: true } : item))
        );
      } catch (error) {
        console.error('Failed to mark mention as read:', error);
      }
    }

    if (onJumpToMessage && mention.related_entity_id) {
      onJumpToMessage({
        channel_id: mention.channel_id,
        id: mention.related_entity_id,
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="w-4 h-4 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-3 text-xs text-zinc-500 space-y-3">
      <div className="flex items-center gap-2">
        <AtSign className="w-3 h-3" />
        <span>Mentions</span>
      </div>
      {mentions.length === 0 && (
        <div className="text-zinc-600">No recent mentions. You're all caught up.</div>
      )}
      {mentions.length > 0 && (
        <div className="space-y-2">
          {mentions.map((mention) => {
            const msg = mention.related_entity_id ? messageMap[mention.related_entity_id] : null;
            const channelName = channels[mention.channel_id]?.name || mention.channel_id || 'channel';
            const authorLabel = msg?.user_id ? memberMap[msg.user_id]?.label || msg.user_id : 'Unknown';
            const timestamp = mention.created_date || mention.created_at;
            return (
              <button
                key={mention.id}
                onClick={() => handleOpenMention(mention)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  mention.is_read
                    ? 'bg-zinc-900/30 border-zinc-800 text-zinc-500'
                    : 'bg-zinc-900/60 border-orange-500/30 text-zinc-300 hover:border-orange-500/60'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Hash className="w-3 h-3 text-zinc-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    #{channelName}
                  </span>
                  {timestamp && (
                    <span className="ml-auto text-[10px] text-zinc-600">
                      {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 mb-1">
                  {authorLabel} mentioned you
                </div>
                <div className="text-xs text-zinc-300 line-clamp-2">
                  {msg?.content || mention.message}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
