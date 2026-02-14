import React, { useMemo, useState } from 'react';
import type { IntelRenderable } from '../../services/intelService';
import type { IntelComment, IntentDraftKind } from '../../schemas/intelSchemas';
import { NexusBadge, NexusButton, RustPulseIndicator } from '../primitives';
import {
  availabilityCopy,
  availabilityLabel,
  availabilityTone,
  resolveAvailabilityState,
} from '../state';

interface IntelDetailPanelProps {
  intel: IntelRenderable | null;
  comments: IntelComment[];
  onAddComment: (intelId: string, body: string) => Promise<void>;
  onCreateIntelDraft: (kind: IntentDraftKind, intelId: string) => void;
}

function stratumTone(stratum: IntelRenderable['stratum']): 'neutral' | 'active' | 'warning' | 'danger' {
  if (stratum === 'COMMAND_ASSESSED') return 'danger';
  if (stratum === 'OPERATIONAL') return 'warning';
  if (stratum === 'SHARED_COMMONS') return 'active';
  return 'neutral';
}

function confidenceTone(confidence: IntelRenderable['confidence']): 'ok' | 'warning' | 'danger' {
  if (confidence === 'HIGH') return 'ok';
  if (confidence === 'MED') return 'warning';
  return 'danger';
}

function formatAge(value: string): string {
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (ageSeconds < 60) return `${ageSeconds}s`;
  const mins = Math.floor(ageSeconds / 60);
  const secs = ageSeconds % 60;
  return `${mins}m ${secs}s`;
}

