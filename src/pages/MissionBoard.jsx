import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invokeMemberFunction } from '@/api/memberFunctions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/providers/AuthProvider';
import { BadgeCheck, BadgeDollarSign, ScrollText, ShieldCheck, Target } from 'lucide-react';

const DEFAULT_FORM = {
  title: '',
  type: 'mission_support',
  reward: '',
  location: '',
  description: '',
  tags: '',
  requiredRoles: '',
};

const COMMAND_RANKS = new Set(['COMMANDER', 'PIONEER', 'FOUNDER']);

function toRoleToken(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

function extractRequiredRoles(tags) {
  if (!Array.isArray(tags)) return [];
  const roles = new Set();
  for (const tag of tags) {
    const text = String(tag || '').trim();
    const lower = text.toLowerCase();
    if (lower.startsWith('role:')) {
      const role = toRoleToken(text.slice(5));
      if (role) roles.add(role);
      continue;
    }
    if (lower.startsWith('roles:')) {
      text
        .slice(6)
        .split(/[|,]/)
        .map((entry) => toRoleToken(entry))
        .filter(Boolean)
        .forEach((entry) => roles.add(entry));
    }
  }
  return Array.from(roles);
}

function hasRewardPaid(post) {
  if (String(post?.reward_status || '').toUpperCase() === 'PAID') return true;
  if (!Array.isArray(post?.tags)) return false;
  return post.tags.some((tag) => String(tag || '').toLowerCase() === 'reward:paid');
}

export default function MissionBoard() {
  const { user } = useAuth();
  const member = user?.member_profile_data || user;
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [actionLoadingByPost, setActionLoadingByPost] = useState({});
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  const memberRoleSet = useMemo(() => {
    const resolved = new Set();
    const rank = toRoleToken(member?.rank);
    if (rank) resolved.add(rank);
    const roles = Array.isArray(member?.roles)
      ? member.roles
      : member?.roles
      ? [member.roles]
      : [];
    roles
      .map((role) => toRoleToken(role))
      .filter(Boolean)
      .forEach((role) => resolved.add(role));
    return resolved;
  }, [member?.rank, member?.roles]);

  const memberLabelMap = useMemo(() => {
    const map = {};
    for (const profile of members) {
      map[profile.id] =
        profile.display_callsign || profile.callsign || profile.full_name || profile.email || profile.id;
    }
    if (member?.id) {
      map[member.id] =
        map[member.id] || member.display_callsign || member.callsign || member.full_name || member.email || member.id;
    }
    return map;
  }, [members, member?.id, member?.display_callsign, member?.callsign, member?.full_name, member?.email]);

  const isCommandStaff = useMemo(() => {
    const rank = toRoleToken(member?.rank);
    return COMMAND_RANKS.has(rank);
  }, [member?.rank]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.MissionBoardPost.list('-created_date', 200);
      setPosts(list || []);
      setSchemaMissing(false);
    } catch (error) {
      console.error('Failed to load mission board:', error);
      setSchemaMissing(true);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    try {
      const list = await base44.entities.MemberProfile.list('-created_date', 500);
      setMembers(list || []);
    } catch (error) {
      console.error('Failed to load mission board members:', error);
    }
  };

  useEffect(() => {
    loadPosts();
    loadMembers();
  }, []);

  const createPost = async () => {
    if (!form.title.trim()) return;
    try {
      setPublishing(true);
      const customTags = form.tags
        ? form.tags
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean)
        : [];
      const roleTags = form.requiredRoles
        ? form.requiredRoles
            .split(',')
            .map((role) => toRoleToken(role))
            .filter(Boolean)
            .map((role) => `role:${role.toLowerCase()}`)
        : [];
      const mergedTags = Array.from(new Set([...customTags, ...roleTags]));

      await base44.entities.MissionBoardPost.create({
        title: form.title.trim(),
        type: form.type,
        reward: form.reward,
        location: form.location,
        description: form.description,
        tags: mergedTags,
        status: 'open',
        posted_by_member_profile_id: member?.id || null,
      });
      setForm(DEFAULT_FORM);
      setStatusBanner({ type: 'success', message: 'Contract posted to the board.' });
      await loadPosts();
    } catch (error) {
      console.error('Failed to create contract post:', error);
      setStatusBanner({
        type: 'error',
        message: error?.message || 'Failed to publish contract post.',
      });
    } finally {
      setPublishing(false);
    }
  };

  const runAction = async (postId, action) => {
    if (!postId || !action) return;
    try {
      setActionLoadingByPost((prev) => ({ ...prev, [postId]: action }));
      const response = await invokeMemberFunction('updateMissionBoardPostStatus', { postId, action });
      const payload = response?.data || response;

      if (payload?.success) {
        const actionLabel = action.replace('_', ' ');
        setStatusBanner({
          type: 'success',
          message: `Mission update applied: ${actionLabel}.`,
        });
      } else {
        setStatusBanner({
          type: 'error',
          message: payload?.error || 'Mission update failed.',
        });
      }
      await loadPosts();
    } catch (error) {
      console.error('Failed to update contract status:', error);
      setStatusBanner({
        type: 'error',
        message: error?.data?.error || error?.message || 'Contract update failed.',
      });
    } finally {
      setActionLoadingByPost((prev) => ({ ...prev, [postId]: null }));
    }
  };

  if (schemaMissing) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded p-6 text-zinc-400">
          MissionBoardPost entity missing. Add the schema in Base44 to enable the contracts board.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-wider text-white">Contract Exchange</h1>
        <p className="text-zinc-400 text-sm">Asynchronous player contracts: support, bounties, hauling, and orders</p>
        {statusBanner && (
          <div
            role={statusBanner.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 inline-flex items-center gap-2 rounded border px-3 py-1 text-xs ${
              statusBanner.type === 'error'
                ? 'border-red-500/40 text-red-300 bg-red-500/10'
                : 'border-green-500/40 text-green-300 bg-green-500/10'
            }`}
          >
            {statusBanner.message}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
              <ScrollText className="w-3 h-3" />
              Post Contract
            </div>
            <Input
              aria-label="Contract title"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Contract title"
            />
            <select
              aria-label="Contract type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white px-2 py-1 rounded"
            >
              <option value="mission_support">Mission Support</option>
              <option value="bounty">Bounty</option>
              <option value="hauling">Hauling Consignment</option>
              <option value="crafting_order">Crafting Order</option>
              <option value="purchase_order">Purchase Order</option>
              <option value="escort">Escort</option>
              <option value="recon">Recon</option>
            </select>
            <Input
              aria-label="Contract reward"
              value={form.reward}
              onChange={(e) => setForm((prev) => ({ ...prev, reward: e.target.value }))}
              placeholder="Reward (aUEC / item)"
            />
            <Input
              aria-label="Contract location"
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Location"
            />
            <Textarea
              aria-label="Contract description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Contract brief / scope"
              className="min-h-[80px]"
            />
            <Input
              aria-label="Required roles"
              value={form.requiredRoles}
              onChange={(e) => setForm((prev) => ({ ...prev, requiredRoles: e.target.value }))}
              placeholder="Required roles (comma-separated)"
            />
            <Input
              aria-label="Contract tags"
              value={form.tags}
              onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="Additional tags (comma-separated)"
            />
            <Button onClick={createPost} disabled={!form.title.trim() || publishing}>
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>

        <div className="col-span-2 space-y-3">
          {loading ? (
            <div className="text-zinc-500">Loading contracts...</div>
          ) : posts.length === 0 ? (
            <div className="text-zinc-500">No contracts posted yet.</div>
          ) : (
            posts.map((post) => {
              const requiredRoles = extractRequiredRoles(post.tags);
              const matchedRoles = requiredRoles.filter((role) => memberRoleSet.has(role));
              const roleMatch = requiredRoles.length === 0 || matchedRoles.length > 0 || isCommandStaff;
              const rewardPaid = hasRewardPaid(post);
              const postStatus = String(post.status || 'open').toLowerCase();
              const actionLoading = actionLoadingByPost[post.id];
              const isPoster = member?.id && post.posted_by_member_profile_id === member.id;
              const isClaimer = member?.id && post.claimed_by_member_profile_id === member.id;
              const canReopen = postStatus !== 'open' && (isPoster || isCommandStaff);
              const canComplete = postStatus === 'claimed' && (isClaimer || isCommandStaff);
              const canMarkPaid = postStatus === 'completed' && !rewardPaid && (isPoster || isCommandStaff);
              const canClaim = postStatus === 'open' && roleMatch;
              const claimedByLabel = post.claimed_by_member_profile_id
                ? memberLabelMap[post.claimed_by_member_profile_id] || post.claimed_by_member_profile_id
                : null;
              const postedByLabel = post.posted_by_member_profile_id
                ? memberLabelMap[post.posted_by_member_profile_id] || post.posted_by_member_profile_id
                : null;

              return (
                <div key={post.id} className="bg-zinc-900/60 border border-zinc-800 rounded p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-400" />
                        {post.title}
                      </div>
                      <div className="text-[10px] text-zinc-500 uppercase">{post.type} • {post.status}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.reward && (
                        <div className="text-xs text-green-400 flex items-center gap-1">
                          <BadgeDollarSign className="w-3 h-3" />
                          {post.reward}
                        </div>
                      )}
                      {rewardPaid && (
                        <div className="text-[10px] uppercase text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" />
                          Paid
                        </div>
                      )}
                    </div>
                  </div>
                  {postedByLabel && <div className="text-[10px] text-zinc-500">Posted by: {postedByLabel}</div>}
                  {claimedByLabel && <div className="text-[10px] text-zinc-500">Claimed by: {claimedByLabel}</div>}
                  {post.location && <div className="text-xs text-zinc-400">Location: {post.location}</div>}
                  {post.description && <div className="text-xs text-zinc-300">{post.description}</div>}

                  {requiredRoles.length > 0 && (
                    <div
                      className={`text-[10px] rounded border px-2 py-1 flex items-center gap-1 ${
                        roleMatch
                          ? 'text-green-300 border-green-500/30 bg-green-500/10'
                          : 'text-orange-300 border-orange-500/30 bg-orange-500/10'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      Required roles: {requiredRoles.join(', ')} | Your match:{' '}
                      {matchedRoles.length > 0 ? matchedRoles.join(', ') : roleMatch ? 'Command override' : 'None'}
                    </div>
                  )}

                  {Array.isArray(post.tags) && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, idx) => (
                        <span
                          key={`${tag}-${idx}`}
                          className="text-[10px] text-cyan-300 border border-cyan-500/30 px-2 py-1 rounded uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {postStatus === 'open' && (
                      <Button
                        size="sm"
                        onClick={() => runAction(post.id, 'claim')}
                        disabled={!canClaim || Boolean(actionLoading)}
                      >
                        {actionLoading === 'claim' ? 'Claiming...' : 'Accept'}
                      </Button>
                    )}
                    {postStatus === 'claimed' && canComplete && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction(post.id, 'complete')}
                        disabled={Boolean(actionLoading)}
                      >
                        {actionLoading === 'complete' ? 'Updating...' : 'Mark Fulfilled'}
                      </Button>
                    )}
                    {canMarkPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction(post.id, 'mark_paid')}
                        disabled={Boolean(actionLoading)}
                      >
                        {actionLoading === 'mark_paid' ? 'Settling...' : 'Mark Contract Paid'}
                      </Button>
                    )}
                    {canReopen && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => runAction(post.id, 'reopen')}
                        disabled={Boolean(actionLoading)}
                      >
                        {actionLoading === 'reopen' ? 'Reopening...' : 'Reopen'}
                      </Button>
                    )}
                  </div>

                  {postStatus === 'open' && !canClaim && (
                    <div className="text-[10px] text-orange-300">Role requirements are not met for this contract.</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
