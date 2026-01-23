import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Send, Pin, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canUser, hasModerationType, getPermissionExplanation } from './commsPermissionEngine';

export default function CommsDockChannelView({ channel, user, onBack }) {
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('FREEFORM');
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['comms-posts', channel.id],
    queryFn: () => base44.entities.CommsPost.filter(
      { channel_id: channel.id, parent_post_id: { $exists: false } },
      '-created_date',
      20
    ),
    staleTime: 5000
  });

  const createPostMutation = useMutation({
    mutationFn: (content) => {
      return base44.entities.CommsPost.create({
        channel_id: channel.id,
        author_id: user.id,
        content,
        template_type: selectedTemplate
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comms-posts', channel.id] });
      setNewPostContent('');
      setSelectedTemplate('FREEFORM');
    }
  });

  const postResult = canUser(user, channel, 'post');
  const replyResult = canUser(user, channel, 'reply');
  const userCanPost = postResult.allowed;
  const userCanReply = replyResult.allowed;
  const userCanPin = hasModerationType(user, 'PIN', channel);
  const userCanDelete = hasModerationType(user, 'DELETE_POST', channel);
  const userCanLock = hasModerationType(user, 'LOCK', channel);

  // Determine if replies are disabled
  const repliesDisabled = channel.type === 'BROADCAST' || channel.type === 'OPS_FEED';

  const templates = [
    { value: 'FREEFORM', label: 'Freeform' },
    { value: 'OPS_UPDATE', label: 'Ops Brief', shown: channel.type === 'OPS_FEED' || channel.scope === 'OP' },
    { value: 'INTEL_SIGHTING', label: 'Intel', shown: channel.scope === 'ORG' || channel.canonical_key?.includes('intel') },
    { value: 'LOGISTICS_NOTE', label: 'Logistics', shown: true },
    { value: 'RESCUE_NOTE', label: 'Rescue', shown: channel.scope === 'ORG' }
  ].filter(t => t.shown !== false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-zinc-800 shrink-0">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400">
          <ArrowLeft className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <h3 className="text-[8px] font-bold uppercase text-zinc-300 truncate">{channel.name}</h3>
            {channel.type === 'BROADCAST' && <span className="text-[6px] text-purple-400">📢</span>}
            {channel.type === 'OPS_FEED' && <span className="text-[6px] text-amber-400">📋</span>}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto space-y-1 p-1">
        {channel.is_locked && (
          <div className="px-2 py-1 border border-orange-700/40 bg-orange-950/20 text-[8px] text-orange-300 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Locked
          </div>
        )}
        {isLoading ? (
          <p className="text-[8px] text-zinc-600">Loading...</p>
        ) : posts.length === 0 ? (
          <p className="text-[8px] text-zinc-600 italic">No messages</p>
        ) : (
          posts.filter(p => !p.is_hidden).map(post => (
            <div key={post.id} className="px-2 py-1 border border-zinc-800 bg-zinc-900/30 text-[8px] group">
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <div className="flex items-center gap-1">
                  <p className="font-bold text-zinc-300 text-[7px]">{post.author_id?.substring(0, 8)}</p>
                  {post.template_type !== 'FREEFORM' && (
                    <span className="text-[6px] bg-zinc-800/60 text-zinc-400 px-1 py-0">
                      {post.template_type.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {post.is_pinned && <Pin className="w-2.5 h-2.5 text-orange-400" />}
                  {userCanDelete && (
                    <button className="opacity-0 group-hover:opacity-100 text-[7px] px-1 py-0 bg-zinc-800/50 hover:bg-red-950/50 text-red-300 transition-opacity">
                      ×
                    </button>
                  )}
                </div>
              </div>
              <p className="text-zinc-400 leading-tight text-[7px]">{post.content}</p>
              {post.reply_count > 0 && !repliesDisabled && (
                <p className="text-[6px] text-zinc-600 mt-0.5">{post.reply_count} replies</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      {userCanPost && !channel.is_locked && (
        <div className="border-t border-zinc-800 p-1.5 shrink-0 space-y-1">
          {templates.length > 1 && (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-1.5 py-1 bg-zinc-900/50 border border-zinc-700 text-[7px] text-zinc-300 focus:outline-none focus:border-[#ea580c]"
            >
              {templates.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          )}
          <div className="flex gap-1">
            <input
              type="text"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newPostContent.trim()) {
                  createPostMutation.mutate(newPostContent);
                }
              }}
              placeholder={`Message${repliesDisabled ? ' (no replies)' : ''}...`}
              className="flex-1 px-2 py-1 bg-zinc-900/50 border border-zinc-700 text-[8px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
            />
            <button
              onClick={() => newPostContent.trim() && createPostMutation.mutate(newPostContent)}
              disabled={!newPostContent.trim() || createPostMutation.isPending}
              className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] disabled:opacity-50 transition-colors"
              title={repliesDisabled ? 'No replies allowed' : ''}
            >
              <Send className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}