export default function IntelDetailPanel({
  intel,
  comments,
  onAddComment,
  onCreateIntelDraft,
}: IntelDetailPanelProps) {
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [commentPage, setCommentPage] = useState(0);
  const [promotionPage, setPromotionPage] = useState(0);

  const sortedComments = useMemo(
    () => [...comments].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [comments]
  );
  const commentsPerPage = 4;
  const commentPageCount = Math.max(1, Math.ceil(sortedComments.length / commentsPerPage));
  const visibleComments = useMemo(
    () => sortedComments.slice(commentPage * commentsPerPage, commentPage * commentsPerPage + commentsPerPage),
    [sortedComments, commentPage]
  );
  const promotionPerPage = 4;
  const promotionPageCount = Math.max(1, Math.ceil((intel?.promotionHistory.length || 0) / promotionPerPage));
  const visiblePromotionHistory = useMemo(
    () =>
      (intel?.promotionHistory || []).slice(
        promotionPage * promotionPerPage,
        promotionPage * promotionPerPage + promotionPerPage
      ),
    [intel?.promotionHistory, promotionPage]
  );

  React.useEffect(() => {
    setCommentPage((current) => Math.min(current, commentPageCount - 1));
  }, [commentPageCount]);

  React.useEffect(() => {
    setPromotionPage((current) => Math.min(current, promotionPageCount - 1));
  }, [promotionPageCount]);

  if (!intel) {
    return (
      <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 text-xs text-zinc-500">
        Select an intel glyph to inspect provenance, thread, and governance actions.
      </section>
    );
  }

  const submitComment = async () => {
    const body = commentText.trim();
    if (!body) return;
    setIsPosting(true);
    try {
      await onAddComment(intel.id, body);
      setCommentText('');
    } finally {
      setIsPosting(false);
    }
  };

  const intelAvailability = resolveAvailabilityState({
    count: 1,
    staleCount: intel.ttl.stale ? 1 : 0,
    hasConflict: intel.challenges.length > intel.endorsements.length,
  });

  return (
    <section className="rounded border border-zinc-800 bg-zinc-900/45 p-2.5 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-100">{intel.title}</h4>
          <p className="text-[11px] text-zinc-400 mt-1">{intel.body}</p>
          <p className="text-[11px] text-zinc-500 mt-1">{availabilityCopy(intelAvailability)}</p>
        </div>
        <RustPulseIndicator active={!intel.ttl.stale && intel.ttl.remainingSeconds <= 45} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <NexusBadge tone={availabilityTone(intelAvailability)}>{availabilityLabel(intelAvailability)}</NexusBadge>
        <NexusBadge tone={stratumTone(intel.stratum)}>{intel.stratum}</NexusBadge>
        <NexusBadge tone={confidenceTone(intel.confidence)}>{intel.confidence}</NexusBadge>
        <NexusBadge tone={intel.ttl.stale ? 'neutral' : 'warning'}>
          {intel.ttl.stale ? 'STALE' : `${intel.ttl.remainingSeconds}s`}
        </NexusBadge>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1 text-[11px] text-zinc-500 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span>Author</span>
          <span className="text-zinc-300">{intel.createdBy}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Scope</span>
          <span className="text-zinc-300">{intel.scope.kind}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Updated</span>
          <span className="text-zinc-300">{formatAge(intel.updatedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Anchor</span>
          <span className="text-zinc-300">{intel.anchor.nodeId}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NexusButton size="sm" intent="subtle" onClick={() => onCreateIntelDraft('ENDORSE_INTEL', intel.id)}>
          Endorse
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onCreateIntelDraft('CHALLENGE_INTEL', intel.id)}>
          Challenge
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onCreateIntelDraft('PROMOTE_INTEL', intel.id)}>
          Promote
        </NexusButton>
        <NexusButton size="sm" intent="subtle" onClick={() => onCreateIntelDraft('LINK_INTEL_TO_OP', intel.id)}>
          Link Op
        </NexusButton>
        <NexusButton size="sm" intent="danger" className="col-span-2" onClick={() => onCreateIntelDraft('RETIRE_INTEL', intel.id)}>
          Retire
        </NexusButton>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center justify-between gap-2">
          <span>Discussion</span>
          {commentPageCount > 1 ? (
            <div className="flex items-center gap-1">
              <NexusButton size="sm" intent="subtle" onClick={() => setCommentPage((current) => Math.max(0, current - 1))} disabled={commentPage === 0}>
                Prev
              </NexusButton>
              <NexusBadge tone="neutral">{commentPage + 1}/{commentPageCount}</NexusBadge>
              <NexusButton size="sm" intent="subtle" onClick={() => setCommentPage((current) => Math.min(commentPageCount - 1, current + 1))} disabled={commentPage >= commentPageCount - 1}>
                Next
              </NexusButton>
            </div>
          ) : null}
        </div>
        <div className="max-h-24 overflow-hidden pr-1 space-y-1">
          {sortedComments.length === 0 ? (
            <div className="text-[11px] text-zinc-500">No comments yet.</div>
          ) : (
            visibleComments.map((comment) => (
              <div key={comment.id} className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-300">{comment.by}</span>
                  <span className="text-zinc-500">{formatAge(comment.at)}</span>
                </div>
                <p className="mt-0.5 text-zinc-400">{comment.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            className="flex-1 h-8 rounded border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200"
            placeholder="Add scoped intel comment..."
          />
          <NexusButton size="sm" intent="primary" onClick={submitComment} disabled={isPosting}>
            {isPosting ? 'Posting' : 'Send'}
          </NexusButton>
        </div>
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-950/55 px-2 py-1.5 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center justify-between gap-2">
          <span>Promotion Audit</span>
          {promotionPageCount > 1 ? (
            <div className="flex items-center gap-1">
              <NexusButton size="sm" intent="subtle" onClick={() => setPromotionPage((current) => Math.max(0, current - 1))} disabled={promotionPage === 0}>
                Prev
              </NexusButton>
              <NexusBadge tone="neutral">{promotionPage + 1}/{promotionPageCount}</NexusBadge>
              <NexusButton size="sm" intent="subtle" onClick={() => setPromotionPage((current) => Math.min(promotionPageCount - 1, current + 1))} disabled={promotionPage >= promotionPageCount - 1}>
                Next
              </NexusButton>
            </div>
          ) : null}
        </div>
        <div className="max-h-20 overflow-hidden pr-1 space-y-1">
          {intel.promotionHistory.length === 0 ? (
            <div className="text-[11px] text-zinc-500">No promotion actions recorded.</div>
          ) : (
            visiblePromotionHistory.map((entry, index) => (
              <div key={`${entry.at}:${index}`} className="text-[11px] text-zinc-400 rounded border border-zinc-800 bg-zinc-900/45 px-2 py-1">
                {entry.by}: {entry.from} {'->'} {entry.to} ({formatAge(entry.at)})
                {entry.reason ? <span className="text-zinc-500"> - {entry.reason}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
