import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { BadgeDollarSign, ScrollText, Target } from 'lucide-react';

const DEFAULT_FORM = {
  title: '',
  type: 'escort',
  reward: '',
  location: '',
  description: '',
  tags: '',
};

export default function MissionBoard() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.MissionBoardPost.list('-created_date', 200);
      setPosts(list || []);
    } catch (error) {
      console.error('Failed to load mission board:', error);
      setSchemaMissing(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const createPost = async () => {
    if (!form.title.trim()) return;
    try {
      await base44.entities.MissionBoardPost.create({
        title: form.title.trim(),
        type: form.type,
        reward: form.reward,
        location: form.location,
        description: form.description,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        status: 'open',
        posted_by_member_profile_id: member?.id || null,
      });
      setForm(DEFAULT_FORM);
      loadPosts();
    } catch (error) {
      console.error('Failed to create mission post:', error);
    }
  };

  const updateStatus = async (postId, status) => {
    try {
      await base44.entities.MissionBoardPost.update(postId, {
        status,
        claimed_by_member_profile_id: status === 'claimed' ? member?.id || null : null,
      });
      loadPosts();
    } catch (error) {
      console.error('Failed to update mission post:', error);
    }
  };

  if (schemaMissing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 text-zinc-400">
          MissionBoardPost entity missing. Add the schema in Base44 to enable the mission board.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Mission Board</h1>
        <p className="text-zinc-400 text-sm">In-universe contracts and bounties</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <ScrollText className="w-3 h-3" />
              Post Mission
            </div>
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Mission title"
            />
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="escort">Escort</option>
              <option value="haul">Haul</option>
              <option value="combat">Combat</option>
              <option value="recon">Recon</option>
              <option value="salvage">Salvage</option>
            </select>
            <Input
              value={form.reward}
              onChange={(e) => setForm((prev) => ({ ...prev, reward: e.target.value }))}
              placeholder="Reward (aUEC / item)"
            />
            <Input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Location"
            />
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Briefing / narrative"
              className="min-h-[80px]"
            />
            <Input
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Tags (comma-separated)"
            />
            <Button onClick={createPost} disabled={!form.title.trim()}>
              Publish
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500">Loading missions...</div>
          ) : posts.length === 0 ? (
            <div className="text-zinc-500">No missions posted yet.</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-400" />
                      {post.title}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase">{post.type} • {post.status}</div>
                  </div>
                  {post.reward && (
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <BadgeDollarSign className="w-3 h-3" />
                      {post.reward}
                    </div>
                  )}
                </div>
                {post.location && <div className="text-xs text-zinc-400">Location: {post.location}</div>}
                {post.description && <div className="text-xs text-zinc-300">{post.description}</div>}
                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="text-[10px] text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded uppercase">{tag}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  {post.status === 'open' && (
                    <Button size="sm" onClick={() => updateStatus(post.id, 'claimed')}>Accept</Button>
                  )}
                  {post.status === 'claimed' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(post.id, 'completed')}>Mark Complete</Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
