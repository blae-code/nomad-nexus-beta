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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-zinc-800 shrink-0">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400">
          <ArrowLeft className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-[8px] font-bold uppercase text-zinc-300 truncate">{channel.name}</h3>
        </div>
      </div>

      {/* Posts */}
      <div className="flex-1 overflow-y-auto space-y-1 p-1">
        {channel.is_locked && (
          <div className="px-2 py-1 border border-orange-700/40 bg-orange-950/20 text-[8px] text-orange-300 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            Channel locked
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
                <p className="font-bold text-zinc-300">{post.author_id}</p>
                <div className="flex items-center gap-1">
                  {post.is_pinned && <Pin className="w-2.5 h-2.5 text-orange-400" />}
                  {userCanDelete && (
                    <button className="opacity-0 group-hover:opacity-100 text-[7px] px-1 py-0 bg-zinc-800/50 hover:bg-red-950/50 text-red-300 transition-opacity">
                      Hide
                    </button>
                  )}
                </div>
              </div>
              <p className="text-zinc-400 leading-tight">{post.content}</p>
              {post.reply_count > 0 && (
                <p className="text-[7px] text-zinc-600 mt-0.5">{post.reply_count} replies</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      {userCanPost && (
        <div className="border-t border-zinc-800 p-1.5 shrink-0 space-y-1">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-1.5 py-1 bg-zinc-900/50 border border-zinc-700 text-[7px] text-zinc-300 focus:outline-none focus:border-[#ea580c]"
          >
            <option value="FREEFORM">Freeform</option>
            <option value="OPS_UPDATE">Ops Update</option>
            <option value="INTEL_SIGHTING">Intel Sighting</option>
            <option value="LOGISTICS_NOTE">Logistics</option>
            <option value="RESCUE_NOTE">Rescue</option>
          </select>
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
              placeholder="Type message..."
              className="flex-1 px-2 py-1 bg-zinc-900/50 border border-zinc-700 text-[8px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#ea580c]"
            />
            <button
              onClick={() => newPostContent.trim() && createPostMutation.mutate(newPostContent)}
              disabled={!newPostContent.trim() || createPostMutation.isPending}
              className="px-2 py-1 bg-zinc-800/50 border border-zinc-700 hover:border-[#ea580c] text-[8px] text-zinc-400 hover:text-[#ea580c] disabled:opacity-50 transition-colors"
            >
              <Send className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}