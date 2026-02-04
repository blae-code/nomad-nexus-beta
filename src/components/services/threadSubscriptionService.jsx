import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'nexus.threadSubscriptions';

const readLocal = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeLocal = (data) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export async function getThreadSubscription(threadId, userId) {
  if (!threadId || !userId) return null;
  try {
    const entries = await base44.entities.ThreadSubscription.filter({
      user_id: userId,
      thread_message_id: threadId,
    });
    if (entries?.[0]) return entries[0];
  } catch {
    // ignore
  }

  try {
    const entries = await base44.entities.ThreadSubscription.filter({
      member_profile_id: userId,
      thread_message_id: threadId,
    });
    if (entries?.[0]) return entries[0];
  } catch {
    // ignore
  }

  const local = readLocal();
  return local?.[`${userId}:${threadId}`] || null;
}

export async function setThreadSubscription(threadId, userId, isFollowing = true) {
  if (!threadId || !userId) return null;
  try {
    const existing = await getThreadSubscription(threadId, userId);
    if (existing?.id) {
      return await base44.entities.ThreadSubscription.update(existing.id, {
        is_following: !!isFollowing,
      });
    }

    return await base44.entities.ThreadSubscription.create({
      user_id: userId,
      thread_message_id: threadId,
      is_following: !!isFollowing,
    });
  } catch {
    const local = readLocal();
    local[`${userId}:${threadId}`] = {
      is_following: !!isFollowing,
      thread_message_id: threadId,
      user_id: userId,
    };
    writeLocal(local);
    return local[`${userId}:${threadId}`];
  }
}
