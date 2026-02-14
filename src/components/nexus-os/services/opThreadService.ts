/**
 * Operation Thread Service (MVP in-memory adapter)
 *
 * Artifact-scoped asynchronous discussion surface for ops.
 */

import type { ArtifactRef, OpComment } from '../schemas/opSchemas';

type OpThreadListener = (comments: OpComment[]) => void;

export interface OpThreadSummary {
  root: OpComment;
  replies: OpComment[];
  replyCount: number;
  unreadReplies: number;
  lastActivityAt: string;
  participants: string[];
}

export interface OpThreadNotification {
  opId: string;
  rootCommentId: string;
  unreadReplies: number;
  lastActivityAt: string;
}

let commentsStore: OpComment[] = [];
let readCursorStore: Record<string, string> = {};
const listeners = new Set<OpThreadListener>();

function nowIso(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function createCommentId(nowMs = Date.now()): string {
  return `op_comment_${nowMs}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortComments(records: OpComment[]): OpComment[] {
  return [...records].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function sortByTimeAsc(records: OpComment[]): OpComment[] {
  return [...records].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

function commentMs(comment: Pick<OpComment, 'at'>): number {
  return new Date(comment.at).getTime();
}

function readCursorKey(opId: string, viewerId: string, rootCommentId: string): string {
  return `${opId}:${viewerId}:${rootCommentId}`;
}

function resolveRootId(comment: OpComment, byId: Map<string, OpComment>): string {
  let cursor: OpComment | undefined = comment;
  const guard = new Set<string>();
  while (cursor?.parentCommentId) {
    if (guard.has(cursor.id)) break;
    guard.add(cursor.id);
    const parent = byId.get(cursor.parentCommentId);
    if (!parent) break;
    cursor = parent;
  }
  return cursor?.id || comment.id;
}

function notifyListeners() {
  const snapshot = sortComments(commentsStore);
  for (const listener of listeners) listener(snapshot);
}

export function addComment(
  input: Omit<OpComment, 'id' | 'at'> & { id?: string; at?: string },
  nowMs = Date.now()
): OpComment {
  if (input.parentCommentId) {
    const parent = getOpCommentById(input.parentCommentId);
    if (!parent) throw new Error(`Parent comment ${input.parentCommentId} not found`);
    if (parent.opId !== input.opId) {
      throw new Error('Reply parent comment must belong to the same operation');
    }
  }

  const record: OpComment = {
    id: input.id || createCommentId(nowMs),
    opId: input.opId,
    by: input.by,
    at: input.at || nowIso(nowMs),
    body: input.body.trim(),
    parentCommentId: input.parentCommentId,
    linkedArtifactRefs: input.linkedArtifactRefs || [],
  };
  commentsStore = sortComments([record, ...commentsStore]);
  notifyListeners();
  return record;
}

export function listComments(opId: string): OpComment[] {
  return sortComments(commentsStore).filter((entry) => entry.opId === opId);
}

export function listCommentReplies(opId: string, parentCommentId: string): OpComment[] {
  return sortComments(commentsStore).filter(
    (entry) => entry.opId === opId && entry.parentCommentId === parentCommentId
  );
}

export function getOpCommentById(commentId: string): OpComment | null {
  return commentsStore.find((entry) => entry.id === commentId) || null;
}

export function listThreadSummaries(opId: string, viewerId?: string): OpThreadSummary[] {
  const opComments = listComments(opId);
  if (opComments.length === 0) return [];

  const byId = new Map(opComments.map((entry) => [entry.id, entry]));
  const roots = opComments.filter((entry) => !entry.parentCommentId);
  const repliesByRoot = new Map<string, OpComment[]>();

  for (const comment of opComments) {
    if (!comment.parentCommentId) continue;
    const rootId = resolveRootId(comment, byId);
    const bucket = repliesByRoot.get(rootId) || [];
    bucket.push(comment);
    repliesByRoot.set(rootId, bucket);
  }

  const summaries = roots.map((root) => {
    const replies = sortByTimeAsc(repliesByRoot.get(root.id) || []);
    const lastActivityAt = replies.length ? replies[replies.length - 1].at : root.at;
    const participants = [...new Set([root.by, ...replies.map((entry) => entry.by)])];
    const readAt = viewerId ? readCursorStore[readCursorKey(opId, viewerId, root.id)] || null : null;
    const unreadReplies = viewerId
      ? replies.filter((entry) => entry.by !== viewerId && (!readAt || commentMs(entry) > new Date(readAt).getTime())).length
      : 0;
    return {
      root,
      replies,
      replyCount: replies.length,
      unreadReplies,
      lastActivityAt,
      participants,
    };
  });

  return summaries.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

export function markThreadRead(
  opId: string,
  viewerId: string,
  rootCommentId: string,
  nowMs = Date.now()
): void {
  if (!opId || !viewerId || !rootCommentId) return;
  const summaries = listThreadSummaries(opId);
  const summary = summaries.find((entry) => entry.root.id === rootCommentId);
  const latestAt = summary?.lastActivityAt || nowIso(nowMs);
  const key = readCursorKey(opId, viewerId, rootCommentId);
  const existing = readCursorStore[key];
  if (!existing || new Date(existing).getTime() < new Date(latestAt).getTime()) {
    readCursorStore = { ...readCursorStore, [key]: latestAt };
    notifyListeners();
  }
}

export function listUnreadThreadNotifications(opId: string, viewerId: string): OpThreadNotification[] {
  return listThreadSummaries(opId, viewerId)
    .filter((entry) => entry.unreadReplies > 0)
    .map((entry) => ({
      opId,
      rootCommentId: entry.root.id,
      unreadReplies: entry.unreadReplies,
      lastActivityAt: entry.lastActivityAt,
    }));
}

export function linkCommentArtifacts(commentId: string, refs: ArtifactRef[], nowMs = Date.now()): OpComment {
  const comment = getOpCommentById(commentId);
  if (!comment) throw new Error(`Comment ${commentId} not found`);
  const next: OpComment = {
    ...comment,
    linkedArtifactRefs: [...(comment.linkedArtifactRefs || []), ...refs],
    at: nowIso(nowMs),
  };
  commentsStore = commentsStore.map((entry) => (entry.id === commentId ? next : entry));
  notifyListeners();
  return next;
}

export function subscribeOpThread(listener: OpThreadListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetOpThreadServiceState() {
  commentsStore = [];
  readCursorStore = {};
  notifyListeners();
}
