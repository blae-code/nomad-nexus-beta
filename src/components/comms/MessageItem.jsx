/**
 * MessageItem — Enhanced message display with edit, delete, reactions, and rich text
 */

import React, { useMemo, useState } from 'react';
import { Edit2, Trash2, Smile, MoreVertical, Reply, Pin, MessageSquare, Languages, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import ReactMarkdown from 'react-markdown';
import { base44 } from '@/api/base44Client';
import MessageTranslator from '@/components/comms/MessageTranslator';
import { getMembershipLabel, getRankLabel, getRoleLabel } from '@/components/constants/labels';
import EmojiPickerModal from '@/components/comms/EmojiPickerModal';
import LinkPreview from '@/components/comms/LinkPreview';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '🎉', '👀', '🔥', '✅', '❌'];
const STATUS_META = {
  online: { label: 'Online', className: 'text-green-400 bg-green-500/10 border-green-500/30' },
  idle: { label: 'Idle', className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  'in-call': { label: 'In Call', className: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  transmitting: { label: 'Transmitting', className: 'text-orange-400 bg-orange-500/10 border-orange-500/30' },
  away: { label: 'Away', className: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  offline: { label: 'Offline', className: 'text-zinc-500 bg-zinc-800/60 border-zinc-700' },
};

const normalizeStatus = (status) => {
  if (!status) return null;
  const value = status.toString().toLowerCase();
  return STATUS_META[value] ? value : null;
};

const deriveStatusKey = (presenceRecord, lastSeen) => {
  if (presenceRecord?.is_transmitting) return 'transmitting';
  const normalized = normalizeStatus(presenceRecord?.status);
  if (normalized) return normalized;
  if (lastSeen?.isOnline) return 'online';
  return 'offline';
};

const getMessageBadge = (message) => {
  if (message?.whisper_metadata?.is_whisper) {
    return { label: 'Whisper', className: 'text-purple-300 border-purple-500/40 bg-purple-500/10' };
  }
  if (message?.broadcast_metadata?.is_broadcast) {
    return { label: 'Broadcast', className: 'text-orange-300 border-orange-500/40 bg-orange-500/10' };
  }

  if (!message?.content) return null;
  const match = message.content.match(/^\[(PRIORITY|URGENT|ALERT|SITREP|ORDERS|STATUS|CONTACT|LOGISTICS)(?::([A-Z]+))?\]/i);
  if (!match) return null;
  const base = match[1].toUpperCase();
  const level = match[2]?.toUpperCase?.() || null;
  const label = level ? `${base}:${level}` : base;
  const isHigh = base === 'URGENT' || base === 'ALERT' || level === 'HIGH' || level === 'CRITICAL';
  return {
    label,
    className: isHigh
      ? 'text-red-300 border-red-500/40 bg-red-500/10'
      : 'text-blue-300 border-blue-500/40 bg-blue-500/10',
  };
};

export default function MessageItem({ 
  message, 
  currentUserId, 
  isAdmin, 
  lastSeen,
  presenceRecord,
  memberProfile,
  authorLabel,
  onEdit,
  onDelete,
  onReply,
  onPin,
  showThreadButton = true,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkPreview, setShowLinkPreview] = useState(false);
  const displayLabel = authorLabel || message.author_callsign || message.display_callsign || message.user_id;
  const profile = memberProfile || {};
  const normalizedRank = profile.rank ? profile.rank.toString().toUpperCase() : null;
  const normalizedMembership = profile.membership ? profile.membership.toString().toUpperCase() : null;
  const roles = Array.isArray(profile.roles) ? profile.roles : [];
  const statusKey = deriveStatusKey(presenceRecord, lastSeen);
  const statusMeta = STATUS_META[statusKey] || STATUS_META.offline;
  const hasHoverData = Boolean(
    presenceRecord ||
    lastSeen?.formatted ||
    normalizedRank ||
    normalizedMembership ||
    roles.length > 0
  );
  const netLabel = presenceRecord?.current_net?.label || presenceRecord?.current_net?.code || null;
  const typingChannel = presenceRecord?.typing_in_channel || null;
  const badge = getMessageBadge(message);
  const linkUrls = useMemo(() => {
    if (!message?.content) return [];
    const matches = message.content.match(/https?:\/\/[^\s)]+/g);
    return matches ? Array.from(new Set(matches)) : [];
  }, [message?.content]);
  const primaryLink = linkUrls[0] || null;

  const canEdit = currentUserId === message.user_id;
  const canDelete = isAdmin || currentUserId === message.user_id;

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === message.content) {
      setIsEditing(false);
      return;
    }

    try {
      await base44.entities.Message.update(message.id, {
        content: editContent,
        is_edited: true,
        edit_history: [
          ...(message.edit_history || []),
          { content: message.content, edited_at: new Date().toISOString() }
        ]
      });
      setIsEditing(false);
      onEdit?.();
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  };

  const handleReaction = async (emoji) => {
    try {
      const reactions = message.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji);

      let newReactions;
      if (existingReaction) {
        // Toggle reaction
        if (existingReaction.user_ids.includes(currentUserId)) {
          // Remove user's reaction
          newReactions = reactions.map(r => 
            r.emoji === emoji 
              ? { ...r, user_ids: r.user_ids.filter(id => id !== currentUserId) }
              : r
          ).filter(r => r.user_ids.length > 0);
        } else {
          // Add user's reaction
          newReactions = reactions.map(r => 
            r.emoji === emoji 
              ? { ...r, user_ids: [...r.user_ids, currentUserId] }
              : r
          );
        }
      } else {
        // New reaction
        newReactions = [...reactions, { emoji, user_ids: [currentUserId] }];
      }

      await base44.entities.Message.update(message.id, { reactions: newReactions });
      setShowReactionPicker(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  if (message.is_deleted) {
    return (
      <div className="opacity-50 text-zinc-600 text-xs italic py-2">
        [Message deleted{message.deleted_reason ? `: ${message.deleted_reason}` : ''}]
      </div>
    );
  }

  return (
    <div className="group hover:bg-zinc-900/20 -mx-2 px-2 py-1.5 rounded transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Message Header */}
          <div className="flex items-center gap-2 text-[10px] mb-1">
            {statusKey !== 'offline' && (
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" title="Online now" />
            )}
            {hasHoverData ? (
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    className="font-semibold text-zinc-400 truncate hover:text-orange-300 transition-colors"
                  >
                    {displayLabel}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent
                  align="start"
                  className="w-64 bg-zinc-950 border border-orange-500/30 shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold text-zinc-100 truncate">{displayLabel}</div>
                      <span className={`text-[9px] uppercase px-2 py-0.5 rounded border ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    {(normalizedRank || normalizedMembership) && (
                      <div className="flex flex-wrap gap-1">
                        {normalizedRank && (
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded border border-zinc-700 text-zinc-300 bg-zinc-900/50">
                            {getRankLabel(normalizedRank)}
                          </span>
                        )}
                        {normalizedMembership && (
                          <span className="text-[9px] uppercase px-2 py-0.5 rounded border border-orange-500/30 text-orange-300 bg-orange-500/10">
                            {getMembershipLabel(normalizedMembership)}
                          </span>
                        )}
                      </div>
                    )}
                    {roles.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {roles.map((role, idx) => (
                          <span
                            key={`${role}-${idx}`}
                            className="text-[9px] uppercase px-2 py-0.5 rounded border border-zinc-700 text-zinc-400 bg-zinc-900/50"
                          >
                            {getRoleLabel(role.toString().toUpperCase())}
                          </span>
                        ))}
                      </div>
                    )}
                    {netLabel && (
                      <div className="text-[10px] text-zinc-400">
                        Net: <span className="text-zinc-200">{netLabel}</span>
                      </div>
                    )}
                    {typingChannel && (
                      <div className="text-[10px] text-orange-300">
                        Typing in <span className="text-zinc-200">{typingChannel}</span>
                      </div>
                    )}
                    {lastSeen?.formatted && (
                      <div className="text-[10px] text-zinc-500">
                        Last seen: <span className="text-zinc-300">{lastSeen.formatted}</span>
                      </div>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            ) : (
              <span className="font-semibold text-zinc-400 truncate">{displayLabel}</span>
            )}
            <span className="text-zinc-600 flex-shrink-0">•</span>
            <span className="text-zinc-600 flex-shrink-0">
              {new Date(message.created_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {badge && (
              <>
                <span className="text-zinc-600 flex-shrink-0">•</span>
                <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded border ${badge.className}`}>
                  {badge.label}
                </span>
              </>
            )}
            {message.is_routed && (
              <>
                <span className="text-zinc-600 flex-shrink-0">•</span>
                <span className="text-[9px] uppercase tracking-widest text-orange-400">Routed</span>
              </>
            )}
            {message.is_edited && (
              <>
                <span className="text-zinc-600 flex-shrink-0">•</span>
                <span className="text-zinc-600 flex-shrink-0 italic">(edited)</span>
              </>
            )}
          </div>

          {/* Message Content */}
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                className="h-8 text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="h-6 text-xs">Save</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }} className="h-6 text-xs">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="text-zinc-300 text-xs leading-relaxed break-words">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  code: ({ inline, children }) => 
                    inline 
                      ? <code className="px-1 py-0.5 bg-zinc-800 rounded text-orange-400">{children}</code>
                      : <pre className="bg-zinc-900 p-2 rounded overflow-x-auto my-2"><code className="text-green-400">{children}</code></pre>,
                  a: ({ children, href }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">
                      {children}
                    </a>
                  ),
                  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((url, idx) => (
                <div key={idx}>
                  {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img src={url} alt="attachment" className="max-w-sm rounded border border-zinc-700" />
                  ) : (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-orange-400 hover:underline flex items-center gap-1"
                    >
                      📎 {url.split('/').pop()}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Link Preview */}
          {primaryLink && (
            <div className="mt-2">
              {!showLinkPreview ? (
                <button
                  onClick={() => setShowLinkPreview(true)}
                  className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Preview link
                </button>
              ) : (
                <LinkPreview url={primaryLink} />
              )}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, idx) => (
                <button
                  key={idx}
                  onClick={() => handleReaction(reaction.emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                    reaction.user_ids.includes(currentUserId)
                      ? 'bg-orange-500/20 border-orange-500/50'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  {reaction.emoji} {reaction.user_ids.length}
                </button>
              ))}
            </div>
          )}

          {/* Thread Indicator */}
          {message.thread_message_count > 0 && (
            <button
              onClick={() => onReply?.(message)}
              className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 hover:border-orange-500/30 transition-colors text-xs text-zinc-400 hover:text-orange-400"
            >
              <MessageSquare className="w-3 h-3" />
              <span>{message.thread_message_count} {message.thread_message_count === 1 ? 'reply' : 'replies'}</span>
            </button>
          )}
        </div>

        {/* Actions Menu */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-6 w-6">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showThreadButton && onReply && !message.parent_message_id && (
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="w-3 h-3 mr-2" />
                  Reply in thread
                </DropdownMenuItem>
              )}
              {isAdmin && onPin && !message.parent_message_id && (
                <DropdownMenuItem onClick={() => onPin(message)}>
                  <Pin className="w-3 h-3 mr-2" />
                  Pin message
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-3 h-3 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete?.(message)}
                  className="text-red-400"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={() => setShowReactionPicker(!showReactionPicker)}
            >
              <Smile className="w-3 h-3" />
            </Button>
            {showReactionPicker && (
              <div className="absolute right-0 top-8 bg-zinc-900 border border-zinc-700 rounded p-2 flex gap-1 shadow-lg z-10">
                {COMMON_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="hover:bg-zinc-800 rounded px-1.5 py-1 text-sm transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowReactionPicker(false);
                    setShowEmojiPicker(true);
                  }}
                  className="hover:bg-zinc-800 rounded px-1.5 py-1 text-xs text-orange-300 border border-orange-500/30"
                >
                  +
                </button>
              </div>
            )}
          </div>

          <MessageTranslator message={message} />
        </div>
      </div>

      <EmojiPickerModal
        isOpen={showEmojiPicker}
        onClose={() => setShowEmojiPicker(false)}
        onSelect={(emoji) => handleReaction(emoji)}
      />
    </div>
  );
}
