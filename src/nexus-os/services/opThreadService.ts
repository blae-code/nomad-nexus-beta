/**
 * Operation Thread Service (MVP in-memory adapter)
 *
 * Artifact-scoped asynchronous discussion surface for ops.
 */

import type { ArtifactRef, OpComment } from '../schemas/opSchemas';

type OpThreadListener = (comments: OpComment[]) => void;

let commentsStore: OpComment[] = [];
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

function notifyListeners() {
  const snapshot = sortComments(commentsStore);
  for (const listener of listeners) listener(snapshot);
}

export function addComment(
  input: Omit<OpComment, 'id' | 'at'> & { id?: string; at?: string },
  nowMs = Date.now()
): OpComment {
  const record: OpComment = {
    id: input.id || createCommentId(nowMs),
    opId: input.opId,
    by: input.by,
    at: input.at || nowIso(nowMs),
    body: input.body.trim(),
    linkedArtifactRefs: input.linkedArtifactRefs || [],
  };
  commentsStore = sortComments([record, ...commentsStore]);
  notifyListeners();
  return record;
}

export function listComments(opId: string): OpComment[] {
  return sortComments(commentsStore).filter((entry) => entry.opId === opId);
}

export function getOpCommentById(commentId: string): OpComment | null {
  return commentsStore.find((entry) => entry.id === commentId) || null;
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
  notifyListeners();
}
